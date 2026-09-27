import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/stats — KPIs du tableau de bord (rôle admin requis).
 * CA, commandes, produits, stock bas, avis en attente, messages,
 * abonnés newsletter, dernières commandes, top produits, ventes 14 jours.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const [
      revenueAggregate,
      ordersCount,
      productsCount,
      activeProductsCount,
      lowStock,
      pendingReviews,
      pendingMessages,
      subscribersCount,
      recentOrders,
      topProducts,
      ordersLast14,
    ] = await Promise.all([
      db.order.aggregate({
        where: { paymentStatus: "paid" },
        _sum: { total: true },
      }),
      db.order.count(),
      db.product.count(),
      db.product.count({ where: { isActive: true } }),
      db.product.count({ where: { stock: { lte: 5 } } }),
      db.review.count({ where: { isApproved: false } }),
      db.contactMessage.count(),
      db.newsletterSubscriber.count(),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { items: true },
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: { soldCount: "desc" },
        take: 5,
        select: { id: true, name: true, image: true, soldCount: true, price: true, stock: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
        select: { total: true, createdAt: true, status: true },
      }),
    ])

    // Séries quotidiennes des 14 derniers jours (CA + nb commandes).
    const daily: { date: string; revenue: number; orders: number }[] = []
    for (let i = 13; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = day.toISOString().slice(0, 10)
      daily.push({ date: key, revenue: 0, orders: 0 })
    }
    const dailyMap = new Map(daily.map((d) => [d.date, d]))
    for (const order of ordersLast14) {
      const key = order.createdAt.toISOString().slice(0, 10)
      const bucket = dailyMap.get(key)
      if (bucket && order.status !== "cancelled") {
        bucket.revenue = Math.round((bucket.revenue + order.total) * 100) / 100
        bucket.orders += 1
      }
    }

    return NextResponse.json({
      revenue: revenueAggregate._sum.total ?? 0,
      ordersCount,
      productsCount,
      activeProductsCount,
      lowStock,
      pendingReviews,
      pendingMessages,
      subscribersCount,
      recentOrders,
      topProducts,
      daily,
    })
  } catch (error) {
    console.error("GET /api/admin/stats error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

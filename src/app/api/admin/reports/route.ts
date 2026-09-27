import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import { round2 } from "@/lib/order-pricing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED_DAYS = [7, 30, 90] as const

/**
 * GET /api/admin/reports?days=30 — rapport analytique sur une période.
 *
 * Contenu : CA, commandes, panier moyen, nouveaux clients, ventes par
 * catégorie, top produits, répartition statuts / livraisons / paiements,
 * codes promo consommés, santé du stock. Les commandes annulées sont
 * exclues des montants mais comptabilisées à part dans les statuts.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const daysParam = Number(request.nextUrl.searchParams.get("days") ?? 30)
    const days = (ALLOWED_DAYS as readonly number[]).includes(daysParam)
      ? daysParam
      : 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [periodOrders, allProducts, categories, newCustomers, pendingReviews, ratingAgg, activeProducts] =
      await Promise.all([
        db.order.findMany({
          where: { createdAt: { gte: since } },
          select: {
            status: true,
            shippingMethod: true,
            paymentMethod: true,
            promoCode: true,
            total: true,
            createdAt: true,
            items: { select: { productId: true, quantity: true, unitPrice: true } },
          },
        }),
        db.product.findMany({
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            stock: true,
            categoryId: true,
            isActive: true,
          },
        }),
        db.category.findMany({ select: { id: true, name: true } }),
        db.user.count({ where: { createdAt: { gte: since }, role: "customer" } }),
        db.review.count({ where: { isApproved: false } }),
        db.review.aggregate({
          where: { isApproved: true },
          _avg: { rating: true },
        }),
        db.product.count({ where: { isActive: true } }),
      ])

    const validOrders = periodOrders.filter((o) => o.status !== "cancelled")

    const revenue = round2(
      validOrders.reduce((sum, o) => sum + o.total, 0)
    )
    const ordersCount = validOrders.length
    const avgOrder = ordersCount > 0 ? round2(revenue / ordersCount) : 0

    // Répartition par statut (toutes commandes de la période).
    const statusBreakdown: Record<string, number> = {}
    for (const order of periodOrders) {
      statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1
    }

    // Livraisons & paiements (hors annulées).
    const shippingBreakdown: Record<string, number> = {}
    const paymentBreakdown: Record<string, number> = {}
    for (const order of validOrders) {
      shippingBreakdown[order.shippingMethod] =
        (shippingBreakdown[order.shippingMethod] ?? 0) + 1
      paymentBreakdown[order.paymentMethod] =
        (paymentBreakdown[order.paymentMethod] ?? 0) + 1
    }

    // Ventes par catégorie + top produits (depuis les lignes de commande).
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
    const productById = new Map(allProducts.map((p) => [p.id, p]))
    const revenueByProduct = new Map<string, { qty: number; revenue: number }>()
    const revenueByCategory = new Map<string, number>()

    for (const order of validOrders) {
      for (const item of order.items) {
        const product = productById.get(item.productId)
        const itemRevenue = item.unitPrice * item.quantity
        const entry = revenueByProduct.get(item.productId) ?? {
          qty: 0,
          revenue: 0,
        }
        entry.qty += item.quantity
        entry.revenue = round2(entry.revenue + itemRevenue)
        revenueByProduct.set(item.productId, entry)

        const categoryName = product
          ? (categoryNameById.get(product.categoryId) ?? "Autre")
          : "Autre"
        revenueByCategory.set(
          categoryName,
          round2((revenueByCategory.get(categoryName) ?? 0) + itemRevenue)
        )
      }
    }

    const salesByCategory = [...revenueByCategory.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    const topProducts = [...revenueByProduct.entries()]
      .map(([productId, data]) => {
        const product = productById.get(productId)
        return {
          id: productId,
          name: product?.name ?? "Produit supprimé",
          image: product?.image ?? "",
          stock: product?.stock ?? 0,
          quantity: data.qty,
          revenue: data.revenue,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Codes promo consommés dans la période (comptage des commandes).
    const promoUsage: Record<string, number> = {}
    for (const order of validOrders) {
      if (order.promoCode) {
        promoUsage[order.promoCode] = (promoUsage[order.promoCode] ?? 0) + 1
      }
    }

    // Santé du stock.
    const lowStockThresholdParam = Number(
      request.nextUrl.searchParams.get("lowStockThreshold") ?? 5
    )
    const threshold = Number.isFinite(lowStockThresholdParam)
      ? lowStockThresholdParam
      : 5
    const lowStockProducts = allProducts
      .filter((p) => p.stock <= threshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        stock: p.stock,
        isActive: p.isActive,
      }))
    const inventoryValue = round2(
      activeProducts
        ? allProducts.reduce((sum, p) => (p.isActive ? sum + p.stock * p.price : sum), 0)
        : 0
    )
    const outOfStock = allProducts.filter((p) => p.stock === 0).length

    return NextResponse.json({
      days,
      revenue,
      ordersCount,
      avgOrder,
      newCustomers,
      statusBreakdown,
      shippingBreakdown,
      paymentBreakdown,
      salesByCategory,
      topProducts,
      promoUsage,
      inventoryValue,
      outOfStock,
      lowStockProducts,
      pendingReviews,
      avgRating: Math.round((ratingAgg._avg.rating ?? 0) * 10) / 10,
    })
  } catch (error) {
    console.error("GET /api/admin/reports error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

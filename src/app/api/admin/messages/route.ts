import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/messages — boîte de réception de l'admin :
 * messages de contact, abonnés newsletter, alertes de réassort.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const [messages, subscribers, stockAlerts] = await Promise.all([
      db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      db.newsletterSubscriber.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.stockAlert.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { product: { select: { name: true, image: true, stock: true } } },
      }),
    ])

    return NextResponse.json({ messages, subscribers, stockAlerts })
  } catch (error) {
    console.error("GET /api/admin/messages error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
})

/**
 * GET /api/admin/orders — liste des commandes (100 dernières) avec lignes.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true },
    })
    return NextResponse.json(orders)
  } catch (error) {
    console.error("GET /api/admin/orders error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/orders — changement de statut d'une commande.
 * Body : { id, status: pending|paid|shipped|delivered|cancelled }
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Statut invalide." },
        { status: 400 }
      )
    }

    const { id, status } = parsed.data
    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Commande non trouvée" },
        { status: 404 }
      )
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        status,
        // Cohérence paiement : une commande marquée "paid" l'est aussi côté paiement.
        paymentStatus:
          status === "paid" ? "paid" : status === "cancelled" && existing.paymentStatus === "unpaid"
            ? "unpaid"
            : existing.paymentStatus,
      },
      include: { items: true },
    })

    // Annulation : on restitue le stock des articles (si pas déjà annulée).
    if (status === "cancelled" && existing.status !== "cancelled") {
      await db.$transaction(
        updated.items.map((item) =>
          db.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              soldCount: { decrement: item.quantity },
            },
          })
        )
      )
    }

    return NextResponse.json({ ok: true, order: updated })
  } catch (error) {
    console.error("PATCH /api/admin/orders error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

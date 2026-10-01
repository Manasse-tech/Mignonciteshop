import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import { sendEmail } from "@/lib/mailer"
import { logAudit } from "@/lib/audit"
import { refundTransaction } from "@/lib/payments"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
})

/**
 * GET /api/admin/orders — liste paginée des commandes avec lignes.
 * Query : ?page=1&limit=50 (limit 10..100) + total pour la pagination UI.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(10, Number(request.nextUrl.searchParams.get("limit")) || 50))
    const [orders, total] = await Promise.all([
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true },
      }),
      db.order.count(),
    ])
    return NextResponse.json({ orders, total, page, limit })
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
    const existing = await db.order.findUnique({ where: { id }, include: { items: true } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Commande non trouvée" },
        { status: 404 }
      )
    }
    if (existing.status === status) {
      return NextResponse.json({ ok: true, order: existing })
    }

    // Annulation d'une commande payée : remboursement AVANT la mise à jour.
    let refunded = false
    if (
      status === "cancelled" &&
      existing.status !== "cancelled" &&
      existing.paymentStatus === "paid" &&
      existing.transactionId
    ) {
      refunded = await refundTransaction(existing.transactionId, existing.reference)
    }

    const updated = await db.order.update({
      where: { id },
      data: {
        status,
        // Cohérence paiement : payée si marquée "paid" ; remboursee si
        // annulée alors qu'elle était payée ; jamais payée en pending.
        paymentStatus:
          status === "paid" ? "paid"
          : status === "cancelled" && existing.paymentStatus === "paid" && refunded
            ? "refunded"
          : status === "cancelled" && existing.paymentStatus === "unpaid"
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

    // Traçabilité + e-mail au client (fire-and-forget, jamais bloquant).
    if (refunded) {
      await logAudit({
        actor: admin.email,
        action: "order.refund",
        target: existing.reference,
        details: { total: existing.total, transactionId: existing.transactionId },
      })
    }
    await logAudit({
      actor: admin.email,
      action: "order.status",
      target: existing.reference,
      details: { from: existing.status, to: status },
    })
    const STATUS_LABELS: Record<string, string> = {
      pending: "En attente de traitement",
      paid: "Paiement confirmé",
      shipped: "Expédiée — en cours de livraison",
      delivered: "Livrée",
      cancelled: "Annulée",
    }
    await sendEmail({
      to: existing.email,
      subject: `Commande ${existing.reference} — statut mis à jour : ${STATUS_LABELS[status] ?? status}`,
      template: "order_status",
      lines: [
        `Bonjour ${existing.customerName},`,
        ``,
        `Le statut de votre commande ${existing.reference} vient d'être mis à jour :`,
        `  ${STATUS_LABELS[status] ?? status}`,
        status === "shipped"
          ? `\nVotre colis est en route vers : ${existing.addressLine1}, ${existing.postalCode} ${existing.city}.`
          : ``,
        status === "cancelled"
          ? existing.paymentStatus === "refunded"
            ? `\nVotre paiement (${new Intl.NumberFormat("fr-FR").format(Math.round(existing.total))} FCFA) a été remboursé — il apparaîtra sur votre compte sous quelques jours.`
            : `\nAucun montant ne vous sera débité.`
          : ``,
      ].filter((line) => line !== ""),
      data: { reference: existing.reference, status, refunded },
    })

    return NextResponse.json({ ok: true, order: updated })
  } catch (error) {
    console.error("PATCH /api/admin/orders error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

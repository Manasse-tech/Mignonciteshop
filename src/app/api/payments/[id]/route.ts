import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserFromRequest } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/payments/[id] — statut d'une transaction de paiement.
 *
 * Accès : propriétaire de la commande (session, e-mail de rattachement)
 * ou administrateur. L'id peut être l'identifiant technique ou la
 * référence MC-PAY-XXXXXX.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Connectez-vous pour consulter un paiement." },
        { status: 401 }
      )
    }

    const { id } = await params
    const transaction = await db.paymentTransaction.findFirst({
      where: { OR: [{ id }, { reference: id }] },
      include: { order: { select: { email: true } } },
    })
    if (!transaction) {
      return NextResponse.json(
        { ok: false, error: "Transaction non trouvée." },
        { status: 404 }
      )
    }

    const isOwner =
      transaction.order?.email.toLowerCase() === user.email.toLowerCase()
    const isAdmin = user.role === "admin"
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Accès non autorisé." },
        { status: 403 }
      )
    }

    return NextResponse.json({
      ok: true,
      transaction: {
        id: transaction.id,
        reference: transaction.reference,
        orderId: transaction.orderId,
        provider: transaction.provider,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        providerTxId: transaction.providerTxId,
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    })
  } catch (error) {
    console.error("GET /api/payments/[id] error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

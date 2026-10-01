import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { logAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const webhookSchema = z.object({
  reference: z.string().min(1, "Référence de transaction requise"),
  status: z.enum(
    ["pending", "processing", "success", "failed", "cancelled", "expired"],
    { message: "Statut de paiement inconnu." }
  ),
  providerTxId: z.string().max(200).optional(),
  failureReason: z.string().max(500).optional(),
})

/**
 * POST /api/payments/webhook — finalisation d'une transaction par le
 * prestataire de paiement réel.
 *
 * SÉCURITÉ : signature obligatoire via l'en-tête `x-webhook-secret`
 * comparée à process.env.PAYMENT_WEBHOOK_SECRET. Si la variable
 * d'environnement est absente → 503 (jamais accepter un webhook sans
 * secret configuré).
 *
 * Effets :
 *  - success  → transaction success + commande paymentStatus="paid",
 *               status="paid" (équivalent « confirmée » du modèle métier) ;
 *  - échec/annulation → journalisé sur la transaction, commande inchangée.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET
    if (!secret) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Webhook paiement non configuré (PAYMENT_WEBHOOK_SECRET absent).",
        },
        { status: 503 }
      )
    }

    const provided =
      request.headers.get("x-webhook-secret") ??
      request.headers.get("X-Webhook-Secret") ??
      ""
    if (provided !== secret) {
      return NextResponse.json(
        { ok: false, error: "Signature webhook invalide." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = webhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Payload webhook invalide.",
        },
        { status: 400 }
      )
    }

    const { reference, status, providerTxId, failureReason } = parsed.data
    const transaction = await db.paymentTransaction.findUnique({
      where: { reference },
      include: { order: true },
    })
    if (!transaction) {
      return NextResponse.json(
        { ok: false, error: "Transaction non trouvée." },
        { status: 404 }
      )
    }

    // Idempotence : une transaction déjà finalisée n'est plus modifiée.
    const FINAL_STATES = ["success", "failed", "cancelled", "expired"]
    if (FINAL_STATES.includes(transaction.status)) {
      return NextResponse.json({
        ok: true,
        transactionId: transaction.id,
        status: transaction.status,
        idempotent: true,
      })
    }

    const updated = await db.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        providerTxId: providerTxId ?? transaction.providerTxId,
        failureReason: failureReason ?? null,
      },
    })

    if (status === "success") {
      if (transaction.orderId) {
        await db.order.update({
          where: { id: transaction.orderId },
          data: { paymentStatus: "paid", status: "paid" },
        })
      }
      await logAudit({
        actor: `webhook:${transaction.provider}`,
        action: "payment.webhook",
        target: transaction.reference,
        details: {
          status,
          orderId: transaction.orderId,
          providerTxId: providerTxId ?? null,
          amount: transaction.amount,
        },
      })
    } else {
      // Échec / annulation / expiration : journalisé (audit + transaction).
      await logAudit({
        actor: `webhook:${transaction.provider}`,
        action: "payment.webhook",
        target: transaction.reference,
        details: {
          status,
          failureReason: failureReason ?? null,
          orderId: transaction.orderId,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      transactionId: updated.id,
      status: updated.status,
    })
  } catch (error) {
    console.error("POST /api/payments/webhook error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

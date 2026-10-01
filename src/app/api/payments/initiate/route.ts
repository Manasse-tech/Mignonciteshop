import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { getSessionUserFromRequest } from "@/lib/auth-server"
import { getStoreSettings } from "@/lib/settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PROVIDERS = [
  "mobile_money_wave",
  "mobile_money_orange",
  "mobile_money_mtn",
  "mobile_money_moov",
] as const

const initiateSchema = z.object({
  orderId: z.string().min(1, "Commande requise"),
  provider: z.enum(PROVIDERS, {
    message: "Prestataire de paiement inconnu.",
  }),
  phoneNumber: z.string().trim().max(30).optional(),
})

/** Référence de transaction MC-PAY-XXXXXX (6 caractères lisibles). */
function generatePaymentReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let suffix = ""
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `MC-PAY-${suffix}`
}

/**
 * POST /api/payments/initiate — démarre une transaction de paiement
 * mobile money pour une commande existante.
 *
 * HONNÊTETÉ : aucune simulation. Si paymentMobileMoneyEnabled est false
 * dans les réglages boutique → 503 « non configuré ». La transaction est
 * créée en « pending » et reste en attente du webhook du prestataire réel
 * (POST /api/payments/webhook, signature x-webhook-secret).
 */
export async function POST(request: NextRequest) {
  try {
    // Session obligatoire (la commande invité passe par le flux classique).
    const user = await getSessionUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Connectez-vous pour initier un paiement." },
        { status: 401 }
      )
    }

    // Réglages boutique : la fonctionnalité doit être explicitement activée.
    const settings = await getStoreSettings()
    if (!settings.paymentMobileMoneyEnabled) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Paiement mobile money non configuré. Contactez la boutique.",
        },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = initiateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Requête invalide.",
        },
        { status: 400 }
      )
    }

    const { orderId, provider, phoneNumber } = parsed.data
    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Commande non trouvée." },
        { status: 404 }
      )
    }

    // La commande doit appartenir à l'utilisateur connecté
    // (rattachement par e-mail — les commandes invitées n'ont pas de userId).
    if (order.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { ok: false, error: "Cette commande ne vous appartient pas." },
        { status: 403 }
      )
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { ok: false, error: "Cette commande est déjà payée." },
        { status: 409 }
      )
    }

    // Référence unique (boucle de sécurité contre une collision improbable).
    let reference = generatePaymentReference()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await db.paymentTransaction.findUnique({ where: { reference } })
      if (!exists) break
      reference = generatePaymentReference()
    }

    const transaction = await db.paymentTransaction.create({
      data: {
        reference,
        orderId: order.id,
        provider,
        amount: order.total,
        currency: "XOF",
        status: "pending",
        phoneNumber: phoneNumber ?? order.phone ?? null,
        metadata: JSON.stringify({
          orderReference: order.reference,
          initiatedBy: user.email,
        }),
      },
    })

    return NextResponse.json({
      ok: true,
      transactionId: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      instructions:
        settings.paymentInstructions ||
        `Réglez ${Math.round(order.total)} F CFA via ${provider.replace("mobile_money_", "Mobile Money ")} au numéro ${settings.paymentMobileMoneyNumber || "de la boutique"} en indiquant la référence commande ${order.reference}.`,
    })
  } catch (error) {
    console.error("POST /api/payments/initiate error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import {
  evaluatePromo,
  computeShipping,
  generateOrderReference,
  isShippingMethod,
  round2,
} from "@/lib/order-pricing"
import { getStoreSettings } from "@/lib/settings"
import { sendEmail } from "@/lib/mailer"
import { chargeCard } from "@/lib/payments"
import { awardPointsForOrder } from "@/lib/loyalty"
import { getSessionUserFromRequest } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const orderSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_RE, "Adresse email invalide")
    .max(160),
  customerName: z.string().trim().min(2, "Nom requis").max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1, "Quantité invalide").max(99),
        size: z.string().max(20).nullable().optional(),
        color: z.string().max(40).nullable().optional(),
      })
    )
    .min(1, "Votre panier est vide")
    .max(50),
  shippingMethod: z.string().refine(isShippingMethod, "Mode de livraison invalide"),
  promoCode: z.string().max(50).nullable().optional(),
  paymentMethod: z
    .enum(["card", "paypal", "transfer", "mobile_money"])
    .default("card"),
  // Données carte : validées puis JAMAIS persistées en clair (PCI —
  // seuls les 4 derniers chiffres et l'identifiant de transaction sont
  // conservés sur la commande).
  card: z
    .object({
      number: z.string().regex(/^\d{16}$/, "Le numéro de carte doit contenir 16 chiffres."),
      holder: z.string().trim().min(2, "Veuillez saisir le nom du titulaire.").max(120),
    })
    .optional()
    .nullable(),
  notes: z.string().max(500).nullable().optional(),
  address: z.object({
    line1: z.string().trim().min(1, "Adresse requise").max(160),
    line2: z.string().trim().max(160).nullable().optional(),
    postalCode: z.string().trim().min(1, "Code postal requis").max(20),
    city: z.string().trim().min(1, "Ville requise").max(80),
    country: z.string().trim().min(1, "Pays requis").max(80),
  }),
})

/**
 * POST /api/orders — création de commande (cœur métier).
 *
 * PRINCIPE D'OR : le serveur est la seule source de vérité.
 *  1. Validation Zod du payload (le client n'envoie JAMAIS de prix)
 *  2. Transaction atomique :
 *     - rechargement des produits depuis la base (prix réels)
 *     - vérification isActive + stock suffisant
 *     - recalcul subtotal / remise promo (revalidée en base) / livraison / total
 *     - création Order + OrderItems (snapshot nom/image pour figer l'historique)
 *     - décrément du stock, incrément soldCount et usageCount du code promo
 *  3. Paiement via la couche payments (passerelle démo, prête Stripe) :
 *     - carte refusée → 402, AUCUNE commande créée
 *     - carte acceptée → paymentStatus paid + transactionId persisté
 *     - paypal/transfer → commande en attente de paiement (unpaid)
 *  4. E-mail de confirmation + événement analytics « purchase ».
 *
 * Erreurs métier : 409 (stock insuffisant / produit indisponible / promo),
 * 402 (paiement refusé) — rollback intégral de la transaction.
 */

function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " F CFA"
}
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`order:${ip}`, 6, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Trop de requêtes. Réessayez dans un instant." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Commande invalide.",
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    const promoCode = data.promoCode?.trim().toUpperCase() || null

    // Fusion des lignes dupliquées (même produit + variante) pour éviter
    // les doubles décomptes de stock.
    const merged = new Map<
      string,
      { quantity: number; size: string | null; color: string | null }
    >()
    for (const item of data.items) {
      const key = `${item.productId}|${item.size ?? ""}|${item.color ?? ""}`
      const current = merged.get(key)
      if (current) {
        current.quantity += item.quantity
      } else {
        merged.set(key, {
          quantity: item.quantity,
          size: item.size ?? null,
          color: item.color ?? null,
        })
      }
    }

    // Recharge les produits concernés depuis la base (prix réels).
    const ids = [...new Set([...merged.keys()].map((key) => key.split("|")[0]))]
    const products = await db.product.findMany({
      where: { id: { in: ids }, isActive: true },
    })

    if (products.length !== ids.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Un article de votre panier n'est plus disponible. Actualisez la page.",
        },
        { status: 409 }
      )
    }

    // Vérification du stock AVANT transaction (message précis par article).
    const productMap = new Map(products.map((p) => [p.id, p]))
    for (const [key, item] of merged) {
      const product = productMap.get(key.split("|")[0])!
      if (product.stock < item.quantity) {
        return NextResponse.json(
          {
            ok: false,
            error:
              product.stock === 0
                ? `« ${product.name} » est en rupture de stock.`
                : `Stock insuffisant pour « ${product.name} » (il ne reste que ${product.stock}).`,
          },
          { status: 409 }
        )
      }
    }

    // Sous-total calculé depuis les prix en base.
    const subtotal = round2(
      [...merged.entries()].reduce((sum, [key, item]) => {
        const product = productMap.get(key.split("|")[0])!
        return sum + product.price * item.quantity
      }, 0)
    )

    // Revalidation du code promo côté serveur.
    let discount = 0
    let freeShipping = false
    let appliedPromoId: string | null = null
    if (promoCode) {
      const promo = await db.promoCode.findUnique({ where: { code: promoCode } })
      const promoResult = evaluatePromo(promo, subtotal)
      if (!promoResult.ok || !promoResult.promo) {
        return NextResponse.json(
          { ok: false, error: promoResult.error ?? "Code promo refusé." },
          { status: 409 }
        )
      }
      discount = promoResult.discount
      freeShipping = promoResult.freeShipping
      appliedPromoId = promoResult.promo.id
    }

    // Livraison + total (montant réellement débité — réglages boutique en base).
    const settings = await getStoreSettings()
    const shippingMethod = data.shippingMethod as "standard" | "express" | "pickup"
    const shippingCost = computeShipping(shippingMethod, subtotal, freeShipping, settings)
    const total = round2(subtotal - discount + shippingCost)

    // Référence unique (collision quasi impossible, boucle de sécurité).
    let reference = generateOrderReference()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await db.order.findUnique({ where: { reference } })
      if (!exists) break
      reference = generateOrderReference()
    }

    const paid = data.paymentMethod === "card"

    // Autorisation du paiement AVANT création de la commande (comme un
    // vrai PSP) : si la banque refuse, rien n'est commandé ni décrémenté.
    let transactionId: string | null = null
    let cardLast4: string | null = null
    if (paid) {
      const charge = await chargeCard({
        amount: total,
        currency: "eur",
        cardNumber: data.card?.number ?? "",
        cardHolder: data.card?.holder ?? "",
        orderReference: reference,
      })
      if (!charge.ok) {
        return NextResponse.json(
          { ok: false, error: charge.error ?? "Paiement refusé." },
          { status: 402 }
        )
      }
      transactionId = charge.transactionId
      cardLast4 = data.card?.number.slice(-4) ?? null
    }

    // TRANSACTION atomique : commande + lignes + stock + compteur promo.
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          reference,
          status: paid ? "paid" : "pending",
          email: data.email,
          customerName: data.customerName,
          phone: data.phone ?? null,
          addressLine1: data.address.line1,
          addressLine2: data.address.line2 ?? null,
          postalCode: data.address.postalCode,
          city: data.address.city,
          country: data.address.country,
          shippingMethod,
          shippingCost,
          subtotal,
          discount,
          total,
          promoCode,
          paymentMethod: data.paymentMethod,
          paymentStatus: paid ? "paid" : "unpaid",
          transactionId,
          cardLast4,
          notes: data.notes ?? null,
          items: {
            create: [...merged.entries()].map(([key, item]) => {
              const productId = key.split("|")[0]
              const product = productMap.get(productId)!
              return {
                productId,
                productName: product.name,
                image: product.image,
                unitPrice: product.price,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
              }
            }),
          },
        },
        include: { items: true },
      })

      // Décrément du stock + incrément des ventes, article par article.
      for (const [key, item] of merged) {
        const productId = key.split("|")[0]
        await tx.product.update({
          where: { id: productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        })
      }

      // Consommation du code promo.
      if (appliedPromoId) {
        await tx.promoCode.update({
          where: { id: appliedPromoId },
          data: { usageCount: { increment: 1 } },
        })
      }

      return created
    })

    // Post-traitement (fire-and-forget, ne peut pas faire échouer la
    // commande) : e-mail de confirmation + événement analytics.
    await Promise.all([
      sendEmail({
        to: order.email,
        subject: `Confirmation de commande ${order.reference} — MignonciteShop`,
        template: "order_confirmation",
        lines: [
          `Bonjour ${order.customerName},`,
          ``,
          `Merci pour votre commande ! Voici son récapitulatif :`,
          ``,
          `  Référence : ${order.reference}`,
          `  Articles : ${order.items.map((it) => `${it.quantity}× ${it.productName}`).join(", ")}`,
          `  Sous-total : ${formatEuro(order.subtotal)}`,
          order.discount > 0
            ? `  Remise (${order.promoCode ?? ""}) : -${formatEuro(order.discount)}`
            : ``,
          `  Livraison : ${formatEuro(order.shippingCost)}`,
          `  TOTAL : ${formatEuro(order.total)}`,
          ``,
          `Suivez votre commande à tout moment depuis la page « Suivi de commande »`,
          `de la boutique avec votre référence.`,
        ].filter((line) => line !== null),
        data: {
          reference: order.reference,
          total: order.total,
          paymentStatus: order.paymentStatus,
          transactionId,
        },
      }),
      db.analyticsEvent.create({
        data: {
          event: "purchase",
          page: "checkout",
          value: order.total,
          meta: JSON.stringify({
            reference: order.reference,
            items: order.items.length,
            promoCode,
          }),
        },
      }).catch(() => undefined),
    ])

    console.log(
      `[ORDER] ${order.reference} — ${order.customerName} — total ${order.total.toFixed(0)} FCFA`
    )

    // FIDÉLITÉ — crédit des points pour un utilisateur CONNECTÉ dont
    // l'e-mail de commande correspond au compte (idempotent côté loyalty).
    // Fire-and-forget : une erreur de fidélité ne fait jamais échouer
    // la commande déjà enregistrée.
    const sessionUser = await getSessionUserFromRequest(request).catch(() => null)
    if (
      sessionUser &&
      sessionUser.email.toLowerCase() === order.email.toLowerCase()
    ) {
      awardPointsForOrder({
        userId: sessionUser.id,
        orderId: order.id,
        orderReference: order.reference,
        amountSpent: order.total,
      }).catch(() => undefined)
    }

    return NextResponse.json({
      ok: true,
      reference: order.reference,
      subtotal,
      discount,
      shippingCost,
      total,
    })
  } catch (error) {
    console.error("POST /api/orders error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/orders → 405 (la consultation passe par /api/admin/orders) */
export async function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 })
}

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
  paymentMethod: z.enum(["card", "paypal", "transfer"]).default("card"),
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
 *  3. Paiement "card" simulé → paymentStatus paid (webhook Stripe plus tard)
 *
 * Erreurs métier : 409 (stock insuffisant / produit indisponible),
 * 409 promo (code refusé) — rollback intégral de la transaction.
 */
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

    // Livraison + total (montant réellement débité).
    const shippingMethod = data.shippingMethod as "standard" | "express" | "pickup"
    const shippingCost = computeShipping(shippingMethod, subtotal, freeShipping)
    const total = round2(subtotal - discount + shippingCost)

    // Référence unique (collision quasi impossible, boucle de sécurité).
    let reference = generateOrderReference()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await db.order.findUnique({ where: { reference } })
      if (!exists) break
      reference = generateOrderReference()
    }

    const paid = data.paymentMethod === "card"

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

    // TODO e-commerce avancé : email de confirmation (Resend/SMTP),
    // génération facture PDF, notification interne nouvelle commande.
    console.log(
      `[ORDER] ${order.reference} — ${order.customerName} — total ${order.total.toFixed(2)} €`
    )

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

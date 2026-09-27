import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const trackSchema = z.object({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MC-[A-Z2-9]{6}$/, "Format de référence attendu : MC-XXXXXX"),
  email: z.string().trim().toLowerCase().max(160),
})

/**
 * GET /api/orders/track?reference=MC-XXXXXX&email=...
 *
 * Suivi de commande PUBLIC mais protégé : il faut la référence EXACTE
 * ET l'e-mail du client (double facteur « connaissance »). Rate limité
 * pour empêcher l'énumération de références.
 */
export async function GET(request: NextRequest) {
  const ip = clientIp(request)
  const limit = checkRateLimit(`track:${ip}`, 20, 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Trop de recherches. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    )
  }

  try {
    const parsed = trackSchema.safeParse({
      reference: request.nextUrl.searchParams.get("reference") ?? "",
      email: request.nextUrl.searchParams.get("email") ?? "",
    })
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Référence ou e-mail invalide. Format attendu : MC-XXXXXX + l'e-mail utilisé lors de la commande.",
        },
        { status: 400 }
      )
    }

    const order = await db.order.findUnique({
      where: { reference: parsed.data.reference },
      include: { items: true },
    })

    // Même message si la commande n'existe pas OU si l'email ne correspond
    // pas : aucune énumération possible.
    if (!order || order.email.toLowerCase() !== parsed.data.email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aucune commande trouvée avec cette référence et cet e-mail.",
        },
        { status: 404 }
      )
    }

    // Vue publique volontairement minimale : statut, dates, articles
    // commandés, montants. JAMAIS d'adresse complète ni de données carte.
    return NextResponse.json({
      ok: true,
      order: {
        reference: order.reference,
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingMethod: order.shippingMethod,
        city: order.city,
        country: order.country,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        subtotal: order.subtotal,
        discount: order.discount,
        shippingCost: order.shippingCost,
        total: order.total,
        promoCode: order.promoCode,
        items: order.items.map((item) => ({
          productName: item.productName,
          image: item.image,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          size: item.size,
          color: item.color,
        })),
      },
    })
  } catch (error) {
    console.error("GET /api/orders/track error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

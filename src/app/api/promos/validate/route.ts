import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import { evaluatePromo, round2 } from "@/lib/order-pricing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().finite().min(0).max(10_000_000),
})

/**
 * POST /api/promos/validate
 * Body : { code, subtotal }
 *
 * Le serveur est la source de vérité : la remise est TOUJOURS calculée
 * ici (existence, actif, expiration, plafond, minimum d'achat).
 * Réponse 200 avec ok:false pour les codes refusés (erreur métier),
 * 400 uniquement pour une requête mal formée.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`promo:${ip}`, 20, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Trop de tentatives. Réessayez dans un instant." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = validateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Requête invalide." },
        { status: 400 }
      )
    }

    const code = parsed.data.code.trim().toUpperCase()
    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Veuillez saisir un code." },
        { status: 200 }
      )
    }

    const promo = await db.promoCode.findUnique({ where: { code } })
    const result = evaluatePromo(promo, parsed.data.subtotal)

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error })
    }

    return NextResponse.json({
      ok: true,
      promo: {
        code: result.promo!.code,
        label: result.promo!.label,
        type: result.promo!.type,
        value: result.promo!.value,
        minSubtotal: round2(result.promo!.minSubtotal),
      },
      discount: result.discount,
      freeShipping: result.freeShipping,
    })
  } catch (error) {
    console.error("POST /api/promos/validate error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/promos/validate → 405 */
export async function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 })
}

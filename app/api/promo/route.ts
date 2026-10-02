import { NextRequest, NextResponse } from 'next/server'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { PROMO_CHECK, firstIssue } from '@/lib/validators'
import { findPromoByCode, incrementPromoUsage } from '@/lib/backend'

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientKey(req, 'promo-check'), 20)) return tooManyRequests()

    const parsed = PROMO_CHECK.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ valid: false, error: firstIssue(parsed) }, { status: 400 })
    }
    const { code, subtotal } = parsed.data
    const normalized = String(code || '').trim().toUpperCase()

    const promo = await findPromoByCode(normalized)
    if (!promo || !promo.active) {
      return NextResponse.json({ valid: false, error: 'Code promo invalide ou expiré' }, { status: 404 })
    }

    let discount = 0
    if (promo.type === 'percent') discount = Math.round(subtotal * promo.value) / 100
    else if (promo.type === 'fixed') discount = Math.min(promo.value, subtotal)

    // Incrémente le compteur d'utilisation (sans bloquer la réponse)
    void incrementPromoUsage(promo.id).catch(() => {})

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discount,
      freeShipping: promo.type === 'shipping',
      label: promo.label,
      type: promo.type,
      value: promo.value,
    })
  } catch (error) {
    console.error('POST /api/promo error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

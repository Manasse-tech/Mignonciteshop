import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { listPromoCodes, createPromoCode, findPromoByCode } from '@/lib/backend'

// GET /api/promo-codes — liste tous les codes promo (admin)
export async function GET() {
  try {
    return NextResponse.json(await listPromoCodes())
  } catch (error) {
    console.error('GET /api/promo-codes error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/promo-codes — crée un code promo (ADMIN UNIQUEMENT, audit S2)
export async function POST(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const code = String(body.code || '').trim().toUpperCase()
    const type = ['percent', 'fixed', 'shipping'].includes(body.type) ? body.type : 'percent'
    const value = Number(body.value) || 0
    const label = String(body.label || '').trim()

    if (!code) {
      return NextResponse.json({ error: 'Le code est requis' }, { status: 400 })
    }
    if (!label) {
      return NextResponse.json({ error: 'La description est requise' }, { status: 400 })
    }
    if (type !== 'shipping' && value <= 0) {
      return NextResponse.json({ error: 'La valeur doit être supérieure à 0' }, { status: 400 })
    }
    if (type === 'percent' && value > 100) {
      return NextResponse.json({ error: 'Un pourcentage ne peut pas dépasser 100' }, { status: 400 })
    }

    const exists = await findPromoByCode(code)
    if (exists) {
      return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 409 })
    }
    const promo = await createPromoCode({ code, type, value, label })
    return NextResponse.json(promo, { status: 201 })
  } catch (error) {
    console.error('POST /api/promo-codes error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

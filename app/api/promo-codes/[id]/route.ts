import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { updatePromoCode, deletePromoCode } from '@/lib/backend'

// PATCH /api/promo-codes/[id] — modifie / active-désactive un code promo (ADMIN UNIQUEMENT)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase()
    if (body.label !== undefined) data.label = String(body.label).trim()
    if (body.value !== undefined) data.value = Number(body.value) || 0
    if (body.type !== undefined && ['percent', 'fixed', 'shipping'].includes(body.type)) data.type = body.type
    if (body.active !== undefined) data.active = Boolean(body.active)

    const promo = await updatePromoCode(id, data)
    if (!promo) return NextResponse.json({ error: 'Code promo introuvable' }, { status: 404 })
    return NextResponse.json(promo)
  } catch (error) {
    console.error('PATCH /api/promo-codes/[id] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/promo-codes/[id] — supprime un code promo (ADMIN UNIQUEMENT)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    await deletePromoCode(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/promo-codes/[id] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

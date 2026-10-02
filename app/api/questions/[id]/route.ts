import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { updateQuestion, deleteQuestion } from '@/lib/backend'

// PATCH /api/questions/[id] — répondre (statut answered) ou masquer/remettre en attente
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ADMIN UNIQUEMENT (réponse/modération, audit S2)
  const denied = await requireAdminLive(request)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await request.json()

    const data: { answer?: string; status?: string; answeredAt?: string | null } = {}
    if (typeof body.answer === 'string' && body.answer.trim()) {
      data.answer = body.answer.trim().slice(0, 800)
      data.status = 'answered'
      data.answeredAt = new Date().toISOString()
    }
    if (typeof body.status === 'string' && ['pending', 'answered', 'hidden'].includes(body.status)) {
      data.status = body.status
      if (body.status === 'pending') {
        data.answer = ''
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
    }

    const updated = await updateQuestion(id, data)
    if (!updated) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/questions/[id]', error)
    return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
  }
}

// DELETE /api/questions/[id] (ADMIN UNIQUEMENT)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminLive(request)
  if (denied) return denied
  try {
    const { id } = await params
    await deleteQuestion(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/questions/[id]', error)
    return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { updateReviewStatus, deleteReview } from '@/lib/backend'

const REVIEW_STATUS = ['pending', 'approved', 'rejected']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ADMIN UNIQUEMENT (modération, audit S2)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await req.json()
    if (!REVIEW_STATUS.includes(body?.status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    const review = await updateReviewStatus(id, body.status)
    if (!review) return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 })
    return NextResponse.json(review)
  } catch (error) {
    console.error('PATCH /api/reviews/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ADMIN UNIQUEMENT (modération, audit S2)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    await deleteReview(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/reviews/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}

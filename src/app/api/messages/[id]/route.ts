import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { updateContactMessage, deleteContactMessage } from '@/lib/backend'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await req.json()
    await updateContactMessage(id, !!body.isRead)
    return NextResponse.json({ success: true, isRead: !!body.isRead })
  } catch (error) {
    console.error('PATCH /api/messages/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    await deleteContactMessage(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/messages/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}

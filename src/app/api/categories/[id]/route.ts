import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { updateCategory, deleteCategory } from '@/lib/backend'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ADMIN UNIQUEMENT (audit S2)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.description !== undefined) data.description = body.description
    if (body.image !== undefined) data.image = body.image
    if (body.order !== undefined) data.order = parseInt(body.order)
    await updateCategory(id, data)
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    console.error('PUT /api/categories/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ADMIN UNIQUEMENT (audit S2)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    await deleteCategory(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}

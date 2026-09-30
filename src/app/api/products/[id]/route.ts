import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { getProductById, updateProduct, deleteProduct, listReviews } from '@/lib/backend'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    // Recherche par id interne OU par slug (fiche produit SPA : ?page=product&slug=…)
    const { getProductBySlug } = await import('@/lib/backend')
    const product = (await getProductById(id)) ?? (await getProductBySlug(id))
    if (!product) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    // Avis approuvés attachés (même contrat que l'ancien include Prisma)
    const reviews = await listReviews({ productId: product.id, status: 'approved' })
    return NextResponse.json({ ...product, reviews })
  } catch (error) {
    console.error('GET /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ADMIN UNIQUEMENT (audit S2)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    const allowed = ['name', 'description', 'details', 'image', 'gallery', 'sizes', 'colors']
    for (const key of allowed) if (body[key] !== undefined) data[key] = body[key]
    if (body.price !== undefined) data.price = parseFloat(body.price)
    if (body.oldPrice !== undefined) data.oldPrice = body.oldPrice ? parseFloat(body.oldPrice) : null
    if (body.stock !== undefined) data.stock = parseInt(body.stock)
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null
    if (body.isFeatured !== undefined) data.isFeatured = !!body.isFeatured
    if (body.isNew !== undefined) data.isNew = !!body.isNew
    if (body.isActive !== undefined) data.isActive = !!body.isActive

    const product = await updateProduct(id, data)
    if (!product) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    return NextResponse.json(product)
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ADMIN UNIQUEMENT (audit S2)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    await deleteProduct(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { listCategories, createCategory } from '@/lib/backend'

export async function GET() {
  try {
    const categories = await listCategories()
    return NextResponse.json(categories)
  } catch (error) {
    console.error('GET /api/categories error:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des catégories' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // ADMIN UNIQUEMENT (audit S2)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const body = await req.json()
    if (!body.name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
    const slug =
      body.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `cat-${Date.now().toString(36)}`
    const category = await createCategory({
      name: body.name,
      slug,
      description: body.description || null,
      image: body.image || null,
      order: body.order ? parseInt(body.order) : 0,
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('POST /api/categories error:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}

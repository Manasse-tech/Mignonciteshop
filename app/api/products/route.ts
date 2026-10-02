import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { listProducts, createProduct } from '@/lib/backend'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const products = await listProducts({
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      featured: searchParams.get('featured') === 'true',
      promo: searchParams.get('promo') === 'true',
      sort: searchParams.get('sort') || 'recent',
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null,
      includeInactive: searchParams.get('includeInactive') === 'true',
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des produits' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // ADMIN UNIQUEMENT (audit S2 : toutes les mutations catalogue sont protégées)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const { name, description, details, price, oldPrice, image, gallery, categoryId, stock, isFeatured, isNew, isActive, sizes, colors } = body

    if (!name || price === undefined || !image) {
      return NextResponse.json({ error: 'Nom, prix et image sont requis' }, { status: 400 })
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36)

    const product = await createProduct({
      name,
      slug,
      description: description ?? null,
      details: details ?? null,
      price: parseFloat(price),
      oldPrice: oldPrice ? parseFloat(oldPrice) : null,
      image,
      gallery: gallery || JSON.stringify([image]),
      categoryId: categoryId || null,
      stock: stock ? parseInt(stock) : 0,
      isFeatured: !!isFeatured,
      isNew: !!isNew,
      isActive: isActive !== false,
      sizes: sizes || '[]',
      colors: colors || '[]',
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du produit' }, { status: 500 })
  }
}

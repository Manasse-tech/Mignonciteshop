import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Tailles/couleurs envoyées en tableaux par l'admin, stockées en STRING JSON (SQLite).
const productCreateSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(120),
  categoryId: z.string().min(1, "Catégorie requise"),
  price: z.number().finite().min(0.01, "Prix invalide").max(100000),
  oldPrice: z.number().finite().min(0).max(100000).nullable().optional(),
  stock: z.number().int().min(0).max(100000),
  description: z.string().trim().max(3000).default(""),
  details: z.string().trim().max(3000).default(""),
  image: z.string().trim().min(1, "Image requise").max(500),
  gallery: z.array(z.string().max(500)).max(10).default([]),
  sizes: z.array(z.string().max(20)).max(20).default([]),
  colors: z.array(z.string().max(40)).max(20).default([]),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const productUpdateSchema = productCreateSchema.partial().extend({
  id: z.string().min(1),
})

/** Génère un slug unique à partir du nom (si absent du payload admin). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || `produit-${Date.now()}`
  let attempt = 0
  while (await db.product.findUnique({ where: { slug } })) {
    attempt += 1
    slug = `${slugify(base)}-${attempt}`
  }
  return slug
}

/**
 * GET /api/admin/products — catalogue complet (actifs ET inactifs).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error("GET /api/admin/products error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/products — création produit.
 * Body : { name, categoryId, price, oldPrice?, stock, description?, ... }
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = productCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Produit invalide.",
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    const category = await db.category.findUnique({
      where: { id: data.categoryId },
    })
    if (!category) {
      return NextResponse.json(
        { ok: false, error: "Catégorie non trouvée" },
        { status: 404 }
      )
    }

    const slug = await uniqueSlug(data.name)
    const product = await db.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? "",
        details: data.details ?? "",
        price: data.price,
        oldPrice: data.oldPrice ?? null,
        image: data.image,
        gallery: JSON.stringify(data.gallery ?? []),
        categoryId: data.categoryId,
        stock: data.stock,
        sizes: JSON.stringify(data.sizes ?? []),
        colors: JSON.stringify(data.colors ?? []),
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        isActive: data.isActive,
      },
      include: { category: true },
    })

    return NextResponse.json({ ok: true, product })
  } catch (error) {
    console.error("POST /api/admin/products error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/products — mise à jour (prix, stock, statuts, contenu…).
 * Body : { id, ...champs à modifier }
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = productUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Produit invalide.",
        },
        { status: 400 }
      )
    }

    const { id, ...fields } = parsed.data
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Produit non trouvé" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (fields.name !== undefined) updateData.name = fields.name
    if (fields.price !== undefined) updateData.price = fields.price
    if (fields.oldPrice !== undefined) updateData.oldPrice = fields.oldPrice
    if (fields.stock !== undefined) updateData.stock = fields.stock
    if (fields.description !== undefined) updateData.description = fields.description
    if (fields.details !== undefined) updateData.details = fields.details
    if (fields.image !== undefined) updateData.image = fields.image
    if (fields.categoryId !== undefined) updateData.categoryId = fields.categoryId
    if (fields.gallery !== undefined) updateData.gallery = JSON.stringify(fields.gallery)
    if (fields.sizes !== undefined) updateData.sizes = JSON.stringify(fields.sizes)
    if (fields.colors !== undefined) updateData.colors = JSON.stringify(fields.colors)
    if (fields.isFeatured !== undefined) updateData.isFeatured = fields.isFeatured
    if (fields.isNew !== undefined) updateData.isNew = fields.isNew
    if (fields.isActive !== undefined) updateData.isActive = fields.isActive

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    })

    return NextResponse.json({ ok: true, product })
  } catch (error) {
    console.error("PATCH /api/admin/products error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/products — suppression définitive
 * (les avis et alertes liés sont supprimés en cascade).
 * Body : { id }
 */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const id = (body as { id?: string } | null)?.id
    if (!id) {
      return NextResponse.json({ ok: false, error: "id requis" }, { status: 400 })
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Produit non trouvé" },
        { status: 404 }
      )
    }

    await db.product.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/admin/products error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

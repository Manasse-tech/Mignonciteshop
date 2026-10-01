import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import { logAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ---------------------------------------------------------------------------
 * CRUD catégories — réservé admin (session cookie + rôle admin).
 *
 * Mêmes conventions que /api/admin/products : zod en entrée, slug auto
 * (normalisation accents/français : « Électronique » → « electronique »),
 * unicité en base avec réponse 409 explicite, journal d'audit.
 *
 * NB : le modèle Category n'a pas de champ isActive (les catégories sans
 * produits actifs n'apparaissent plus en boutique via leur productCount) —
 * c'est pourquoi le payload n'accepte pas isActive.
 * ------------------------------------------------------------------------- */

const categoryCreateSchema = z.object({
  name: z.string().trim().min(2, "Nom requis (2 caractères minimum)").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug invalide (minuscules, chiffres et tirets uniquement)"
    )
    .optional(),
  description: z.string().trim().max(500).default(""),
  image: z.string().trim().max(500).default(""),
  order: z.number().int().min(0, "Ordre invalide (≥ 0)").max(9999).default(0),
})

const categoryUpdateSchema = z.object({
  id: z.string().min(1, "id requis"),
  name: z.string().trim().min(2, "Nom requis (2 caractères minimum)").max(80).optional(),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug invalide (minuscules, chiffres et tirets uniquement)"
    )
    .optional(),
  description: z.string().trim().max(500).optional(),
  image: z.string().trim().max(500).optional(),
  order: z.number().int().min(0, "Ordre invalide (≥ 0)").max(9999).optional(),
})

const categoryDeleteSchema = z.object({ id: z.string().min(1, "id requis") })

/** Normalisation française : accents retirés, minuscules, tirets. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/**
 * GET /api/admin/categories — toutes les catégories avec le nombre de
 * produits ACTIFS rattachés (même métrique que la route publique).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const categories = await db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    })

    return NextResponse.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        order: category.order,
        productCount: category._count.products,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
    })
  } catch (error) {
    console.error("GET /api/admin/categories error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/categories — création.
 * Body : { name, slug?, description?, image?, order? }
 * Le slug est dérivé du nom si absent ; 409 si le slug est déjà pris.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = categoryCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.error.issues[0]?.message ?? "Catégorie invalide.",
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    const slug = data.slug && data.slug.length > 0 ? data.slug : slugify(data.name)

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Impossible de générer un slug depuis ce nom." },
        { status: 400 }
      )
    }

    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: `Le slug « ${slug} » est déjà utilisé par la catégorie « ${existing.name} ».`,
        },
        { status: 409 }
      )
    }

    const category = await db.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        order: data.order,
      },
    })

    await logAudit({
      actor: admin.email,
      action: "category.create",
      target: category.name,
      details: { id: category.id, slug: category.slug, order: category.order },
    })

    return NextResponse.json({ ok: true, category })
  } catch (error) {
    console.error("POST /api/admin/categories error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/categories — mise à jour.
 * Body : { id, name?, slug?, description?, image?, order? }
 * Si le nom change sans slug fourni, le slug est régénéré (409 s'il est pris).
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = categoryUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.error.issues[0]?.message ?? "Catégorie invalide.",
        },
        { status: 400 }
      )
    }

    const { id, ...fields } = parsed.data
    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Catégorie non trouvée" },
        { status: 404 }
      )
    }

    // Slug final : fourni explicitement, sinon régénéré si le nom change,
    // sinon conservé.
    let slug = existing.slug
    if (fields.slug !== undefined && fields.slug.length > 0) {
      slug = fields.slug
    } else if (fields.name !== undefined && fields.name !== existing.name) {
      slug = slugify(fields.name)
    }

    if (slug !== existing.slug) {
      const clash = await db.category.findUnique({ where: { slug } })
      if (clash && clash.id !== id) {
        return NextResponse.json(
          {
            ok: false,
            error: `Le slug « ${slug} » est déjà utilisé par la catégorie « ${clash.name} ».`,
          },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = { slug }
    if (fields.name !== undefined) updateData.name = fields.name
    if (fields.description !== undefined) updateData.description = fields.description
    if (fields.image !== undefined) updateData.image = fields.image
    if (fields.order !== undefined) updateData.order = fields.order

    const category = await db.category.update({
      where: { id },
      data: updateData,
    })

    await logAudit({
      actor: admin.email,
      action: "category.update",
      target: category.name,
      details: {
        id,
        fields: Object.keys(fields),
        slugChanged: slug !== existing.slug,
      },
    })

    return NextResponse.json({ ok: true, category })
  } catch (error) {
    console.error("PATCH /api/admin/categories error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/categories — suppression.
 * Body : { id }
 * Refus (409) si des produits ACTIFS y sont rattachés : message clair.
 * Sinon suppression avec cascade Prisma (produits inactifs éventuels inclus).
 */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = categoryDeleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "id requis" },
        { status: 400 }
      )
    }

    const { id } = parsed.data
    const existing = await db.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Catégorie non trouvée" },
        { status: 404 }
      )
    }

    const activeCount = existing._count.products
    if (activeCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Impossible de supprimer « ${existing.name} » : ${activeCount} produit${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} y ${activeCount > 1 ? "sont" : "est"} rattaché${activeCount > 1 ? "s" : ""}. Déplace ou supprime d'abord les ${activeCount} produit${activeCount > 1 ? "s" : ""}.`,
          activeProducts: activeCount,
        },
        { status: 409 }
      )
    }

    await db.category.delete({ where: { id } })
    await logAudit({
      actor: admin.email,
      action: "category.delete",
      target: existing.name,
      details: { id, slug: existing.slug },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/admin/categories error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import { recalcProductRating } from "@/lib/review-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const patchSchema = z.object({
  id: z.string().min(1),
  isApproved: z.boolean(),
})

/**
 * GET /api/admin/reviews?status=pending|approved|all
 * Liste des avis avec le nom du produit, pour la modération.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const status = request.nextUrl.searchParams.get("status") ?? "all"
    const where =
      status === "pending"
        ? { isApproved: false }
        : status === "approved"
          ? { isApproved: true }
          : {}

    const reviews = await db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { product: { select: { name: true, image: true } } },
    })
    return NextResponse.json(reviews)
  } catch (error) {
    console.error("GET /api/admin/reviews error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/reviews — approuver / dé-publier un avis.
 * Body : { id, isApproved }
 * La note publique du produit est recalculée après chaque changement.
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Requête invalide." },
        { status: 400 }
      )
    }

    const { id, isApproved } = parsed.data
    const existing = await db.review.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Avis non trouvé" },
        { status: 404 }
      )
    }

    const review = await db.review.update({
      where: { id },
      data: { isApproved },
    })
    await recalcProductRating(review.productId)

    return NextResponse.json({ ok: true, review })
  } catch (error) {
    console.error("PATCH /api/admin/reviews error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/reviews — suppression d'un avis (spam, insultes…).
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

    const existing = await db.review.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Avis non trouvé" },
        { status: 404 }
      )
    }

    await db.review.delete({ where: { id } })
    await recalcProductRating(existing.productId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/admin/reviews error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

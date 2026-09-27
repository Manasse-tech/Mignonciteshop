import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import { recalcProductRating } from "@/lib/review-utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const reviewSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1, "Commentaire requis").max(2000),
  author: z.string().trim().min(1, "Auteur requis").max(100),
  title: z.string().trim().max(120).optional().nullable(),
})

/**
 * GET /api/reviews?productId=...
 * Renvoie les avis APPROUVÉS d'un produit (modération avant publication),
 * triés du plus récent au plus ancien — contrat : Review[] du frontend.
 */
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("productId")?.trim()
    if (!productId) {
      return NextResponse.json(
        { error: "productId requis" },
        { status: 400 }
      )
    }

    const reviews = await db.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        productId: true,
        author: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
      },
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error("GET /api/reviews error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/reviews
 * Body : { productId, rating, comment, author, title? }
 * Persiste l'avis avec isApproved=false (modération avant publication,
 * cf. modèle Review) — l'admin l'approuve depuis /?page=admin.
 * Anti-spam basique : 3 avis / minute / IP.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`review:${ip}`, 3, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Trop de tentatives. Réessayez dans un instant." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = reviewSchema.safeParse(body)

    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "Avis invalide."
      return NextResponse.json(
        { ok: false, error: firstError },
        { status: 400 }
      )
    }

    const { productId, rating, comment, author, title } = parsed.data

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })
    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Produit non trouvé" },
        { status: 404 }
      )
    }

    await db.review.create({
      data: { productId, rating, comment, author, title: title ?? null },
    })
    // Le rating/reviewCount du produit est recalculé à l'APPROBATION
    // (les avis en attente n'influencent pas la note publique).

    return NextResponse.json({ ok: true, pending: true })
  } catch (error) {
    console.error("POST /api/reviews error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

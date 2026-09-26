import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const reviewSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1, "Commentaire requis").max(2000),
  author: z.string().trim().min(1, "Auteur requis").max(100),
})

/**
 * POST /api/reviews
 * Body : { productId, rating, comment, author }
 *
 * TODO (backend à compléter) :
 *  - Ajouter un model Review au schéma Prisma :
 *      model Review {
 *        id        String   @id @default(cuid())
 *        productId String
 *        product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
 *        author    String
 *        rating    Int
 *        comment   String
 *        createdAt DateTime @default(now())
 *      }
 *    + relation `reviews Review[]` sur Product.
 *  - Persister l'avis, puis recalculer Product.rating et Product.reviewCount
 *    (moyenne + nombre d'avis) pour rester cohérent avec l'affichage produit.
 *  - Prévoir une protection anti spam (1 avis par user/ip/produit).
 *
 * Pour l'instant : validation + squelette sans persistance.
 */
export async function POST(request: NextRequest) {
  try {
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

    const { productId } = parsed.data

    // Vérifie que le produit existe (utile dès l'ajout de la persistance)
    const productExists = await db.product.count({ where: { id: productId } })
    if (productExists === 0) {
      return NextResponse.json(
        { ok: false, error: "Produit non trouvé" },
        { status: 404 }
      )
    }

    // TODO: persister l'avis dans la table Review et recalculer
    // Product.rating / Product.reviewCount, puis renvoyer l'avis créé.
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/reviews error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/reviews → 405 (méthode non autorisée) */
export async function GET() {
  return NextResponse.json(
    { error: "Méthode non autorisée" },
    { status: 405 }
  )
}

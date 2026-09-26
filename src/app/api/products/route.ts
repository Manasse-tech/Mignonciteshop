import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/products
 * Réponse : tableau JSON direct de produits actifs (avec category imbriquée),
 * triés par createdAt DESC — identique au site original.
 *
 * Query params optionnels :
 *  - ?id=xxx        → produit unique (objet, pas un tableau) ou 404
 *  - ?slug=xxx      → produit unique (objet, pas un tableau) ou 404
 *  - ?featured=true → uniquement les produits en vedette
 *  - ?new=true      → uniquement les nouveaux arrivages
 *  - ?category=slug → uniquement les produits d'une catégorie (par slug)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const slug = searchParams.get("slug")
    const featured = searchParams.get("featured")
    const isNew = searchParams.get("new")
    const category = searchParams.get("category")

    // Produit unique par id ou slug
    if (id || slug) {
      const product = await db.product.findFirst({
        where: {
          AND: [{ isActive: true }, id ? { id } : { slug: slug as string }],
        },
        include: { category: true },
      })

      if (!product) {
        return NextResponse.json(
          { error: "Produit non trouvé" },
          { status: 404 }
        )
      }

      return NextResponse.json(product)
    }

    // Filtres optionnels
    const where: {
      isActive: boolean
      isFeatured?: boolean
      isNew?: boolean
      category?: { slug: string }
    } = { isActive: true }
    if (featured === "true") where.isFeatured = true
    if (isNew === "true") where.isNew = true
    if (category) where.category = { slug: category }

    const products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("GET /api/products error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/categories
 * Réponse : tableau JSON direct de catégories triées par order ASC,
 * chacune avec productCount calculé (produits actifs uniquement)
 * — identique au site original.
 */
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true } },
          },
        },
      },
    })

    const result = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      order: category.order,
      productCount: category._count.products,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/categories error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

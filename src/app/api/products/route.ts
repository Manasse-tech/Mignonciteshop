import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { getProductsCache, setProductsCache } from "@/lib/products-cache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/products
 *
 * Mode 1 — produit unique (objet, pas un tableau) ou 404 :
 *   ?id=xxx   → produit par id
 *   ?slug=xxx → produit par slug
 *
 * Mode 2 — liste filtrée/triée (tableau) :
 *   ?featured=true   → uniquement les produits en vedette
 *   ?new=true        → uniquement les nouveaux arrivages
 *   ?category=slug   → par catégorie (slug)
 *   ?search=texte    → recherche insensible à la casse (nom/description)
 *   ?minPrice=10&maxPrice=50 → fourchette de prix
 *   ?sort=recent|price_asc|price_desc|popular|rating
 *   ?page=1&limit=12 → pagination serveur (renvoie { items, total, page, limit })
 *
 * Rétrocompatibilité : sans ?page, la réponse reste le TABLEAU complet
 * (contrat historique du frontend). Avec ?page, la réponse devient un
 * objet paginé { items, total, page, limit, pages }.
 *
 * Les listes passent par un cache mémoire de 30 s (invalidé à chaque
 * écriture admin) pour éviter une requête SQL par visiteur.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const slug = searchParams.get("slug")

    // Produit unique par id ou slug (jamais mis en cache — toujours frais).
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

    const featured = searchParams.get("featured")
    const isNew = searchParams.get("new")
    const category = searchParams.get("category")
    const search = searchParams.get("search")?.trim()
    const minPrice = Number(searchParams.get("minPrice"))
    const maxPrice = Number(searchParams.get("maxPrice"))
    const sort = searchParams.get("sort")
    const pageParam = searchParams.get("page")
    const limitParam = searchParams.get("limit")

    // Filtres communs.
    const where: Prisma.ProductWhereInput = { isActive: true }
    if (featured === "true") where.isFeatured = true
    if (isNew === "true") where.isNew = true
    if (category) where.category = { slug: category }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { details: { contains: search } },
      ]
    }
    const priceFilter: Prisma.FloatFilter = {}
    if (Number.isFinite(minPrice) && minPrice >= 0) priceFilter.gte = minPrice
    if (Number.isFinite(maxPrice) && maxPrice > 0) priceFilter.lte = maxPrice
    if (priceFilter.gte !== undefined || priceFilter.lte !== undefined) {
      where.price = priceFilter
    }

    // Tri (défaut : plus récents d'abord — comportement historique).
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc" ? { price: "asc" }
      : sort === "price_desc" ? { price: "desc" }
      : sort === "popular" ? { soldCount: "desc" }
      : sort === "rating" ? { rating: "desc" }
      : { createdAt: "desc" }

    const paginated = pageParam !== null || limitParam !== null
    const page = Math.max(1, Number(pageParam) || 1)
    const limit = Math.min(48, Math.max(1, Number(limitParam) || 12))

    // Pagination serveur demandée → réponse objet paginée (pas de cache :
    // les combinaisons filtre×page sont trop volatiles pour un petit TTL).
    if (paginated) {
      const [items, total] = await Promise.all([
        db.product.findMany({
          where,
          include: { category: true },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.product.count({ where }),
      ])
      return NextResponse.json({
        items,
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      })
    }

    // Comportement historique : tableau complet (cache 30 s).
    // Le cache n'est utilisé QUE pour la liste par défaut (aucun filtre
    // actif) — les combinaisons filtrées restent fraîches.
    const isDefaultList =
      !search &&
      !featured &&
      !isNew &&
      !category &&
      priceFilter.gte === undefined &&
      priceFilter.lte === undefined &&
      !sort

    if (isDefaultList) {
      const cached = getProductsCache()
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    const products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy,
    })
    if (isDefaultList) {
      setProductsCache(products)
    }
    return NextResponse.json(products)
  } catch (error) {
    console.error("GET /api/products error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

import { db } from "@/lib/db"

/**
 * Recalcule la note moyenne et le nombre d'avis APPROUVÉS d'un produit.
 * Appelé après chaque changement de modération (approbation, rejet,
 * suppression) pour rester cohérent avec l'affichage public.
 */
export async function recalcProductRating(productId: string): Promise<void> {
  const [aggregate, count] = await Promise.all([
    db.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
    }),
    db.review.count({ where: { productId, isApproved: true } }),
  ])
  await db.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      reviewCount: count,
    },
  })
}

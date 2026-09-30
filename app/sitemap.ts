import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { SITE_URL } from '@/lib/site'

// ===== Sitemap dynamique =====
// La boutique est une SPA pilotée par ?page=xxx : chaque page publique est
// déclarée ici avec ses paramètres. Les produits pointent vers leur URL
// canonique par slug (/?page=product&slug=...) — priorité plus élevée.
// Régénéré à chaque requête en dev ; au déploiement Vercel, il est revalidé
// automatiquement (route dynamique). Exclut : admin, panier, checkout, compte.

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/?page=shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/?page=categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/?page=promotions`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/?page=about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/?page=contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/?page=faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/?page=fidelite`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/?page=tracking`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/?page=guide-tailles`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/?page=terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/?page=privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      db.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ])

    const productEntries: MetadataRoute.Sitemap = products
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${SITE_URL}/?page=product&slug=${p.slug}`,
        lastModified: p.updatedAt ?? now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }))

    const categoryEntries: MetadataRoute.Sitemap = categories
      .filter((c) => c.slug)
      .map((c) => ({
        url: `${SITE_URL}/?page=shop&category=${c.slug}`,
        lastModified: c.updatedAt ?? now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }))

    return [...staticPages, ...categoryEntries, ...productEntries]
  } catch {
    // DB indisponible : sitemap dégradé mais valide (pages statiques)
    return staticPages
  }
}

// ===== Constantes du site partagées (SEO, JSON-LD, sitemap, RGPD) =====
// L'URL de production est surchargée par NEXT_PUBLIC_SITE_URL au déploiement
// (Vercel). En attendant, on déclare le domaine cible du projet.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.mignonciteshop.com'

export const SITE_NAME = 'MignonciteShop'

export const SITE_TAGLINE = 'Boutique en ligne de produits de qualité'

export const SITE_DESCRIPTION =
  'MignonciteShop, votre boutique en ligne premium. Découvrez une sélection de produits de qualité, livraison rapide et paiement sécurisé.'

export const SITE_EMAIL = 'contact@mignonciteshop.com'

/** Construit une URL absolue vers une page de la SPA (?page=xxx). */
export function siteUrl(path: string = '/'): string {
  if (path.startsWith('http')) return path
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${clean}`
}

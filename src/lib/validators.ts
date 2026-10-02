import { z } from 'zod'

/**
 * Schémas zod des entrées API — validation stricte côté serveur.
 * Le prix des commandes N'EST JAMAIS accepté du client (re-pricing serveur, cf. /api/orders).
 */

// ---------------------------------------------------------------------------
// Commandes (public)
// ---------------------------------------------------------------------------

export const ORDER_ITEM_INPUT = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(99),
})

export const ORDER_CREATE = z.object({
  customerName: z.string().trim().min(2, 'Nom trop court').max(120),
  customerEmail: z.string().trim().email('Email invalide').max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().min(5, 'Adresse trop courte').max(300),
  city: z.string().trim().min(1, 'Ville requise').max(100),
  postalCode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional(),
  // Valeurs exactes envoyées par CheckoutPage (fidélité ZIP)
  paymentMethod: z.enum(['Carte', 'PayPal', 'Paiement à la livraison']).optional(),
  shippingMethod: z.enum(['standard', 'express', 'relais']).optional(),
  promoCode: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  pointsUsed: z.number().int().min(0).max(1_000_000).optional(),
  items: z.array(ORDER_ITEM_INPUT).min(1, 'Panier vide').max(50),
})

export const ORDER_STATUS = z.enum(['confirmee', 'expediee', 'livree', 'annulee'])

// ---------------------------------------------------------------------------
// Comptes clients (auth Base44 restaurée : panier/checkout/commandes/avis)
// ---------------------------------------------------------------------------

export const REGISTER_CREATE = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(80),
  email: z.string().trim().email('Email invalide').max(200),
  password: z
    .string()
    .min(8, 'Mot de passe : 8 caractères minimum')
    .max(200, 'Mot de passe trop long'),
  // UID Firebase Auth — optionnel : l'app fonctionne sans Firebase
  firebaseUid: z.string().max(128).optional().nullable(),
})

// Ligne de panier serveur (collection Cart) — le prix n'est JAMAIS accepté du client
export const CART_ITEM_INPUT = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(0).max(99),
  size: z.string().trim().max(50).optional().nullable(),
  color: z.string().trim().max(50).optional().nullable(),
})

// ---------------------------------------------------------------------------
// Contact / Newsletter (public)
// ---------------------------------------------------------------------------

export const CONTACT_CREATE = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().max(150).optional().nullable(),
  message: z.string().trim().min(10, 'Message trop court').max(5000),
})

export const NEWSLETTER_SUBSCRIBE = z.object({
  email: z.string().trim().email().max(200),
})

// ---------------------------------------------------------------------------
// Avis / Questions (public)
// ---------------------------------------------------------------------------

export const REVIEW_CREATE = z.object({
  productId: z.string().min(1).max(64),
  author: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional().nullable(),
  content: z.string().trim().min(5).max(3000),
  photos: z.array(z.string().url().max(500)).max(3).optional(),
})

export const QUESTION_CREATE = z.object({
  productId: z.string().min(1).max(64),
  author: z.string().trim().min(2).max(80),
  question: z.string().trim().min(10).max(500),
})

// ---------------------------------------------------------------------------
// Codes promo (vérification publique + création admin)
// ---------------------------------------------------------------------------

export const PROMO_CHECK = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().min(0).max(10_000_000),
})

export const PROMO_CREATE = z.object({
  code: z.string().trim().min(2).max(40),
  type: z.enum(['percent', 'fixed', 'shipping']),
  value: z.number().min(0).max(10_000_000),
  label: z.string().trim().min(2).max(200),
})

/** Formate la première erreur zod en message français prêt à afficher. */
export function firstIssue(result: { success: boolean; error?: z.ZodError }): string {
  return result?.error?.issues?.[0]?.message || 'Données invalides'
}

// Modes de livraison partagés client/serveur (pas de directive 'use client' ici)
export interface ShippingMethod {
  id: 'standard' | 'express' | 'relais'
  label: string
  desc: string
  price: number
  freeThreshold: number | null
}

export type ShippingMethodId = ShippingMethod['id']

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    label: 'Livraison Standard',
    desc: '3 à 5 jours ouvrés · Offerte dès 50 € d\'achat',
    price: 4.99,
    freeThreshold: 50,
  },
  {
    id: 'express',
    label: 'Livraison Express',
    desc: '24 à 48h · Suivi prioritaire',
    price: 9.9,
    freeThreshold: null,
  },
  {
    id: 'relais',
    label: 'Point Relais',
    desc: '3 à 6 jours ouvrés · Retrait en boutique partenaire',
    price: 3.9,
    freeThreshold: null,
  },
]

export const getShippingMethod = (id: string | null | undefined): ShippingMethod =>
  SHIPPING_METHODS.find((m) => m.id === id) ?? SHIPPING_METHODS[0]

// Calcule les frais de livraison : promo "shipping" → offerte, sinon seuil gratuit selon la méthode
export const computeShipping = (methodId: string | null | undefined, subtotal: number, promoFreeShipping: boolean): number => {
  if (promoFreeShipping) return 0
  const method = getShippingMethod(methodId)
  if (method.freeThreshold !== null && subtotal >= method.freeThreshold) return 0
  return method.price
}

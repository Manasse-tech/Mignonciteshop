import type { PromoDefinition } from "@/lib/types";

/**
 * Moteur de codes promo — partagé entre le panier et le checkout.
 *
 * En attendant le backend (model PromoCode en Prisma + GET /api/promos/validate),
 * les codes sont définis côté client. La logique de calcul sera déplacée
 * côté serveur lors du développement du backend (source de vérité unique).
 */
export const PROMO_CODES: PromoDefinition[] = [
  {
    code: "BIENVENUE10",
    label: "-10 % sur votre commande",
    type: "percent",
    value: 10,
    minSubtotal: 0,
  },
  {
    code: "FREESHIP",
    label: "Livraison offerte",
    type: "freeship",
    value: 0,
    minSubtotal: 25,
  },
  {
    code: "GOLD20",
    label: "-20 % dès 100 € d'achat",
    type: "percent",
    value: 20,
    minSubtotal: 100,
  },
  {
    code: "REDUCTION5",
    label: "-5 € sur votre commande",
    type: "amount",
    value: 5,
    minSubtotal: 30,
  },
];

export interface PromoValidationResult {
  ok: boolean;
  promo?: PromoDefinition;
  error?: string;
}

/** Valide un code saisi par le client (insensible à la casse / espaces). */
export function validatePromo(rawCode: string, subtotal: number): PromoValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Veuillez saisir un code." };

  const promo = PROMO_CODES.find((p) => p.code === code);
  if (!promo) {
    return { ok: false, error: "Ce code promo n'est pas valide." };
  }
  if (subtotal < promo.minSubtotal) {
    return {
      ok: false,
      error: `Ce code est valable dès ${promo.minSubtotal.toFixed(2)} € d'achat.`,
    };
  }
  return { ok: true, promo };
}

export interface PromoComputation {
  /** Remise appliquée sur le sous-total (0 si none/freeship). */
  discount: number;
  /** true si le code annule les frais de livraison. */
  freeShipping: boolean;
  /** Sous-total après remise (hors livraison). */
  discountedSubtotal: number;
}

/**
 * Calcule la remise d'un code promo appliqué à un sous-total.
 * La remise ne peut jamais rendre le total négatif.
 */
export function computePromo(promo: PromoDefinition | null, subtotal: number): PromoComputation {
  if (!promo || subtotal <= 0) {
    return { discount: 0, freeShipping: false, discountedSubtotal: Math.max(0, subtotal) };
  }
  let discount = 0;
  if (promo.type === "percent") {
    discount = (subtotal * promo.value) / 100;
  } else if (promo.type === "amount") {
    discount = Math.min(promo.value, subtotal);
  }
  discount = Math.round(discount * 100) / 100;
  return {
    discount,
    freeShipping: promo.type === "freeship",
    discountedSubtotal: Math.round((subtotal - discount) * 100) / 100,
  };
}

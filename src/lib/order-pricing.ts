/**
 * Grille tarifaire serveur — SOURCE DE VÉRITÉ pour la facturation.
 *
 * Réplique exacte des règles affichées côté client (checkout-page.tsx) :
 * le client ne fait qu'estimer ; le montant réellement débité est
 * TOUJOURS recalculé ici à partir des prix en base.
 */

import type { PromoCode } from "@prisma/client";
import { DEFAULT_SETTINGS, type StoreSettings } from "@/lib/settings";

/** Défauts historiques — remplacés par les réglages DB quand ils existent. */
export const FREE_SHIPPING_THRESHOLD = DEFAULT_SETTINGS.freeShippingThreshold;
export const STANDARD_SHIPPING_COST = DEFAULT_SETTINGS.shippingStandard;
export const EXPRESS_SHIPPING_COST = DEFAULT_SETTINGS.shippingExpress;
export const PICKUP_SHIPPING_COST = DEFAULT_SETTINGS.shippingPickup;

export type ShippingMethod = "standard" | "express" | "pickup";

export const SHIPPING_METHODS: ShippingMethod[] = [
  "standard",
  "express",
  "pickup",
];

export function isShippingMethod(value: unknown): value is ShippingMethod {
  return (
    typeof value === "string" && SHIPPING_METHODS.includes(value as ShippingMethod)
  );
}

/** Arrondi monétaire à 2 décimales (évite les artefacts flottants). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Frais de livraison — règles identiques au front :
 * express/pickup toujours payants ; standard offert dès le seuil
 * ou si le code promo annule la livraison.
 */
export function computeShipping(
  method: ShippingMethod,
  subtotal: number,
  freeShippingPromo: boolean,
  settings: StoreSettings = DEFAULT_SETTINGS
): number {
  if (method === "express") return round2(settings.shippingExpress);
  if (method === "pickup") return round2(settings.shippingPickup);
  if (subtotal >= settings.freeShippingThreshold || freeShippingPromo) return 0;
  return round2(settings.shippingStandard);
}

export interface PromoCheckResult {
  ok: boolean;
  error?: string;
  promo?: PromoCode;
  discount: number;
  freeShipping: boolean;
}

/**
 * Revalide intégralement un code promo côté serveur (existence, actif,
 * expiration, plafond d'utilisations, minimum d'achat) et calcule la remise.
 */
export function evaluatePromo(
  promo: PromoCode | null,
  subtotal: number
): PromoCheckResult {
  if (!promo) {
    return { ok: false, error: "Ce code promo n'est pas valide.", discount: 0, freeShipping: false };
  }
  if (!promo.isActive) {
    return { ok: false, error: "Ce code promo n'est plus actif.", discount: 0, freeShipping: false };
  }
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Ce code promo a expiré.", discount: 0, freeShipping: false };
  }
  if (promo.maxUses !== null && promo.usageCount >= promo.maxUses) {
    return { ok: false, error: "Ce code promo a atteint sa limite d'utilisations.", discount: 0, freeShipping: false };
  }
  if (subtotal < promo.minSubtotal) {
    return {
      ok: false,
      error: `Ce code est valable dès ${round2(promo.minSubtotal).toFixed(2)} € d'achat.`,
      discount: 0,
      freeShipping: false,
    };
  }

  let discount = 0;
  if (promo.type === "percent") {
    discount = (subtotal * promo.value) / 100;
  } else if (promo.type === "amount") {
    discount = Math.min(promo.value, subtotal);
  }
  return {
    ok: true,
    promo,
    discount: round2(discount),
    freeShipping: promo.type === "freeship",
  };
}

/** Génère une référence de commande lisible et unique (MC-XXXXXX). */
export function generateOrderReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/L/O/0/1 (ambigus)
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `MC-${suffix}`;
}

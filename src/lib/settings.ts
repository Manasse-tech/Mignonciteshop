/**
 * Réglages boutique — SOURCE DE VÉRITÉ SERVEUR.
 *
 * Valeurs stockées en base (model Setting, clé/valeur) et éditables
 * depuis l'espace admin. Le serveur les relit à chaque commande pour
 * calculer les frais de livraison réellement débités.
 *
 * Cache mémoire de 30 s : évite une requête DB par appel API tout en
 * garantissant une propagation quasi instantanée après modification.
 */

import { db } from "@/lib/db";

export interface StoreSettings {
  shippingStandard: number;
  shippingExpress: number;
  shippingPickup: number;
  freeShippingThreshold: number;
  lowStockThreshold: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  shippingStandard: 4.99,
  shippingExpress: 9.99,
  shippingPickup: 2.99,
  freeShippingThreshold: 50,
  lowStockThreshold: 5,
};

export const SETTING_KEYS = [
  "shippingStandard",
  "shippingExpress",
  "shippingPickup",
  "freeShippingThreshold",
  "lowStockThreshold",
] as const satisfies readonly (keyof StoreSettings)[];

const CACHE_TTL_MS = 30_000;

let cache: { data: StoreSettings; at: number } | null = null;

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Charge les réglages (base → défauts pour toute clé absente/invalide). */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const settings: StoreSettings = { ...DEFAULT_SETTINGS };
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    for (const row of rows) {
      if (!SETTING_KEYS.includes(row.key as keyof StoreSettings)) continue;
      const key = row.key as keyof StoreSettings;
      settings[key] = toNumber(row.value, DEFAULT_SETTINGS[key]);
    }
  } catch {
    // En cas d'indisponibilité DB, on retombe sur les valeurs par défaut
    // (jamais de blocage du tunnel de commande pour un réglage).
  }

  cache = { data: settings, at: Date.now() };
  return settings;
}

/** Force la relecture depuis la base (après PATCH admin). */
export function invalidateSettingsCache(): void {
  cache = null;
}

/** Réglages « publics » affichables côté client (estimation panier/checkout). */
export interface PublicSettings {
  shipping: {
    standard: number;
    express: number;
    pickup: number;
  };
  freeShippingThreshold: number;
}

export function toPublicSettings(settings: StoreSettings): PublicSettings {
  return {
    shipping: {
      standard: settings.shippingStandard,
      express: settings.shippingExpress,
      pickup: settings.shippingPickup,
    },
    freeShippingThreshold: settings.freeShippingThreshold,
  };
}

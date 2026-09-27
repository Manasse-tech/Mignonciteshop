"use client";

/**
 * Réglages publics de la boutique (frais de livraison + seuil de gratuité)
 * côté client — estimation affichée panier/checkout.
 *
 * Source : GET /api/settings (les réglages admin). Cache mémoire + sessionStorage
 * pour éviter les appels répétés ; valeurs par défaut en fallback (premier
 * rendu et hors-ligne). Le montant réellement débité reste recalculé serveur
 * dans POST /api/orders — cette estimation n'est jamais contractuelle.
 */

import { useEffect, useState } from "react";
import { api, type StoreSettingsPublic } from "@/lib/api";

export const DEFAULT_STORE_SETTINGS: StoreSettingsPublic = {
  shipping: { standard: 4.99, express: 9.99, pickup: 2.99 },
  freeShippingThreshold: 50,
};

const CACHE_KEY = "mc-settings:shipping";
const CACHE_TTL_MS = 60_000;

let memoryCache: {
  data: StoreSettingsPublic;
  at: number;
} | null = null;

function readSessionCache(): StoreSettingsPublic | null {
  if (memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS) {
    return memoryCache.data;
  }
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: StoreSettingsPublic; at: number };
    if (Date.now() - parsed.at < CACHE_TTL_MS) {
      memoryCache = parsed;
      return parsed.data;
    }
  } catch {
    // sessionStorage indisponible → ignore silencieusement.
  }
  return null;
}

function writeSessionCache(data: StoreSettingsPublic): void {
  memoryCache = { data, at: Date.now() };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // quota dépassé / mode privé → ignore silencieusement.
  }
}

/**
 * Renvoie les réglages courants (défauts au premier rendu, puis valeurs
 * serveur dès que la requête aboutit — sans décalage d'hydratation car les
 * valeurs par défaut sont identiques côté serveur).
 */
export function useStoreSettings(): StoreSettingsPublic {
  const [settings, setSettings] = useState<StoreSettingsPublic>(() => {
    return readSessionCache() ?? DEFAULT_STORE_SETTINGS;
  });

  useEffect(() => {
    let cancelled = false;
    api.settings
      .get()
      .then((data) => {
        if (cancelled) return;
        writeSessionCache(data);
        setSettings(data);
      })
      .catch(() => {
        // Défauts conservés en cas d'échec réseau.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}

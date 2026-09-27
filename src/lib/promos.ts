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

/**
 * Cache de session des codes validés côté serveur (ex: codes créés dans
 * l'espace admin). Permet à l'affichage panier/checkout de reconnaître un
 * code valide même s'il n'existe pas dans la liste locale. Persisté en
 * sessionStorage pour survivre à la navigation (pas au changement d'onglet).
 */
const remotePromoCache = new Map<string, PromoDefinition>();
const PROMO_CACHE_PREFIX = "mc-promo:";

function cacheRemotePromo(promo: PromoDefinition): void {
  remotePromoCache.set(promo.code, promo);
  try {
    window.sessionStorage.setItem(
      `${PROMO_CACHE_PREFIX}${promo.code}`,
      JSON.stringify(promo)
    );
  } catch {
    // sessionStorage indisponible (navigation privée) : cache mémoire seul.
  }
}

function getKnownPromo(code: string): PromoDefinition | undefined {
  const local = PROMO_CODES.find((p) => p.code === code);
  if (local) return local;
  const cached = remotePromoCache.get(code);
  if (cached) return cached;
  try {
    const raw = window.sessionStorage.getItem(`${PROMO_CACHE_PREFIX}${code}`);
    if (raw) {
      const parsed = JSON.parse(raw) as PromoDefinition;
      remotePromoCache.set(code, parsed);
      return parsed;
    }
  } catch {
    // Ignore (SSR ou sessionStorage indisponible).
  }
  return undefined;
}

/**
 * Validation SERVEUR d'un code promo (source de vérité — /api/promos/validate).
 * Le serveur vérifie existence, activité, expiration, plafond et minimum
 * d'achat, et renvoie la définition du code + la remise calculée.
 *
 * Fallback : en cas d'indisponibilité réseau (status 0), on retombe sur la
 * validation locale (les codes seedés sont identiques) pour ne pas bloquer
 * un client ; la commande reste de toute façon revalidée côté serveur.
 */
export async function validatePromoRemote(
  rawCode: string,
  subtotal: number
): Promise<PromoValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Veuillez saisir un code." };

  try {
    const res = await fetch("/api/promos/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      promo?: PromoDefinition;
    };
    if (!data.ok || !data.promo) {
      return { ok: false, error: data.error ?? "Ce code promo n'est pas valide." };
    }
    cacheRemotePromo(data.promo);
    return { ok: true, promo: data.promo };
  } catch {
    // Serveur injoignable → fallback local (ne doit jamais casser l'UX).
    return validatePromo(rawCode, subtotal);
  }
}

/**
 * Valide un code connu (liste locale OU cache des codes validés serveur).
 * Utilisé pour l'affichage panier/checkout du code déjà stocké.
 */
export function validatePromo(rawCode: string, subtotal: number): PromoValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Veuillez saisir un code." };

  const promo = getKnownPromo(code);
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

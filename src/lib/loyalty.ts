/**
 * Programme de fidélité — RÈGLES MÉTIER (source de vérité serveur).
 *
 * - Gains : 1 point par tranche de 100 F CFA dépensés (arrondi vers le bas),
 *   multipliés par le bonus du palier courant (arrondi au point).
 * - Paliers par lifetimePoints : bronze (0+), silver (5 000+), gold (20 000+).
 * - Rédemption (réservée à un futur code promo de rédemption) :
 *   100 points = 500 F CFA de remise, minimum 100 points,
 *   plafonnée à 30 % du sous-total de la commande.
 *
 * Toute variation de solde est consignée dans LoyaltyTransaction (piste
 * d'audit complète) — jamais de solde modifié sans transaction.
 */

import { db } from "@/lib/db";

export const LOYALTY_POINTS_PER = 100; // 1 point par 100 F CFA dépensés
export const LOYALTY_FCFA_PER_100_POINTS = 500; // 100 points = 500 F CFA
export const LOYALTY_REDEEM_MIN_POINTS = 100;
export const LOYALTY_REDEEM_MAX_RATE = 0.3; // plafond : 30 % du sous-total

export type LoyaltyTier = "bronze" | "silver" | "gold";

export const LOYALTY_TIERS: {
  tier: LoyaltyTier;
  label: string;
  threshold: number; // lifetimePoints requis
  bonusMultiplier: number; // bonus de gains
}[] = [
  { tier: "bronze", label: "Bronze", threshold: 0, bonusMultiplier: 1 },
  { tier: "silver", label: "Argent", threshold: 5_000, bonusMultiplier: 1.1 },
  { tier: "gold", label: "Or", threshold: 20_000, bonusMultiplier: 1.25 },
];

/** Palier correspondant à un total de points cumulés. */
export function tierForLifetimePoints(lifetimePoints: number): LoyaltyTier {
  let current: LoyaltyTier = "bronze";
  for (const tier of LOYALTY_TIERS) {
    if (lifetimePoints >= tier.threshold) current = tier.tier;
  }
  return current;
}

/** Multiplicateur de gains du palier (bronze ×1, silver ×1.1, gold ×1.25). */
export function tierMultiplier(tier: string): number {
  return (
    LOYALTY_TIERS.find((entry) => entry.tier === tier)?.bonusMultiplier ?? 1
  );
}

/** Palier suivant (null si déjà au maximum). */
export function nextTier(tier: string): (typeof LOYALTY_TIERS)[number] | null {
  const index = LOYALTY_TIERS.findIndex((entry) => entry.tier === tier);
  if (index < 0 || index >= LOYALTY_TIERS.length - 1) return null;
  return LOYALTY_TIERS[index + 1];
}

/** Points de base gagnés pour un montant dépensé (avant bonus de palier). */
export function basePointsForAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount / LOYALTY_POINTS_PER);
}

/**
 * Points TOTAUX gagnés pour un montant, bonus du palier courant appliqué
 * (arrondi au point le plus proche).
 */
export function pointsForAmount(amount: number, tier: string): number {
  return Math.round(basePointsForAmount(amount) * tierMultiplier(tier));
}

/** Valeur en F CFA d'un solde de points (affichage client). */
export function pointsToFcfa(points: number): number {
  return Math.floor(points / 100) * LOYALTY_FCFA_PER_100_POINTS;
}

/**
 * Calcule la rédemption possible pour un sous-total donné :
 * - maxPoints plafonné à 30 % du sous-total (100 points = 500 F CFA) ;
 * - minimum 100 points pour pouvoir utiliser des points.
 */
export function computeRedemption(
  points: number,
  subtotal: number
): { ok: boolean; reason?: string; points: number; discount: number } {
  const maxDiscount = subtotal * LOYALTY_REDEEM_MAX_RATE;
  const maxPoints =
    Math.floor(maxDiscount / LOYALTY_FCFA_PER_100_POINTS) * 100;
  const usable = Math.min(Math.floor(points), maxPoints);
  if (usable < LOYALTY_REDEEM_MIN_POINTS) {
    return {
      ok: false,
      reason:
        points < LOYALTY_REDEEM_MIN_POINTS
          ? `Il faut au moins ${LOYALTY_REDEEM_MIN_POINTS} points pour utiliser la fidélité.`
          : "Le plafond de rédemption (30 % du sous-total) est atteint avec votre solde.",
      points: 0,
      discount: 0,
    };
  }
  return {
    ok: true,
    points: usable,
    discount: (usable / 100) * LOYALTY_FCFA_PER_100_POINTS,
  };
}

/**
 * Crédite les points d'une commande sur le compte de fidélité de
 * l'utilisateur (IDEMPOTENT : si une transaction « earn » existe déjà pour
 * ce couple (accountId, orderId), aucun double crédit).
 *
 * Appelé APRÈS la création de la commande (fire-and-forget acceptable :
 * une erreur de fidélité ne doit jamais faire échouer une commande).
 */
export async function awardPointsForOrder(input: {
  userId: string;
  orderId: string;
  orderReference: string;
  amountSpent: number;
}): Promise<{ ok: boolean; points?: number; alreadyCredited?: boolean }> {
  const { userId, orderId, orderReference, amountSpent } = input;
  try {
    // Compte créé à la volée s'il n'existe pas encore.
    const account = await db.loyaltyAccount.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    // Idempotence : la commande a déjà été créditée → no-op.
    const existing = await db.loyaltyTransaction.findFirst({
      where: { accountId: account.id, type: "earn", orderId },
    });
    if (existing) return { ok: true, alreadyCredited: true, points: 0 };

    const earned = pointsForAmount(amountSpent, account.tier);
    if (earned <= 0) return { ok: true, points: 0 };

    const lifetimePoints = account.lifetimePoints + earned;
    const newTier = tierForLifetimePoints(lifetimePoints);

    await db.$transaction([
      db.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { increment: earned },
          lifetimePoints,
          tier: newTier,
        },
      }),
      db.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: "earn",
          points: earned,
          reason: `order:${orderReference}`,
          orderId,
          meta: JSON.stringify({
            amountSpent,
            tier: newTier,
            multiplier: tierMultiplier(account.tier),
          }),
        },
      }),
    ]);

    return { ok: true, points: earned };
  } catch (error) {
    console.error("[loyalty] échec crédit points:", error);
    return { ok: false };
  }
}

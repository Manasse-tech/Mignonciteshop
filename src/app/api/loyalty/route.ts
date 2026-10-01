import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserFromRequest } from "@/lib/auth-server"
import {
  LOYALTY_FCFA_PER_100_POINTS,
  LOYALTY_POINTS_PER,
  LOYALTY_REDEEM_MAX_RATE,
  LOYALTY_REDEEM_MIN_POINTS,
  LOYALTY_TIERS,
  nextTier,
  tierForLifetimePoints,
} from "@/lib/loyalty"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/loyalty — carte de fidélité de l'utilisateur connecté.
 *
 * Réponse : compte (solde, cumul, palier), 20 dernières transactions,
 * progression vers le palier suivant et règles du programme.
 * Protégé par session (cookie httpOnly) — 401 si non connecté.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connectez-vous pour consulter votre carte de fidélité." },
      { status: 401 }
    )
  }

  try {
    const account = await db.loyaltyAccount.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    // Cohérence défensive : recalcule le palier théorique depuis le cumul.
    const tier = tierForLifetimePoints(account.lifetimePoints)
    const upcoming = nextTier(account.tier)
    const nextTierInfo = upcoming
      ? {
          tier: upcoming.tier,
          label: upcoming.label,
          threshold: upcoming.threshold,
          pointsRemaining: Math.max(0, upcoming.threshold - account.lifetimePoints),
          progress:
            upcoming.threshold > 0
              ? Math.min(
                  100,
                  Math.round((account.lifetimePoints / upcoming.threshold) * 100)
                )
              : 100,
        }
      : null

    return NextResponse.json({
      ok: true,
      account: {
        points: account.points,
        lifetimePoints: account.lifetimePoints,
        tier: account.tier,
        tierLabel: LOYALTY_TIERS.find((t) => t.tier === account.tier)?.label ?? account.tier,
        updatedAt: account.updatedAt,
        createdAt: account.createdAt,
      },
      nextTier: nextTierInfo,
      transactions: account.transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        points: tx.points,
        reason: tx.reason,
        orderId: tx.orderId,
        createdAt: tx.createdAt,
      })),
      rules: {
        pointsPerSpent: LOYALTY_POINTS_PER, // 1 point / 100 F CFA
        fcfaPer100Points: LOYALTY_FCFA_PER_100_POINTS, // 100 pts = 500 F CFA
        redeemMinPoints: LOYALTY_REDEEM_MIN_POINTS,
        redeemMaxRate: LOYALTY_REDEEM_MAX_RATE,
        tiers: LOYALTY_TIERS.map((t) => ({
          tier: t.tier,
          label: t.label,
          threshold: t.threshold,
          bonusMultiplier: t.bonusMultiplier,
        })),
      },
    })
  } catch (error) {
    console.error("GET /api/loyalty error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

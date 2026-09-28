import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/analytics
 * Collecte d'événements de navigation/métier (voir src/lib/analytics.ts
 * côté client). Chaque événement est persisté dans la table AnalyticsEvent
 * puis consultable dans l'admin (onglet Rapports → Activité).
 *
 * Aucun cookie tiers, aucune donnée personnelle : le payload est limité à
 * { event, page?, productId?, value?, meta? }. En cas de saturation DB la
 * télémétrie échoue silencieusement (jamais de casse UX).
 */

const analyticsSchema = z.object({
  event: z.string().trim().min(1).max(60),
  page: z.string().trim().max(60).optional().nullable(),
  productId: z.string().trim().max(60).optional().nullable(),
  value: z.number().finite().optional().nullable(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  const limit = checkRateLimit(`analytics:${ip}`, 120, 60 * 1000)
  if (!limit.allowed) {
    // Silencieux : jamais d'erreur visible pour la télémétrie.
    return new NextResponse(null, { status: 204 })
  }

  try {
    const body = await request.json().catch(() => null)
    const parsed = analyticsSchema.safeParse(body)
    if (parsed.success) {
      const { event, page, productId, value, meta } = parsed.data
      await db.analyticsEvent
        .create({
          data: {
            event: event.slice(0, 60),
            page: page?.slice(0, 60) ?? null,
            productId: productId?.slice(0, 60) ?? null,
            value: value ?? null,
            meta: JSON.stringify(meta ?? {}),
          },
        })
        .catch(() => undefined)
    }
  } catch {
    // Ignoré volontairement — la télémétrie ne doit jamais casser l'UX.
  }
  return new NextResponse(null, { status: 204 })
}

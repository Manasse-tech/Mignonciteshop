import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/analytics
 * Collecte d'événements de navigation (voir src/lib/analytics.ts côté
 * client). Pour l'instant : accepte et journalise légalement en local
 * (aucun cookie tiers, aucune donnée personnelle, IP anonymisée par
 * troncature). Un vrai export GA4/Plausible pourra s'y brancher plus tard.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  const limit = checkRateLimit(`analytics:${ip}`, 120, 60 * 1000)
  if (!limit.allowed) {
    // Silencieux : jamais d'erreur visible pour la télémétrie.
    return new NextResponse(null, { status: 204 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (body && typeof body === "object" && "event" in body) {
      const event = (body as { event: unknown }).event
      if (typeof event === "string" && event.length <= 60) {
        console.log(`[ANALYTICS] ${event}`)
      }
    }
  } catch {
    // Ignoré volontairement — la télémétrie ne doit jamais casser l'UX.
  }
  return new NextResponse(null, { status: 204 })
}

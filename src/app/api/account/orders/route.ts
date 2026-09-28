import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserFromRequest } from "@/lib/auth-server"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/account/orders — commandes du compte connecté.
 *
 * Rapprochement par email (les commandes invitées ne portent pas de
 * userId, uniquement l'email) : le client voit TOUTES les commandes
 * passées avec son adresse, même avant la création du compte.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connectez-vous pour accéder à vos commandes." },
      { status: 401 }
    )
  }

  const ip = clientIp(request)
  const limit = checkRateLimit(`account:${ip}`, 60, 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    )
  }

  try {
    const orders = await db.order.findMany({
      where: { email: user.email.toLowerCase() },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true },
    })
    return NextResponse.json({ orders })
  } catch (error) {
    console.error("GET /api/account/orders error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

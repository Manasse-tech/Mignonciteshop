import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/auth/session
 * Réplique exacte de la réponse NextAuth (v4) du site original
 * pour un visiteur non authentifié.
 */
export async function GET() {
  return NextResponse.json({ user: null })
}

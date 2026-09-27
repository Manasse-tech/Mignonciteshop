import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { clearSessionCookie, getSessionUserFromRequest } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/auth/logout
 * Révoque la session en base et supprime le cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUserFromRequest(request)
    if (user) {
      // Révoquer TOUTES les sessions de l'utilisateur (simple et sûr).
      await db.session.deleteMany({ where: { userId: user.id } })
    }
    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    console.error("POST /api/auth/logout error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

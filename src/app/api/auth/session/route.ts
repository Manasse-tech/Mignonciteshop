import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/auth/session
 * Renvoie { user } si une session valide existe (cookie httpOnly),
 * sinon { user: null } — contrat identique à NextAuth v4.
 */
export async function GET() {
  try {
    const user = await getSessionUser()
    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/auth/session error:", error)
    return NextResponse.json({ user: null })
  }
}

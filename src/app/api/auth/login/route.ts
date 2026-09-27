import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import {
  createSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(160),
  password: z.string().min(1, "Mot de passe requis").max(100),
})

// Message d'erreur générique : ne révèle jamais si l'email existe.
const INVALID_CREDENTIALS = "Email ou mot de passe incorrect."

/**
 * POST /api/auth/login
 * Body : { email, password }
 * Vérifie les identifiants (bcrypt), crée la session (cookie httpOnly)
 * et renvoie l'utilisateur sans le hash.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`login:${ip}`, 10, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Trop de tentatives. Réessayez dans ${limit.retryAfter}s.`,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: INVALID_CREDENTIALS },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data
    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      return NextResponse.json(
        { ok: false, error: INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, user.password)
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: INVALID_CREDENTIALS },
        { status: 401 }
      )
    }

    const { token, expires } = await createSession(user.id)
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
    setSessionCookie(response, token, expires)
    return response
  } catch (error) {
    console.error("POST /api/auth/login error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/auth/login → 405 */
export async function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 })
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import {
  createSession,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_RE, "Adresse email invalide")
    .max(160),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .max(100),
})

/**
 * POST /api/auth/register
 * Body : { name, email, password }
 * Crée le compte (rôle customer), connecte immédiatement (cookie de
 * session httpOnly) et renvoie l'utilisateur SANS le hash.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`register:${ip}`, 5, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Trop de tentatives. Réessayez dans un instant." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Inscription invalide.",
        },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Un compte existe déjà avec cette adresse email.",
        },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { name, email, password: passwordHash, role: "customer" },
    })

    const { token, expires } = await createSession(user.id)
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
    setSessionCookie(response, token, expires)
    return response
  } catch (error) {
    console.error("POST /api/auth/register error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/auth/register → 405 */
export async function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 })
}

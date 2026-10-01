import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import {
  createSession,
  setSessionCookie,
  verifyPassword,
  hashPassword,
} from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const claimSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(160),
  password: z.string().min(1).max(100),
  name: z.string().trim().max(80).optional(),
})

const INVALID = "Email ou mot de passe incorrect."

/**
 * POST /api/auth/admin-claim — accès administrateur CACHÉ.
 *
 * Geste secret : 7 taps sur le nom de la boutique dans la page « Se connecter ».
 *
 * Comportement (exigence produit) :
 *  1. AUCUN admin n'existe encore → les premiers identifiants saisis sont
 *     ENREGISTRÉS comme compte administrateur (email + mot de passe haché bcrypt).
 *  2. Un admin existe déjà → la route se comporte comme une page de connexion
 *     admin classique (vérification bcrypt, jamais de création).
 *
 * La session créée est identique à celle du login public (cookie httpOnly) :
 * l'admin peut donc ensuite se connecter soit via la page cachée, soit via la
 * page publique — les deux utilisent les mêmes identifiants.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`admin-claim:${ip}`, 8, 60 * 1000)
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
    const parsed = claimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: INVALID }, { status: 400 })
    }
    const { email, password, name } = parsed.data

    const existingAdmin = await db.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    })

    if (existingAdmin) {
      // ---- Mode connexion admin (compte déjà créé) ----
      const user = await db.user.findUnique({ where: { email } })
      if (!user || user.role !== "admin" || !user.password) {
        return NextResponse.json({ ok: false, error: INVALID }, { status: 401 })
      }
      const valid = await verifyPassword(password, user.password)
      if (!valid) {
        return NextResponse.json({ ok: false, error: INVALID }, { status: 401 })
      }
      const { token, expires } = await createSession(user.id)
      const response = NextResponse.json({
        ok: true,
        created: false,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      })
      setSessionCookie(response, token, expires)
      return response
    }

    // ---- Mode enregistrement (premiers identifiants = compte admin) ----
    if (password.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "Le mot de passe administrateur doit contenir au moins 8 caractères.",
        },
        { status: 400 }
      )
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Le mot de passe doit contenir au moins une lettre et un chiffre.",
        },
        { status: 400 }
      )
    }

    const hashed = await hashPassword(password)
    const admin = await db.user.upsert({
      where: { email },
      update: { role: "admin", password: hashed },
      create: {
        email,
        password: hashed,
        name: name || "Administrateur",
        role: "admin",
      },
    })

    const { token, expires } = await createSession(admin.id)
    const response = NextResponse.json({
      ok: true,
      created: true,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
    setSessionCookie(response, token, expires)
    return response
  } catch (error) {
    console.error("POST /api/auth/admin-claim error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/auth/admin-claim → indique uniquement si un admin existe déjà,
 *  pour adapter le libellé du formulaire caché (enregistrement vs connexion). */
export async function GET() {
  try {
    const admin = await db.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    })
    return NextResponse.json({ adminExists: Boolean(admin) })
  } catch {
    return NextResponse.json({ adminExists: false })
  }
}

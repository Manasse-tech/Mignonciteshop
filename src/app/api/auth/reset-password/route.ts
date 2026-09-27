import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import { hashPassword } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const resetSchema = z.object({
  token: z.string().trim().min(10, "Lien de réinitialisation invalide").max(200),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .max(100),
})

/**
 * POST /api/auth/reset-password
 * Body : { token, password }
 *
 * Consomme un token de réinitialisation (VerificationToken) :
 *   - valide et non expiré → change le mot de passe, révoque TOUTES les
 *     sessions du compte (sécurité) et supprime le token (usage unique)
 *   - sinon → 400 message générique (pas de fuite d'information)
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`reset:${ip}`, 5, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = resetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    const verification = await db.verificationToken.findUnique({
      where: { token },
    })
    if (!verification || verification.expires.getTime() <= Date.now()) {
      if (verification) {
        await db.verificationToken
          .delete({ where: { token } })
          .catch(() => undefined)
      }
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ce lien de réinitialisation est invalide ou expiré. Refaites une demande.",
        },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: verification.identifier },
    })
    if (!user) {
      await db.verificationToken
        .delete({ where: { token } })
        .catch(() => undefined)
      return NextResponse.json(
        { ok: false, error: "Compte non trouvé." },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      }),
      // Usage unique : le token est détruit.
      db.verificationToken.delete({ where: { token } }),
      // Sécurité : toutes les sessions ouvertes du compte sont révoquées.
      db.session.deleteMany({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      ok: true,
      message:
        "Mot de passe mis à jour. Vous pouvez vous connecter avec votre nouveau mot de passe.",
    })
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET → 405 */
export async function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 })
}

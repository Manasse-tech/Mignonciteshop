import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import { sendEmail, buildResetUrl } from "@/lib/mailer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const forgotSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EMAIL_RE, "Adresse email invalide")
    .max(160),
})

/**
 * POST /api/auth/forgot-password
 * Body : { email }
 *
 * Crée un token de réinitialisation (valable 1 h, à usage unique —
 * model VerificationToken du schéma NextAuth) et « envoie » l'e-mail
 * correspondant (persisté dans EmailLog en sandbox).
 *
 * ANTI-ÉNUMÉRATION : la réponse est TOUJOURS ok:true, que le compte
 * existe ou non — on ne révèle jamais qui a un compte.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`forgot:${ip}`, 3, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Trop de demandes. Réessayez dans quelques minutes." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = forgotSchema.safeParse(body)
    if (!parsed.success) {
      // Même en cas d'email invalide : réponse neutre (pas d'énumération).
      return NextResponse.json({
        ok: true,
        message:
          "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
      })
    }

    const { email } = parsed.data
    const user = await db.user.findUnique({ where: { email } })

    if (user) {
      const token = randomBytes(32).toString("hex")
      const expires = new Date(Date.now() + 60 * 60 * 1000)
      await db.verificationToken.create({
        data: { identifier: email, token, expires },
      })

      await sendEmail({
        to: email,
        subject: "Réinitialisation de votre mot de passe — MignonciteShop",
        template: "password_reset",
        lines: [
          `Bonjour ${user.name ?? ""},`.trim(),
          ``,
          `Une demande de réinitialisation de mot de passe a été faite pour votre compte.`,
          `Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois :`,
          ``,
          `  ${buildResetUrl(token)}`,
          ``,
          `Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail —`,
          `votre mot de passe actuel reste valable.`,
        ],
        data: { token, expiresAt: expires.toISOString() },
      })
    }

    return NextResponse.json({
      ok: true,
      message:
        "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
    })
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error)
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

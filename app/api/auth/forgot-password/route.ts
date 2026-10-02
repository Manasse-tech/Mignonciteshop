import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { sendEmail, passwordResetHtml } from '@/lib/email'
import { isFirebaseConfigured, fbSendPasswordReset } from '@/lib/firebase'
import { findUserByEmail } from '@/lib/backend'
import { SITE_URL } from '@/lib/site'

/**
 * POST /api/auth/forgot-password — demande de réinitialisation de mot de passe.
 *
 * Sécurité (énumération d'emails) : répond TOUJOURS 200 avec le même message,
 * que le compte existe ou non.
 *
 * Backend double :
 *  - FIREBASE configuré → email de reset envoyé par l'infrastructure Firebase
 *    (gratuit, zéro SMTP) ; le nouveau mot de passe est défini via la page
 *    hébergée Firebase et vaut pour Firebase ET pour le miroir local.
 *  - sinon → jeton maison (SHA-256, 30 min, usage unique) + email outbox/Resend.
 */
const GENERIC_MESSAGE = 'Si un compte existe, un email de réinitialisation a été envoyé.'

export async function POST(req: NextRequest) {
  if (!rateLimit(clientKey(req, 'forgot-password'), 5, 10 * 60_000)) {
    return tooManyRequests()
  }

  try {
    const { email } = (await req.json()) as { email?: string }
    const normalized = email?.trim().toLowerCase()
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    // ==================== MODE FIREBASE ====================
    if (isFirebaseConfigured()) {
      await fbSendPasswordReset(normalized).catch(() => false)
      return NextResponse.json({ message: GENERIC_MESSAGE })
    }

    // ==================== MODE LOCAL ====================
    const user = await findUserByEmail(normalized)

    if (user) {
      // Invalide les demandes précédentes (un seul lien actif par compte)
      await db.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      })

      const token = randomBytes(32).toString('hex')
      const tokenHash = createHash('sha256').update(token).digest('hex')
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      })

      const resetUrl = `${SITE_URL}/?page=login&reset=${token}`
      await sendEmail({
        to: user.email,
        subject: 'Réinitialisez votre mot de passe — MignonciteShop',
        template: 'password-reset',
        html: passwordResetHtml(user.name, resetUrl),
        userId: user.id,
      })
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error)
    // Même en cas d'erreur interne : message identique (pas de fuite d'information)
    return NextResponse.json({ message: GENERIC_MESSAGE })
  }
}

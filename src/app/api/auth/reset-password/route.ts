import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isFirebaseConfigured } from '@/lib/firebase'

/**
 * POST /api/auth/reset-password — consomme un jeton de réinitialisation et
 * définit le nouveau mot de passe (MODE LOCAL uniquement).
 *
 * En mode Firebase, la réinitialisation passe par le lien envoyé par
 * l'infrastructure Firebase (page hébergée) : ce jeton maison n'est pas utilisé.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(clientKey(req, 'reset-password'), 10, 10 * 60_000)) {
    return tooManyRequests()
  }

  try {
    const { token, password } = (await req.json()) as { token?: string; password?: string }

    if (isFirebaseConfigured()) {
      return NextResponse.json({
        message:
          'La réinitialisation se fait via le lien sécurisé envoyé par email (Firebase). Ouvrez le lien reçu — il définit directement votre nouveau mot de passe.',
      })
    }

    if (!token || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Jeton invalide ou mot de passe trop court (8 caractères minimum).' }, { status: 400 })
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
    const record = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Ce lien de réinitialisation est invalide ou a expiré. Faites une nouvelle demande.' }, { status: 400 })
    }

    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash: hashPassword(password) },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Sécurité : plus aucun autre lien actif pour ce compte
      db.passwordResetToken.updateMany({
        where: { userId: record.userId, id: { not: record.id }, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' })
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error)
    return NextResponse.json({ error: 'Erreur lors de la réinitialisation.' }, { status: 500 })
  }
}

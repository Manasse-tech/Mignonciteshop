import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions, signSession, hashPassword } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { REGISTER_CREATE, firstIssue } from '@/lib/validators'
import { isFirebaseConfigured, fbSignUp, fbSendVerifyEmail } from '@/lib/firebase'
import { findUserByEmail, createUser } from '@/lib/backend'

// POST /api/auth/register — création de compte client (rôle « user »).
// L'original Base44 imposait un compte pour panier/checkout/commandes/avis ;
// ce comportement est restauré (décision utilisateur).
//
// Backend double :
//  - FIREBASE configuré → compte créé dans Firebase Auth + profil Firestore,
//    avec email de vérification GRATUIT envoyé par l'infrastructure Firebase
//    (zéro SMTP à configurer — l'équivalent de l'OTP natif de Base44) ;
//    miroir local silencieux (même identifiant) pour la bascule inverse.
//  - sinon              → compte local (scrypt), comme avant.
export async function POST(req: NextRequest) {
  try {
    // Anti-abus : 5 inscriptions / minute / IP
    if (!rateLimit(clientKey(req, 'register'), 5)) return tooManyRequests()

    const parsed = REGISTER_CREATE.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 })
    }
    const { name, email, password } = parsed.data
    const normalizedEmail = email.toLowerCase()

    const existing = await findUserByEmail(normalizedEmail)
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 409 },
      )
    }

    // ==================== MODE FIREBASE ====================
    if (isFirebaseConfigured()) {
      const su = await fbSignUp(normalizedEmail, password)
      if (!su.ok) {
        if (su.code === 'EMAIL_EXISTS') {
          return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
        }
        console.error('[register] Firebase signUp:', su.code)
        return NextResponse.json(
          { error: 'Création du compte impossible — réessayez' },
          { status: 502 },
        )
      }
      // Email de vérification (infrastructure Firebase — gratuit, aucune clé SMTP)
      if (su.idToken) void fbSendVerifyEmail(su.idToken)

      const row = await createUser({
        name,
        email: normalizedEmail,
        passwordHash: hashPassword(password), // conservé localement (bascule inverse)
        role: 'user',
        firebaseUid: su.localId ?? null,
        emailVerified: false,
      })
      const sessionUser = {
        uid: row.id,
        email: row.email,
        name: row.name,
        role: 'user' as const,
      }
      // Connexion immédiate après inscription (même UX que l'original)
      const res = NextResponse.json({ user: sessionUser }, { status: 201 })
      res.cookies.set(SESSION_COOKIE, signSession(sessionUser), sessionCookieOptions())
      return res
    }

    // ==================== MODE LOCAL (Firebase non configuré) ====================
    const row = await createUser({
      name,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: 'user',
    })
    const sessionUser = {
      uid: row.id,
      email: row.email,
      name: row.name,
      role: 'user' as const,
    }
    const res = NextResponse.json({ user: sessionUser }, { status: 201 })
    res.cookies.set(SESSION_COOKIE, signSession(sessionUser), sessionCookieOptions())
    return res
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

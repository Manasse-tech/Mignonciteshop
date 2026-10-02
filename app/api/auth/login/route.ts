import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifyPassword } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import {
  isFirebaseConfigured,
  fbSignIn,
  fbSignUp,
  firebaseAuthAdmin,
} from '@/lib/firebase'
import {
  findLocalUserByEmail,
  ensureFirebaseProfile,
  findUserByEmail,
} from '@/lib/backend'

// POST /api/auth/login — connexion (credentials email + mot de passe)
//
// Backend double :
//  - FIREBASE configuré  → Firebase Auth (Identity Toolkit REST, côté serveur).
//    Les comptes créés avant la bascule sont automatiquement « re-parentés » :
//    premier login validé localement (scrypt SQLite) → création du compte
//    Firebase avec LE MÊME mot de passe + profil Firestore au MÊME identifiant
//    (l'historique de commandes reste lié) — zéro friction pour l'utilisateur.
//  - sinon               → auth locale (scrypt + cookie signé), comme avant.
export async function POST(req: NextRequest) {
  try {
    // Anti brute-force : 8 tentatives / minute / IP
    if (!rateLimit(clientKey(req, 'login'), 8)) return tooManyRequests()

    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    // ==================== MODE FIREBASE ====================
    if (isFirebaseConfigured()) {
      const r = await fbSignIn(email, password)
      if (r.ok && r.localId) {
        // Compte Auth connu : profil Firestore garanti (re-parent local si besoin)
        const profile = await ensureFirebaseProfile({
          email,
          firebaseUid: r.localId,
          emailVerified: true,
        })
        const sessionUser = {
          uid: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role === 'admin' ? ('admin' as const) : ('user' as const),
        }
        const res = NextResponse.json({ user: sessionUser })
        res.cookies.set(SESSION_COOKIE, signSession(sessionUser), sessionCookieOptions())
        return res
      }

      // Compte absent de Firebase Auth (créé avant la bascule) : le mot de passe
      // est vérifié contre le compte local historique puis le compte est
      // transféré dans Firebase avec le même mot de passe.
      const local = await findLocalUserByEmail(email)
      if (local && verifyPassword(password, local.passwordHash)) {
        const su = await fbSignUp(email, password)
        if (su.ok && su.localId) {
          // Compte confirmé sans email (miroir admin — pas de rate limit SMTP)
          try {
            await firebaseAuthAdmin()?.updateUser(su.localId, { emailVerified: true })
          } catch {
            // non bloquant : la connexion locale a déjà validé l'identité
          }
          const profile = await ensureFirebaseProfile({
            email,
            name: local.name,
            role: local.role === 'admin' ? 'admin' : 'user',
            firebaseUid: su.localId,
            passwordHash: local.passwordHash,
            emailVerified: true,
          })
          // Liaison locale best-effort (bascule inverse possible)
          db.user
            .update({ where: { id: local.id }, data: { supabaseUserId: su.localId } })
            .catch(() => {})
          const sessionUser = {
            uid: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role === 'admin' ? ('admin' as const) : ('user' as const),
          }
          const res = NextResponse.json({ user: sessionUser })
          res.cookies.set(SESSION_COOKIE, signSession(sessionUser), sessionCookieOptions())
          return res
        }
      }
      // Message générique volontaire (pas d'énumération de comptes)
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    // ==================== MODE LOCAL (Firebase non configuré) ====================
    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }
    // Cohérence : si le compte local a déjà un profil Firebase (bascule inverse),
    // on ne touche à rien — la session locale suffit.
    void findUserByEmail(email).catch(() => null)

    const sessionUser = {
      uid: user.id,
      email: user.email,
      name: user.name,
      role: user.role === 'admin' ? ('admin' as const) : ('user' as const),
    }
    const res = NextResponse.json({ user: sessionUser })
    res.cookies.set(SESSION_COOKIE, signSession(sessionUser), sessionCookieOptions())
    return res
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

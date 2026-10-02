import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Authentification serveur — sessions par cookie httpOnly signé (HMAC-SHA256).
 *
 * NB d'architecture : NextAuth v4 (installé) a été écarté à l'exécution car il
 * n'est pas compatible avec l'accès asynchrone aux cookies de Next 16. Cette
 * implémentation minimaliste offre les mêmes garanties pour un provider
 * "Credentials" : mot de passe scrypté, cookie httpOnly introuvable côté JS,
 * signature HMAC côté serveur uniquement, expiration, vérification timing-safe.
 * Sessions relues en base via la couche backend double (Firebase ou local).
 */

export const SESSION_COOKIE = 'mcs_session'
const SESSION_TTL_S = 60 * 60 * 24 * 7 // 7 jours

// Secret : variable d'environnement obligatoire en production. En dev, un
// fallback constant évite le crash mais invalide les sessions à chaque redémarrage.
const AUTH_SECRET =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-only-secret-mignoncite-shop'
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn('[auth] AUTH_SECRET manquant — sessions non persistantes (mode dev)')
}

export interface SessionUser {
  uid: string
  email: string
  name: string
  role: 'admin' | 'user'
}

// ---------------------------------------------------------------------------
// Mots de passe (scrypt, format "s1$<salt hex>$<hash hex>")
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `s1$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [version, saltHex, hashHex] = stored.split('$')
    if (version !== 's1' || !saltHex || !hashHex) return false
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Jetons de session signés (payload base64url + HMAC)
// ---------------------------------------------------------------------------

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')

function hmac(payload: string): string {
  return b64url(createHmac('sha256', AUTH_SECRET).update(payload).digest())
}

export function signSession(user: SessionUser): string {
  const payload = b64url(
    JSON.stringify({
      ...user,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S,
    }),
  )
  return `${payload}.${hmac(payload)}`
}

export function verifySession(token: string | undefined | null): SessionUser | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = hmac(payload)
  // Comparaison timing-safe (longueurs normalisées)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(fromB64url(payload)) as SessionUser & { exp: number }
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null
    if (!data.uid || !data.email || (data.role !== 'admin' && data.role !== 'user')) return null
    return { uid: data.uid, email: data.email, name: data.name, role: data.role }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers pour les Route Handlers
// ---------------------------------------------------------------------------

export function getSessionUser(req: NextRequest): SessionUser | null {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value)
}

/** Réponse 401 prête à retourner quand la requête n'est pas authentifiée. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
}

/** Réponse 403 prête à retourner quand la session n'est pas admin. */
export function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}

/**
 * Garde d'autorisation admin pour les Route Handlers.
 * Usage : `const denied = requireAdmin(req); if (denied) return denied;`
 * Retourne null si l'utilisateur est admin authentifié, sinon la réponse d'erreur.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const user = getSessionUser(req)
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()
  return null
}

// ---------------------------------------------------------------------------
// Revalidation en base (source de vérité) — un cookie signé reste valide tant
// qu'il n'expire pas ; sans relecture, un compte supprimé ou rétrogradé
// conserverait ses droits jusqu'à la fin du TTL. Les gardes « live » relisent
// le compte avant toute décision d'autorisation.
// ---------------------------------------------------------------------------

/** Session signée + compte réellement présent en base (rôle relus de la DB).
 *  Backend double : Firestore (Firebase) ou SQLite local selon la configuration. */
export async function getSessionUserLive(req: NextRequest): Promise<SessionUser | null> {
  const signed = getSessionUser(req)
  if (!signed) return null
  try {
    const { findUserById } = await import('@/lib/backend')
    const row = await findUserById(signed.uid)
    if (!row) return null // compte supprimé → session morte
    return { uid: row.id, email: row.email, name: row.name, role: row.role === 'admin' ? 'admin' : 'user' }
  } catch {
    return null // base indisponible : on ne présume pas des droits
  }
}

/** Garde admin avec revalidation DB (compte présent + rôle admin relus). */
export async function requireAdminLive(req: NextRequest): Promise<NextResponse | null> {
  const user = await getSessionUserLive(req)
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()
  return null
}

/** Options du cookie de session. */
export function sessionCookieOptions(maxAge: number = SESSION_TTL_S) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_INSECURE_COOKIE !== '1',
    path: '/',
    maxAge,
  }
}

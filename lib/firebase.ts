import 'server-only'

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from 'firebase-admin/auth'

/**
 * ===== Backend Firebase (SDK officiel firebase-admin) =====
 *
 * Remplace le backend local + le miroir Supabase (supprimés sur demande utilisateur).
 *
 * Configuration — DEUX variables d'environnement SERVEUR uniquement :
 *  - FIREBASE_API_KEY         : clé Web API (Console Firebase → Paramètres du projet → Général)
 *  - FIREBASE_SERVICE_ACCOUNT : JSON du compte de service SUR UNE LIGNE
 *                               (Paramètres du projet → Comptes de service → Générer une
 *                               nouvelle clé privée → coller le contenu JSON complet)
 *
 * RÈGLES DE SÉCURITÉ (non négociables) :
 *  - ce module est 'server-only' : JAMAIS importé par le code navigateur ;
 *  - la clé API et le JSON du compte de service ne quittent JAMAIS le serveur
 *    (aucune réponse API ne les contient, aucun préfixe NEXT_PUBLIC_) ;
 *  - le navigateur continue de parler UNIQUEMENT aux routes /api/* de l'app,
 *    qui servent d'interface — le contrat frontend reste identique ;
 *  - si les variables sont absentes, l'app continue de fonctionner sur le
 *    backend local (Prisma/SQLite) : bascule automatique sans intervention.
 */

export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_API_KEY && process.env.FIREBASE_SERVICE_ACCOUNT)
}

export function firebaseProjectId(): string | null {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '{}')
    return sa.project_id ?? null
  } catch {
    return null
  }
}

let cachedApp: { app: App; db: Firestore; auth: Auth } | null = null

/** App admin Firebase (initialisée une seule fois) — null si non configuré. */
export function getFirebaseAdmin(): { app: App; db: Firestore; auth: Auth } | null {
  if (!isFirebaseConfigured()) return null
  if (cachedApp) return cachedApp
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string)
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      })
      console.log('[firebase] initialisé — projet', serviceAccount.project_id)
    }
    const app = getApps()[0]
    cachedApp = { app, db: getFirestore(app), auth: getAuth(app) }
    return cachedApp
  } catch (e) {
    console.error('[firebase] init impossible:', e instanceof Error ? e.message : e)
    return null
  }
}

/** Client Auth admin (confirmation de comptes sans email, reset, etc.). */
export function firebaseAuthAdmin(): Auth | null {
  return getFirebaseAdmin()?.auth ?? null
}

// ---------------------------------------------------------------------------
// Identité Firebase Auth — Identity Toolkit REST (clé Web API, côté serveur)
// ---------------------------------------------------------------------------

const IDP = 'https://identitytoolkit.googleapis.com/v1/accounts'

interface IdpResult {
  ok: boolean
  status: number
  data: {
    localId?: string
    idToken?: string
    email?: string
    error?: { message?: string }
  }
}

async function idp(action: string, body: Record<string, unknown>): Promise<IdpResult> {
  try {
    const res = await fetch(`${IDP}:${action}?key=${process.env.FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as IdpResult['data']
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    console.warn('[firebase] idp', action, ':', e instanceof Error ? e.message : e)
    return { ok: false, status: 0, data: {} }
  }
}

/** Connexion email + mot de passe → { localId, idToken } ou code d'erreur. */
export async function fbSignIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; localId?: string; idToken?: string; code?: string }> {
  const r = await idp('signInWithPassword', { email, password, returnSecureToken: true })
  if (r.ok) return { ok: true, localId: r.data.localId, idToken: r.data.idToken }
  return { ok: false, code: r.data.error?.message ?? 'UNKNOWN' }
}

/** Création d'un compte Auth (mot de passe déjà validé par l'app). */
export async function fbSignUp(
  email: string,
  password: string,
): Promise<{ ok: boolean; localId?: string; idToken?: string; code?: string }> {
  const r = await idp('signUp', { email, password, returnSecureToken: true })
  if (r.ok) return { ok: true, localId: r.data.localId, idToken: r.data.idToken }
  return { ok: false, code: r.data.error?.message ?? 'UNKNOWN' }
}

/** Envoi de l'email de vérification (infrastructure Firebase — gratuit, zéro SMTP). */
export async function fbSendVerifyEmail(idToken: string): Promise<boolean> {
  const r = await idp('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken })
  return r.ok
}

/** Envoi de l'email de réinitialisation de mot de passe (gratuit, zéro SMTP). */
export async function fbSendPasswordReset(email: string): Promise<boolean> {
  const r = await idp('sendOobCode', { requestType: 'PASSWORD_RESET', email })
  return r.ok
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/** Génère un identifiant compatible cuid (même forme que ceux de Prisma). */
export function fbId(): string {
  return `cm${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export const nowISO = (): string => new Date().toISOString()

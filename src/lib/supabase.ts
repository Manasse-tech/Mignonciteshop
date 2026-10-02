import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * ===== Intégration Supabase — client navigateur =====
 *
 * Architecture (respect des contraintes utilisateur) :
 *  - Seule la clé PUBLIQUE (anon) est utilisée, ici comme partout. Elle est
 *    conçue par Supabase pour être exposée côté navigateur : la sécurité est
 *    garantie par les politiques Row Level Security (RLS) définies dans
 *    supabase/schema.sql, JAMAIS par le secret de la clé.
 *  - AUCUNE service_role key n'est présente dans ce projet (ni client ni
 *    serveur). Le serveur continue d'utiliser Prisma (DATABASE_URL) qui
 *    contourne la RLS par connexion directe — modèle standard
 *    « backend externe + Supabase ».
 *
 * Rôle de ce module : synchroniser les identités entre le système local
 * (cookie HMAC, source de vérité de l'application) et Supabase Auth :
 *   - inscription → signUp Supabase (miroir) + profil public "User"
 *   - connexion   → signInWithPassword (auto-création du miroir pour les
 *     comptes créés avant l'intégration, avec le mot de passe saisi)
 *   - déconnexion → signOut
 *
 * TOUTES les opérations sont « best effort » : si Supabase est injoignable,
 * non configuré ou lent, l'application locale continue de fonctionner
 * normalement (timeout + erreurs avalées + console.warn).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

let browserClient: SupabaseClient | null = null

/** Client unique côté navigateur (null si Supabase non configuré). */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!SUPABASE_CONFIGURED) return null
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: {
        persistSession: true, // session Supabase (localStorage) — active les lectures directes sous RLS
        autoRefreshToken: true,
        detectSessionInUrl: false, // le SPA route par ?page=... — pas d'OAuth callback à analyser
      },
    })
  }
  return browserClient
}

/** Course contre la montre : null si l'opération dépasse `ms` (jamais bloquante). */
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

/**
 * Crée le miroir du compte dans Supabase Auth.
 * Retourne l'UID Supabase (uuid) ou null — n'échoue jamais.
 */
export async function supabaseSignUp(
  name: string,
  email: string,
  password: string,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return null
  const result = await withTimeout(
    supabase.auth.signUp({
      email,
      password,
      options: { data: { name, app: 'mignonciteshop' } },
    }),
    6000,
  )
  if (!result) {
    console.warn('[supabase] signUp : pas de réponse (timeout) — inscription locale conservée')
    return null
  }
  const { data, error } = result
  if (error) {
    // Email déjà présent dans Supabase Auth (recréation d'un compte existant) :
    // non bloquant, la connexion miroir se fera à la prochaine connexion.
    console.warn('[supabase] signUp :', error.message)
    return null
  }
  return data.user?.id ?? null
}

/**
 * Connexion miroir à Supabase Auth. Si le compte n'existe pas encore côté
 * Supabase (comptes créés avant l'intégration), le miroir est créé avec le
 * mot de passe saisi — qui vient d'être validé par l'API locale.
 * Retourne l'UID Supabase (uuid) ou null — n'échoue jamais.
 */
export async function supabaseSignIn(email: string, password: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return null
  const result = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 6000)
  if (!result) {
    console.warn('[supabase] signIn : pas de réponse (timeout)')
    return null
  }
  const { data, error } = result
  if (!error) return data.user?.id ?? null

  if (error.status === 400) {
    // Identifiants inconnus de Supabase → création du miroir (best effort)
    const uid = await supabaseSignUp('', email, password)
    if (!uid) console.warn('[supabase] miroir du compte impossible :', error.message)
    return uid
  }
  console.warn('[supabase] signIn :', error.message)
  return null
}

/** Déconnexion miroir Supabase (best effort). */
export async function supabaseSignOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return
  await withTimeout(supabase.auth.signOut(), 3000)
}

/**
 * Crée la ligne de profil publique (table "User") dans la base Supabase.
 * Nécessite le SQL de supabase/schema.sql (politique INSERT « son propre
 * profil »). Un échec (SQL pas encore exécuté, email à confirmer, conflit
 * d'unicité) est silencieux : le profil se recréera à la prochaine connexion.
 */
export async function supabaseEnsureProfile(user: {
  id: string
  email: string
  name: string
  supabaseUserId: string | null
}): Promise<void> {
  if (!user.supabaseUserId) return
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return
  type InsertResult = { error: { message: string; code: string | null } | null } | null
  const result = (await withTimeout(
    supabase.from('User').insert({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'user',
      supabaseUserId: user.supabaseUserId,
    }),
    5000,
  )) as InsertResult
  if (!result) return
  const { error } = result
  // 23505 = violation d'unicité (profil déjà miroir) → comportement attendu
  if (error && error.code !== '23505') {
    console.warn('[supabase] profil public (SQL Supabase exécuté ?) :', error.message)
  }
}

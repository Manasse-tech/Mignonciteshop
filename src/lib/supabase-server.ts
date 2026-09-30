import 'server-only'

import { createAdminClient } from '@supabase/server/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'

/**
 * ===== Miroir Supabase côté SERVEUR (SDK officiel @supabase/server) =====
 *
 * Le package @supabase/server (v1.6.1, Demandé explicitement par l'utilisateur)
 * lit SUPABASE_URL + SUPABASE_SECRET_KEY depuis l'environnement du serveur et
 * fournit un client admin qui contourne la RLS — l'équivalent serveur de la
 * clé service_role, au nouveau format de clés Supabase.
 *
 * RÈGLES DE SÉCURITÉ (non négociables) :
 *  - ce module est 'server-only' : JAMAIS importé par le code navigateur ;
 *  - la clé secrète ne quitte JAMAIS le serveur (aucune réponse API ne la
 *    contient, aucun NEXT_PUBLIC_) ;
 *  - le navigateur continue d'utiliser la clé PUBLIQUE (RLS active).
 *
 * Rôle : rendre le miroir des comptes fiable et indépendant du navigateur —
 * création confirmée via l'API admin (pas de SMTP, pas de rate limit), ligne
 * de profil publique "User" (une fois supabase/schema.sql exécuté) et liaison
 * supabaseUserId du compte local.
 */

export function getSupabaseAdmin(): SupabaseClient | null {
  try {
    // Lève une EnvError si les variables serveur sont absentes → null
    return createAdminClient()
  } catch {
    return null
  }
}

/** Recherche l'UID Supabase d'un email (scan paginé — base < 1000 comptes). */
async function findUidByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const users = data?.users ?? []
    const hit = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
    if (hit) return hit.id
    if (users.length < 200) return null
  }
  return null
}

export interface SupabaseMirrorInput {
  /** id du compte local (clé primaire de la ligne "User" publique) */
  id: string
  email: string
  name: string
  /** mot de passe DÉJÀ validé par l'app locale (création/alignement du miroir) */
  password?: string
  role: 'admin' | 'user'
  /** uid éventuellement fourni par le miroir navigateur (signUp anon) */
  hintUid?: string | null
}

async function doSync(input: SupabaseMirrorInput): Promise<void> {
  const admin = getSupabaseAdmin()
  if (!admin) return // Supabase non configuré : l'app locale fonctionne seule

  // 1. Déterminer l'UID Supabase (indice navigateur → recherche → création)
  let uid = input.hintUid ?? (await findUidByEmail(admin, input.email))
  if (!uid && input.password) {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true, // pas d'email, pas de rate limit : confirmation directe
      user_metadata: { name: input.name, app: 'mignonciteshop' },
    })
    if (!error) {
      uid = data.user?.id ?? null
    } else {
      // 422 « déjà enregistré » (miroir créé entre-temps par le navigateur) → re-recherche
      uid = await findUidByEmail(admin, input.email)
    }
  }
  if (!uid) {
    console.warn('[supabase-server] miroir incomplet pour', input.email)
    return
  }

  // 2. Compte préexistant non confirmé (créé par le navigateur quand la
  //    confirmation email est active) → confirmation admin + alignement mdp
  try {
    const { data: fetched } = await admin.auth.admin.getUserById(uid)
    if (fetched?.user && !fetched.user.email_confirmed_at) {
      await admin.auth.admin.updateUserById(uid, {
        email_confirm: true,
        ...(input.password ? { password: input.password } : {}),
      })
    }
  } catch (e) {
    console.warn('[supabase-server] confirmation:', e instanceof Error ? e.message : e)
  }

  // 3. Ligne de profil publique "User" (idempotent — échoue proprement tant
  //    que supabase/schema.sql n'a pas été exécuté dans le dashboard)
  try {
    const { error } = await admin.from('User').upsert(
      {
        id: input.id,
        email: input.email,
        name: input.name,
        role: input.role,
        supabaseUserId: uid,
      },
      { onConflict: 'id' },
    )
    if (error) console.warn('[supabase-server] profil "User" (SQL exécuté ?) :', error.message)
  } catch (e) {
    console.warn('[supabase-server] profil:', e instanceof Error ? e.message : e)
  }

  // 4. Lier le compte local à l'UID (rend les politiques RLS « own » opérationnelles)
  if (input.hintUid !== uid) {
    try {
      await db.user.update({ where: { id: input.id }, data: { supabaseUserId: uid } })
    } catch (e) {
      console.warn('[supabase-server] liaison locale:', e instanceof Error ? e.message : e)
    }
  }
}

/**
 * Synchronisation miroir avec garde-fou de temps : ne JAMAIS ralentir ni
 * casser l'authentification locale (toute erreur est avalée et tracée).
 */
export function syncSupabaseMirror(input: SupabaseMirrorInput): Promise<void> {
  return Promise.race([
    doSync(input).catch((e) => console.warn('[supabase-server] miroir:', e instanceof Error ? e.message : e)),
    new Promise<void>((resolve) => setTimeout(resolve, 6000)),
  ])
}

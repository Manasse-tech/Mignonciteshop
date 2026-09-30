import { create } from 'zustand'

/**
 * Session côté client — alimentée par /api/auth/session (cookie httpOnly).
 * Le rôle n'est JAMAIS décisionnaire côté client : ce store ne pilote que
 * l'affichage (la vraie autorisation est vérifiée serveur dans chaque route).
 *
 * Backend Firebase : toute l'identité (Auth Firebase + profils Firestore) est
 * gérée SERVEUR par les routes /api/auth/* — le navigateur ne manipule jamais
 * de clés Firebase, il parle uniquement à nos API.
 */
export interface AdminUser {
  uid: string
  email: string
  name: string
  role: 'admin' | 'user'
}

type AuthStatus = 'loading' | 'anon' | 'authed'

interface AdminAuthState {
  user: AdminUser | null
  status: AuthStatus
  fetchSession: () => Promise<void>
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  status: 'loading',

  fetchSession: async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' })
      const data = await res.json()
      set({ user: data.user ?? null, status: data.user ? 'authed' : 'anon' })
    } catch {
      set({ user: null, status: 'anon' })
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, error: data.error || 'Échec de la connexion' }
      }
      set({ user: data.user, status: 'authed' })
      return { ok: true }
    } catch {
      return { ok: false, error: 'Erreur réseau — réessayez' }
    }
  },

  register: async (name, email, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, error: data.error || 'Impossible de créer le compte' }
      }
      set({ user: data.user, status: 'authed' })
      return { ok: true }
    } catch {
      return { ok: false, error: 'Erreur réseau — réessayez' }
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Cookie purgé côté serveur même si la réponse échoue ; on force l'état local
    }
    set({ user: null, status: 'anon' })
  },
}))

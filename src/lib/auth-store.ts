"use client";

/**
 * Store d'authentification global (zustand, non persisté — la session
 * vit dans un cookie httpOnly que le JS ne peut pas lire).
 *
 * `hydrate()` interroge /api/auth/session une seule fois par montage
 * d'application ; les pages de login / le header / l'admin partagent
 * le même état.
 */

import { create } from "zustand";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: string; // customer | admin
}

interface AuthState {
  user: AuthUser | null;
  /** true après la première vérification de session. */
  ready: boolean;
  setUser: (user: AuthUser | null) => void;
  /** Vérifie la session auprès du serveur (idempotent). */
  hydrate: () => Promise<void>;
  /** Déconnexion : révoque la session serveur + réinitialise l'état. */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,

  setUser: (user) => set({ user, ready: true }),

  hydrate: async () => {
    try {
      // AbortController : une session qui pend (réseau/HMR) ne doit jamais
      // bloquer l'interface indéfiniment — au pire on considère déconnecté.
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("/api/auth/session", { signal: ctrl.signal });
      clearTimeout(timeout);
      const data = (await res.json()) as { user: AuthUser | null };
      set({ user: data.user ?? null, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // La session est réinitialisée côté client dans tous les cas.
    }
    set({ user: null, ready: true });
  },
}));

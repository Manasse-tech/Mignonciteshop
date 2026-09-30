'use client'

import { useState } from 'react'
import { Loader2, Lock, Store } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminAuthStore } from '@/store/useAdminAuthStore'
import { useShopStore } from '@/store/useShopStore'

/**
 * Écran de connexion de l'espace administrateur (audit S2).
 * Affiché par AdminShell tant qu'aucune session admin valide n'existe —
 * les deep-links ?page=admin-* ne permettent plus de contourner la connexion.
 */
export default function AdminLogin() {
  const login = useAdminAuthStore((s) => s.login)
  const navigate = useShopStore((s) => s.navigate)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setPending(true)
    const result = await login(email, password)
    if (!result.ok) setError(result.error || 'Email ou mot de passe incorrect')
    setPending(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Entête noir + or, identique à la sidebar admin */}
          <div className="bg-black text-white p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C9A961]/15 mb-4">
              <Lock className="w-7 h-7 text-[#C9A961]" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-wide">
              <span className="text-white">MIGNONCITE</span>
              <span className="text-[#C9A961]">SHOP</span>
            </h1>
            <p className="text-xs text-gray-500 mt-2">Espace administrateur — accès restreint</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                placeholder="admin@mignonciteshop.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Mot de passe</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full h-12 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {pending ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <button
          onClick={() => navigate('home')}
          className="mt-6 mx-auto flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Store className="w-4 h-4" aria-hidden="true" />
          Retour à la boutique
        </button>
      </div>
    </div>
  )
}

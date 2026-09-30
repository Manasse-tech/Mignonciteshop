'use client'

import { useEffect, useState } from 'react'
import { Loader2, LogIn, UserPlus, Store, Check, KeyRound, ArrowLeft, MailCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminAuthStore } from '@/store/useAdminAuthStore'
import { useShopStore } from '@/store/useShopStore'
import { useToast } from '@/hooks/use-toast'
import { mergeLocalCartIntoServer } from '@/lib/cartSync'
import usePageMeta from '@/hooks/usePageMeta'
import type { PageName } from '@/lib/types'

/**
 * Page Connexion / Inscription — comptes clients et administrateur (même endpoint,
 * le rôle est décidé côté serveur). Restaure l'authentification obligatoire de
 * l'original Base44 : après connexion, le panier local invité est fusionné avec
 * la collection Cart du compte, puis retour à la page d'origine (returnTo).
 */
export default function AuthPage() {
  usePageMeta('Connexion — MignonciteShop', 'Connectez-vous à votre compte MignonciteShop pour accéder à votre panier, vos commandes et vos avis.')
  const { status, user, login, register, fetchSession } = useAdminAuthStore()
  const { navigate, params } = useShopStore()
  const { toast } = useToast()

  const [mode, setMode] = useState<'login' | 'register'>(params.mode === 'register' ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // ===== Mot de passe oublié / réinitialisation =====
  // ?page=login&reset=<token> (lien de l'email) → vue « reset » directement
  const [view, setView] = useState<'auth' | 'forgot' | 'reset' | 'reset-success'>(
    params.reset ? 'reset' : 'auth'
  )
  const [resetToken, setResetToken] = useState<string | null>(params.reset ?? null)
  const [newPassword, setNewPassword] = useState('')
  const [newConfirm, setNewConfirm] = useState('')
  const [resetPending, setResetPending] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const returnTo = (params.returnTo || 'home') as PageName

  // Session déjà ouverte (ou fraîchement créée) → redirection immédiate
  useEffect(() => {
    if (status === 'loading') fetchSession()
  }, [status, fetchSession])

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetPending) return
    setError(null)
    setResetPending(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setForgotSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setResetPending(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetPending || !resetToken) return
    setError(null)
    if (newPassword.length < 8) {
      setError('Mot de passe : 8 caractères minimum')
      return
    }
    if (newPassword !== newConfirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setResetPending(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Mot de passe mis à jour', description: 'Connectez-vous avec votre nouveau mot de passe.' })
        setView('reset-success')
      } else {
        setError(data.error || 'Lien invalide ou expiré.')
      }
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setResetPending(false)
    }
  }

  useEffect(() => {
    if (status === 'authed' && user && !pending) {
      navigate(returnTo)
    }
  }, [status, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)

    if (mode === 'register') {
      if (password !== confirm) {
        setError('Les mots de passe ne correspondent pas')
        return
      }
      if (password.length < 8) {
        setError('Mot de passe : 8 caractères minimum')
        return
      }
    }

    setPending(true)
    const result =
      mode === 'login' ? await login(email, password) : await register(name, email, password)

    if (!result.ok) {
      setError(result.error || 'Email ou mot de passe incorrect')
      setPending(false)
      return
    }

    // Fusion du panier invité local dans la collection Cart du compte
    await mergeLocalCartIntoServer()
    toast({
      title: mode === 'login' ? 'Connexion réussie' : 'Bienvenue !',
      description:
        mode === 'login'
          ? 'Votre panier a été synchronisé avec votre compte.'
          : 'Votre compte a été créé — votre panier vous suit partout.',
    })
    setPending(false)
    navigate(returnTo)
  }

  // ===== Vues « mot de passe oublié » / « réinitialisation » =====
  if (view === 'forgot') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-black text-white p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C9A961]/15 mb-4">
                <KeyRound className="w-7 h-7 text-[#C9A961]" aria-hidden="true" />
              </div>
              <h1 className="text-xl font-bold tracking-wide">Mot de passe oublié</h1>
              <p className="text-xs text-gray-400 mt-2">Nous vous envoyons un lien de réinitialisation sécurisé</p>
            </div>
            <div className="p-8 space-y-5">
              {forgotSent ? (
                <div role="status" className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40">
                    <MailCheck className="w-7 h-7 text-green-600" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    Si un compte existe pour <strong>{email}</strong>, un email avec un lien de
                    réinitialisation vient d'être envoyé. Il est valable 30 minutes.
                  </p>
                  <p className="text-xs text-muted-foreground">Pensez à vérifier votre dossier spam.</p>
                  <button
                    onClick={() => { setView('auth'); setForgotSent(false) }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#C9A961] hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Retour à la connexion
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Votre adresse email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={resetPending}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={resetPending}
                    className="w-full h-12 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {resetPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    Envoyer le lien de réinitialisation
                  </button>
                  <button
                    type="button"
                    onClick={() => { setView('auth'); setError(null) }}
                    className="w-full inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Retour à la connexion
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'reset' || view === 'reset-success') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-black text-white p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C9A961]/15 mb-4">
                {view === 'reset' ? (
                  <KeyRound className="w-7 h-7 text-[#C9A961]" aria-hidden="true" />
                ) : (
                  <MailCheck className="w-7 h-7 text-[#C9A961]" aria-hidden="true" />
                )}
              </div>
              <h1 className="text-xl font-bold tracking-wide">
                {view === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe mis à jour'}
              </h1>
              <p className="text-xs text-gray-400 mt-2">
                {view === 'reset' ? 'Choisissez un mot de passe robuste (8 caractères minimum)' : 'Vous pouvez dès à présent vous connecter'}
              </p>
            </div>
            <div className="p-8 space-y-5">
              {view === 'reset' ? (
                <form onSubmit={handleReset} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-password">Nouveau mot de passe</Label>
                    <Input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={resetPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="reset-confirm"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={newConfirm}
                      onChange={(e) => setNewConfirm(e.target.value)}
                      disabled={resetPending}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={resetPending}
                    className="w-full h-12 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {resetPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    Mettre à jour mon mot de passe
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <button
                    onClick={() => { setView('auth'); setPassword('') }}
                    className="w-full h-12 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white font-semibold transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" aria-hidden="true" /> Se connecter maintenant
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Entête noir + or, identité de la marque */}
          <div className="bg-black text-white p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C9A961]/15 mb-4">
              {mode === 'login' ? (
                <LogIn className="w-7 h-7 text-[#C9A961]" aria-hidden="true" />
              ) : (
                <UserPlus className="w-7 h-7 text-[#C9A961]" aria-hidden="true" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-wide">
              <span className="text-white">MIGNONCITE</span>
              <span className="text-[#C9A961]">SHOP</span>
            </h1>
            <p className="text-xs text-gray-400 mt-2">
              {mode === 'login'
                ? 'Connectez-vous pour accéder à votre panier et vos commandes'
                : 'Créez votre compte en moins d\u2019une minute'}
            </p>
          </div>

          {/* Bascule Connexion / Inscription */}
          <div className="grid grid-cols-2 border-b border-border" role="tablist" aria-label="Connexion ou inscription">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={`py-3.5 text-sm font-semibold transition-colors ${
                  mode === m
                    ? 'text-[#C9A961] border-b-2 border-[#C9A961] bg-[#C9A961]/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Nom complet</Label>
                <Input
                  id="auth-name"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Mot de passe</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'register' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
              {mode === 'register' && (
                <p className="text-xs text-muted-foreground">8 caractères minimum</p>
              )}
            </div>
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="auth-confirm">Confirmer le mot de passe</Label>
                <Input
                  id="auth-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={pending}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setError(null) }}
                  className="text-sm text-[#C9A961] hover:underline underline-offset-2"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full h-12 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {pending
                ? mode === 'login'
                  ? 'Connexion…'
                  : 'Création…'
                : mode === 'login'
                  ? 'Se connecter'
                  : 'Créer mon compte'}
            </button>

            {mode === 'register' && (
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                Gratuit — vos avantages fidélité sont conservés sur votre compte
              </p>
            )}
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

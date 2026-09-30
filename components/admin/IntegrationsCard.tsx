'use client'

import { useEffect, useState } from 'react'
import { Flame, Database, Send, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react'

/**
 * Carte « Intégrations » du tableau de bord admin — état réel, jamais de secret :
 *  - Backend actif : Firebase (Firestore + Auth) ou local de secours (SQLite)
 *  - Firestore : joignable ? collections et volumes ?
 *  - Firebase Auth : clé Web API valide ? (Identity Toolkit)
 *  - Emails : mode Resend (envois réels) ou boîte d'attente (outbox)
 */

interface IntegrationsState {
  backend: 'firebase' | 'local'
  firebase: { configured: boolean; projectId: string | null; serviceAccountSet: boolean; apiKeySet: boolean }
  firestore: { reachable: boolean | null; collections: Record<string, number> | null }
  auth: { reachable: boolean | null; apiKeyValid: boolean | null }
  email: { mode: 'resend' | 'outbox'; from: string }
}

function StatusDot({ tone }: { tone: 'ok' | 'warn' | 'ko' | 'idle' }) {
  const colors = {
    ok: 'bg-green-500',
    warn: 'bg-amber-500',
    ko: 'bg-red-500',
    idle: 'bg-gray-400',
  } as const
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[tone]}`} aria-hidden="true" />
}

const COLLECTION_LABELS: Record<string, string> = {
  products: 'Produits',
  categories: 'Catégories',
  orders: 'Commandes',
  users: 'Comptes',
  promoCodes: 'Codes promo',
  contactMessages: 'Messages',
}

export default function IntegrationsCard() {
  const [state, setState] = useState<IntegrationsState | null>(null)
  const [loading, setLoading] = useState(true)

  // Chargement initial sans setState synchrone dans l'effet
  // (règle react-hooks/set-state-in-effect)
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/integrations', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((data: IntegrationsState) => {
        if (!cancelled) setState(data)
      })
      .catch(() => {
        if (!cancelled) setState(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fb = state?.firebase
  const fs = state?.firestore
  const auth = state?.auth
  const email = state?.email

  const firebaseOnline = Boolean(state?.backend === 'firebase' && fs?.reachable)
  const firebaseTone: 'ok' | 'warn' | 'ko' | 'idle' = !fb?.configured
    ? 'idle'
    : fs?.reachable === true
      ? 'ok'
      : fs?.reachable === false
        ? 'ko'
        : 'idle'
  const firebaseLabel = !fb?.configured
    ? 'Non configuré'
    : fs?.reachable === true
      ? `Connecté · ${fb.projectId ?? 'projet'}`
      : fs?.reachable === false
        ? 'Injoignable'
        : 'Vérification…'

  const collections = fs?.collections
  const tablesOk = Boolean(firebaseOnline && collections && Object.values(collections).some((c) => c > 0))
  const dbTone: 'ok' | 'warn' | 'ko' | 'idle' = !firebaseOnline ? 'idle' : tablesOk ? 'ok' : 'warn'
  const dbLabel = !firebaseOnline
    ? '…'
    : tablesOk
      ? `Connectée · ${Object.entries(collections ?? {}).filter(([, v]) => v > 0).length} collections actives`
      : 'Vide — importez vos données'

  const authTone: 'ok' | 'warn' | 'ko' | 'idle' = !fb?.configured ? 'idle' : auth?.apiKeyValid ? 'ok' : 'ko'
  const authLabel = !fb?.configured
    ? 'Non configuré'
    : auth?.apiKeyValid
      ? 'Firebase Auth opérationnel'
      : 'Clé Web API invalide'

  const emailTone: 'ok' | 'warn' | 'idle' = email?.mode === 'resend' ? 'ok' : email?.mode === 'outbox' ? 'warn' : 'idle'
  const emailLabel = email?.mode === 'resend' ? 'Envois réels (Resend)' : email?.mode === 'outbox' ? "Boîte d'attente prête" : '…'

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Flame className="w-5 h-5 text-amber-500 flex-shrink-0" aria-hidden="true" />
          <h3 className="font-semibold text-zinc-900 truncate">Backend Firebase</h3>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
          aria-label="Rafraîchir l'état des intégrations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-2.5">
          <StatusDot tone={firebaseTone} />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-zinc-800">Projet Firebase</span>
            <span className="text-zinc-500"> — {firebaseLabel}</span>
            {fb?.configured && (
              <div className="mt-1 text-xs text-zinc-500 flex flex-wrap gap-x-3">
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="w-3 h-3" aria-hidden="true" /> Clé API {fb.apiKeySet ? 'présente' : 'absente'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" /> Compte de service {fb.serviceAccountSet ? 'présent' : 'absent'}
                </span>
              </div>
            )}
          </div>
        </li>

        <li className="flex items-start gap-2.5">
          <StatusDot tone={dbTone} />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-zinc-800">Base Firestore</span>
            <span className="text-zinc-500"> — {dbLabel}</span>
            {firebaseOnline && collections && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {Object.entries(collections).map(([name, count]) => (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      count > 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                    }`}
                  >
                    <Database className="w-3 h-3" aria-hidden="true" />
                    {COLLECTION_LABELS[name] ?? name} · {count >= 0 ? count : '—'}
                  </span>
                ))}
              </div>
            )}
            {!firebaseOnline && fb?.configured === false && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 leading-relaxed">
                <p className="font-semibold mb-0.5">Action requise (2 min) — activer Firebase :</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>
                    console.firebase.google.com → créez un projet (Analytics facultatif)
                  </li>
                  <li>
                    Paramètres du projet → Général → <strong>clé Web API</strong> → variable{' '}
                    <code className="bg-amber-100 rounded px-1">FIREBASE_API_KEY</code>
                  </li>
                  <li>
                    Paramètres → Comptes de service → <strong>Générer une clé privée</strong> → contenu JSON sur
                    une ligne → variable <code className="bg-amber-100 rounded px-1">FIREBASE_SERVICE_ACCOUNT</code>
                  </li>
                  <li>Redémarrez — la bascule Firebase est automatique, le frontend ne change pas.</li>
                </ol>
              </div>
            )}
          </div>
        </li>

        <li className="flex items-start gap-2.5">
          <StatusDot tone={authTone} />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-zinc-800">Authentification</span>
            <span className="text-zinc-500"> — {authLabel}</span>
            {auth?.apiKeyValid && (
              <p className="mt-1 text-xs text-zinc-500">
                Emails de vérification et de réinitialisation envoyés gratuitement par Firebase (aucun SMTP à
                configurer).
              </p>
            )}
          </div>
        </li>

        <li className="flex items-start gap-2.5">
          <StatusDot tone={emailTone} />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-zinc-800">Emails transactionnels</span>
            <span className="text-zinc-500"> — {emailLabel}</span>
            {email?.mode === 'outbox' && (
              <p className="mt-1 text-xs text-zinc-500">
                Ajoutez <code className="bg-zinc-100 rounded px-1">RESEND_API_KEY</code> (resend.com, 100
                emails/jour gratuits) pour confirmer les commandes depuis votre domaine.
              </p>
            )}
          </div>
        </li>
      </ul>

      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-400">
        <Send className="w-3.5 h-3.5" aria-hidden="true" />
        Backend {state?.backend === 'firebase' ? 'Firebase (production)' : 'local de secours — bascule automatique dès que Firebase est configuré'}
      </div>
    </div>
  )
}

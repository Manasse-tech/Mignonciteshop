'use client'

// ===== Gestion du consentement cookies (RGPD / ePrivacy) =====
// Stockage local : aucune donnée n'est envoyée tant que l'utilisateur n'a pas
// consenti. Le consentement n'est JAMAIS pré-coché (refus = refus net).
//
// Catégories :
//  - necessary   : toujours actif (panier, session, thème, sécurité) — non consentable
//  - analytics   : mesure d'audience (GA4 à venir — chargé UNIQUEMENT si consenti)
//  - marketing   : publicité personnalisée (Meta Pixel / Google Ads à venir)

import { useSyncExternalStore } from 'react'

export const CONSENT_STORAGE_KEY = 'mcs-cookie-consent-v1'

export interface CookiePreferences {
  necessary: true
  analytics: boolean
  marketing: boolean
}

export interface ConsentState {
  /** null = aucune décision prise (bannière à afficher) */
  decidedAt: string | null
  preferences: CookiePreferences | null
}

const DEFAULT_STATE: ConsentState = { decidedAt: null, preferences: null }

// ----- mini-store externe (même pattern que usePageMeta) -----
let state: ConsentState = DEFAULT_STATE
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function readStorage(): ConsentState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as ConsentState
    if (!parsed || typeof parsed !== 'object' || !parsed.preferences) return DEFAULT_STATE
    return {
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : null,
      preferences: {
        necessary: true,
        analytics: parsed.preferences.analytics === true,
        marketing: parsed.preferences.marketing === true,
      },
    }
  } catch {
    return DEFAULT_STATE
  }
}

// Initialisation lazy côté client (évite tout mismatch SSR)
if (typeof window !== 'undefined') {
  state = readStorage()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): ConsentState {
  return state
}

const SERVER_SNAPSHOT: ConsentState = DEFAULT_STATE
function getServerSnapshot(): ConsentState {
  return SERVER_SNAPSHOT
}

/** Enregistre la décision de l'utilisateur et déclenche le chargement conditionnel. */
export function saveConsent(prefs: Omit<CookiePreferences, 'necessary'>) {
  const saved: CookiePreferences = {
    necessary: true,
    analytics: !!prefs.analytics,
    marketing: !!prefs.marketing,
  }
  state = { decidedAt: new Date().toISOString(), preferences: saved }
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage indisponible (mode privé strict) : consentement en mémoire
  }
  emit()
  runConsentedLoaders(saved)
}

/** Hook React : état de consentement réactif. */
export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Ré-ouvrir le panneau de préférences (lien « Gestion des cookies » du footer). */
const REOPEN_EVENT = 'mcs:reopen-cookie-preferences'
export function reopenCookiePreferences() {
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT))
}
export function onReopenCookiePreferences(cb: () => void): () => void {
  window.addEventListener(REOPEN_EVENT, cb)
  return () => window.removeEventListener(REOPEN_EVENT, cb)
}

// ----- Chargement conditionnel des traceurs -----
type Loader = () => void
const analyticsLoaders: Loader[] = []
const marketingLoaders: Loader[] = []

/**
 * Enregistre un traceur à charger uniquement après consentement.
 * Usage futur : registerAnalyticsLoader(() => initGA4('G-XXXX'))
 */
export function registerAnalyticsLoader(loader: Loader) {
  analyticsLoaders.push(loader)
  const prefs = state.preferences
  if (state.decidedAt && prefs?.analytics) loader()
}

export function registerMarketingLoader(loader: Loader) {
  marketingLoaders.push(loader)
  const prefs = state.preferences
  if (state.decidedAt && prefs?.marketing) loader()
}

function runConsentedLoaders(prefs: CookiePreferences) {
  if (prefs.analytics) analyticsLoaders.forEach((l) => l())
  if (prefs.marketing) marketingLoaders.forEach((l) => l())
}

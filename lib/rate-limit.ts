import { NextRequest } from 'next/server'

/**
 * Rate limiting mémoire (par instance) pour les endpoints publics sensibles.
 * Suffisant en sandbox / mono-instance ; à remplacer par un limiter partagé
 * (Upstash, middleware edge) au déploiement multi-instances.
 */
const buckets = new Map<string, { count: number; reset: number }>()

// Purge périodique pour éviter la croissance illimitée de la Map
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (now > bucket.reset) buckets.delete(key)
  }
}

/** Retourne true si la requête est autorisée, false si la limite est atteinte. */
export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now()
  maybeCleanup(now)
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

/** Clé stable par IP + scope (le gateway peut fournir x-forwarded-for). */
export function clientKey(req: NextRequest, scope: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  return `${scope}:${ip}`
}

/** Réponse 429 standard. */
export const tooManyRequests = () =>
  Response.json({ error: 'Trop de tentatives, patientez une minute' }, { status: 429 })

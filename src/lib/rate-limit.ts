/**
 * Rate limiting en mémoire (mono-instance) — protection basique anti-abus
 * sur les endpoints sensibles (auth, commandes, formulaires).
 *
 * Limite volontairement simple : clé = identifiant (ex: "ip:1.2.3.4"),
 * fenêtre glissante par rafale fixe (fixed window). Suffisant pour une
 * petite boutique B2C ; à remplacer par Redis si scalabilité multi-instance.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Purge périodique des buckets expirés (évite la fuite mémoire). */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function maybeCleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Secondes avant réessai (si bloqué). */
  retryAfter: number;
}

/**
 * Vérifie et consomme 1 unité du quota.
 * @param key   identifiant unique (ex: `login:ip:${ip}`)
 * @param limit nombre max de requêtes par fenêtre
 * @param windowMs taille de la fenêtre en ms
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/** Extrait l'IP cliente d'une requête (proxy-aware, best effort). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

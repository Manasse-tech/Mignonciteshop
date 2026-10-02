import { spawn } from 'node:child_process'
import { closeSync, existsSync, openSync } from 'node:fs'
import path from 'node:path'

/**
 * Événements métier émis côté serveur vers le mini-service notify-service.
 * (Doit rester aligné avec AdminRealtimeEvent dans src/lib/realtime.ts.)
 */
export type AdminRealtimeEvent =
  | { type: 'order'; orderNumber: string; total: number; customerName: string }
  | { type: 'message'; name: string; subject: string }
  | { type: 'review'; product: string; rating: number; author: string }
  | { type: 'question'; product: string; author: string }

const NOTIFY_PORT = 3003
const NOTIFY_EMIT_URL = `http://127.0.0.1:${NOTIFY_PORT}/emit`
const NOTIFY_HEALTH_URL = `http://127.0.0.1:${NOTIFY_PORT}/health`
const NOTIFY_DIR = path.join(process.cwd(), 'mini-services', 'notify-service')
const NOTIFY_LOG = path.join(NOTIFY_DIR, 'service.log')
const BUN_BIN = existsSync('/usr/local/bin/bun') ? '/usr/local/bin/bun' : 'bun'

/**
 * Vérifie que le mini-service notify-service (port 3003) est joignable.
 * S'il est arrêté, le (re)démarre en tâche de fond comme enfant détaché du
 * processus serveur — ce qui le fait survivre à la fin des sessions shell
 * (le script de boot .zscripts/dev.sh le lance aussi au démarrage du conteneur).
 */
async function isNotifyServiceUp(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 800)
    try {
      const res = await fetch(NOTIFY_HEALTH_URL, { signal: controller.signal, cache: 'no-store' })
      return res.ok
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return false
  }
}

function spawnNotifyService(): void {
  try {
    const out = openSync(NOTIFY_LOG, 'a')
    try {
      const child = spawn(BUN_BIN, ['run', 'dev'], {
        cwd: NOTIFY_DIR,
        detached: true,
        stdio: ['ignore', out, out],
        env: process.env,
      })
      child.unref()
      child.on('error', (err) => {
        console.error('[notify] démarrage du mini-service impossible :', err)
      })
      console.log(`[notify] mini-service relancé depuis le serveur (pid ${child.pid})`)
    } finally {
      closeSync(out)
    }
  } catch (err) {
    console.error('[notify] spawn du mini-service impossible :', err)
  }
}

// Une seule relance à la fois (les requêtes API arrivant en parallèle
// partagent la même promesse d'attente).
let ensurePromise: Promise<boolean> | null = null

async function ensureNotifyService(): Promise<boolean> {
  if (await isNotifyServiceUp()) return true
  if (!ensurePromise) {
    ensurePromise = (async () => {
      try {
        spawnNotifyService()
        for (let attempt = 0; attempt < 40; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 250))
          if (await isNotifyServiceUp()) return true
        }
        return false
      } finally {
        ensurePromise = null
      }
    })()
  }
  return ensurePromise
}

/**
 * Émet un événement vers le mini-service (fire-and-forget, jamais bloquant :
 * une notification perdue ne doit jamais faire échouer la requête métier).
 */
export function emitAdminEvent(payload: AdminRealtimeEvent): void {
  void (async () => {
    try {
      const up = await ensureNotifyService()
      if (!up) {
        console.warn('[notify] service indisponible, événement non diffusé :', JSON.stringify(payload))
        return
      }
      const res = await fetch(NOTIFY_EMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'admin:event', payload }),
        cache: 'no-store',
      })
      if (!res.ok) {
        console.warn(`[notify] /emit a répondu ${res.status} pour :`, JSON.stringify(payload))
      } else {
        console.log('[notify] événement émis :', JSON.stringify(payload))
      }
    } catch (err) {
      console.warn('[notify] émission impossible :', err)
    }
  })()
}

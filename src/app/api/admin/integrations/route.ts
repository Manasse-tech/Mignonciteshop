import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { EMAIL_FROM } from '@/lib/email'
import {
  isFirebaseConfigured,
  getFirebaseAdmin,
  firebaseProjectId,
} from '@/lib/firebase'

// GET /api/admin/integrations — état du backend Firebase (admin).
// Aucun secret n'est retourné : uniquement l'état de configuration.
// Sondes (timeout 4 s, aucune clé exposée) :
//  - Firestore : collections présentes ? volumes ?
//  - Identity Toolkit : clé Web API valide ? (endpoint public projects?key=)
export async function GET(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied

  const configured = isFirebaseConfigured()
  const projectId = firebaseProjectId()

  let firestore: { reachable: boolean | null; collections: Record<string, number> | null }
  if (configured) {
    try {
      const fb = getFirebaseAdmin()
      if (!fb) throw new Error('non initialisé')
      const names = ['products', 'categories', 'orders', 'users', 'promoCodes', 'contactMessages']
      const counts: Record<string, number> = {}
      await Promise.all(
        names.map(async (n) => {
          try {
            const snap = await fb.db.collection(n).limit(1).count().get()
            counts[n] = snap.data().count
          } catch {
            counts[n] = -1 // collection absente ou erreur
          }
        }),
      )
      firestore = { reachable: true, collections: counts }
    } catch {
      firestore = { reachable: false, collections: null }
    }
  } else {
    firestore = { reachable: null, collections: null }
  }

  // Sonde Identity Toolkit (clé Web API) : endpoint public, renvoie la config projet
  let auth: { reachable: boolean | null; apiKeyValid: boolean | null }
  if (configured && process.env.FIREBASE_API_KEY) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects?key=${process.env.FIREBASE_API_KEY}`,
        { signal: AbortSignal.timeout(4000), cache: 'no-store' },
      )
      auth = { reachable: res.ok, apiKeyValid: res.ok }
    } catch {
      auth = { reachable: false, apiKeyValid: false }
    }
  } else {
    auth = { reachable: null, apiKeyValid: null }
  }

  const activeBackend = configured ? 'firebase' : 'local'

  return NextResponse.json({
    backend: activeBackend,
    firebase: {
      configured,
      projectId,
      serviceAccountSet: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
      apiKeySet: Boolean(process.env.FIREBASE_API_KEY),
    },
    firestore,
    auth,
    email: { mode: process.env.RESEND_API_KEY ? 'resend' : 'outbox', from: EMAIL_FROM },
  })
}

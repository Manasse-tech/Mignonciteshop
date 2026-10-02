import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { getFirebaseAdmin, isFirebaseConfigured } from '@/lib/firebase'

const defaults = { storeName: 'MignonciteShop', whatsapp: '+2250700000000', welcome: 'Mode, beauté et accessoires sélectionnés avec soin.' }

export async function GET(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  if (!isFirebaseConfigured()) return NextResponse.json(defaults)
  try {
    const snap = await getFirebaseAdmin()!.db.collection('settings').doc('store').get()
    return NextResponse.json({ ...defaults, ...(snap.exists ? snap.data() : {}) })
  } catch { return NextResponse.json(defaults) }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  const body = await req.json()
  const settings = {
    storeName: String(body.storeName || defaults.storeName).trim().slice(0, 80),
    whatsapp: String(body.whatsapp || defaults.whatsapp).replace(/[^+\d]/g, '').slice(0, 20),
    welcome: String(body.welcome || defaults.welcome).trim().slice(0, 240),
  }
  if (isFirebaseConfigured()) await getFirebaseAdmin()!.db.collection('settings').doc('store').set(settings, { merge: true })
  return NextResponse.json(settings)
}

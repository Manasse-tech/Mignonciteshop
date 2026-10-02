import { NextResponse } from 'next/server'
import { getFirebaseAdmin, isFirebaseConfigured } from '@/lib/firebase'

export async function GET() {
  const defaults = { storeName: 'MignonciteShop', whatsapp: '+2250700000000', welcome: 'Mode, beauté et accessoires sélectionnés avec soin.' }
  if (!isFirebaseConfigured()) return NextResponse.json(defaults)
  try {
    const snap = await getFirebaseAdmin()!.db.collection('settings').doc('store').get()
    return NextResponse.json({ ...defaults, ...(snap.exists ? snap.data() : {}) }, { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch { return NextResponse.json(defaults) }
}

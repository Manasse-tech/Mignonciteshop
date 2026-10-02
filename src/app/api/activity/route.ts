import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { getActivityFeed } from '@/lib/backend'

// GET /api/activity — flux d'activité récent pour le tableau de bord (ADMIN UNIQUEMENT)
export async function GET(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    return NextResponse.json(await getActivityFeed())
  } catch (error) {
    console.error('GET /api/activity', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

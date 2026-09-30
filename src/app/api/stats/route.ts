import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { getStatsPayload } from '@/lib/backend'

// ADMIN UNIQUEMENT : KPIs métier + agrégats (réservé au tableau de bord)
export async function GET(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    return NextResponse.json(await getStatsPayload())
  } catch (error) {
    console.error('GET /api/stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserLive } from '@/lib/auth'

// GET /api/auth/session — renvoie l'utilisateur connecté (ou null)
export async function GET(req: NextRequest) {
  const user = await getSessionUserLive(req)
  return NextResponse.json(
    { user: user ? { uid: user.uid, email: user.email, name: user.name, role: user.role } : null },
    // Pas de cache : l'état de session doit toujours être frais
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { getEmailLog, listEmailLogs } from '@/lib/backend'

/**
 * GET /api/admin/emails — journal des emails transactionnels (admin).
 * Liste sans le corps HTML (payload léger) ; ?id=... renvoie l'email complet
 * (aperçu dans l'admin). POST { id } : ré-expédition d'un email en échec/outbox.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const log = await getEmailLog(id)
      if (!log) return NextResponse.json({ error: 'Email introuvable' }, { status: 404 })
      return NextResponse.json(log)
    }

    return NextResponse.json(await listEmailLogs(100))
  } catch (error) {
    console.error('GET /api/admin/emails error:', error)
    return NextResponse.json({ error: 'Erreur de chargement des emails' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminLive(req)
  if (denied) return denied

  try {
    const { id } = (await req.json()) as { id?: string }
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const { resendEmail } = await import('@/lib/email')
    const result = await resendEmail(id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 })
    return NextResponse.json({ message: 'Email traité', status: result.status })
  } catch (error) {
    console.error('POST /api/admin/emails error:', error)
    return NextResponse.json({ error: 'Erreur lors de la ré-expédition' }, { status: 500 })
  }
}

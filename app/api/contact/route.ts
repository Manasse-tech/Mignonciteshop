import { NextRequest, NextResponse } from 'next/server'
import { emitAdminEvent } from '@/lib/notify'
import { requireAdminLive } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { CONTACT_CREATE, firstIssue } from '@/lib/validators'
import { createContactMessage, listContactMessages } from '@/lib/backend'

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientKey(req, 'contact-post'), 5)) return tooManyRequests()

    const body = await req.json().catch(() => null)
    const parsed = CONTACT_CREATE.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 })
    }
    const { name, email, subject, message } = parsed.data
    const contact = await createContactMessage({
      name,
      email,
      subject: subject || null,
      message,
    })

    // Notification temps réel vers l'admin (fire-and-forget, jamais bloquant)
    emitAdminEvent({
      type: 'message',
      name,
      subject: subject || '(sans objet)',
    })

    return NextResponse.json({ success: true, id: contact.id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/contact error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi du message" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // ADMIN UNIQUEMENT : les messages contiennent de la PII (faille S3 de l'audit, corrigée)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    return NextResponse.json(await listContactMessages())
  } catch (error) {
    console.error('GET /api/contact error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

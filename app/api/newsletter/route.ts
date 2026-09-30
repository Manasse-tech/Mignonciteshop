import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { NEWSLETTER_SUBSCRIBE, firstIssue } from '@/lib/validators'
import { subscribeNewsletter, listNewsletterSubscribers } from '@/lib/backend'

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientKey(req, 'newsletter-post'), 5)) return tooManyRequests()

    const body = await req.json().catch(() => null)
    const parsed = NEWSLETTER_SUBSCRIBE.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 })
    }
    const { email } = parsed.data
    const created = await subscribeNewsletter(email)
    if (!created) {
      return NextResponse.json({ success: true, alreadySubscribed: true })
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('POST /api/newsletter error:', error)
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // ADMIN UNIQUEMENT : liste des abonnés = PII (faille S3 de l'audit, corrigée)
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    return NextResponse.json(await listNewsletterSubscribers())
  } catch (error) {
    console.error('GET /api/newsletter error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

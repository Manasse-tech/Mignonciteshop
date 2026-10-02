import { NextResponse } from 'next/server'
import { EMAIL_ENABLED } from '@/lib/email'

// GET /api/email-mode — mode d'envoi des emails (public, aucun secret).
// 'resend' = envois réels activés · 'outbox' = boîte d'attente (aucun envoi).
// Permet à la page de confirmation d'afficher un message TOUJOURS VRAI.
export async function GET() {
  return NextResponse.json({ mode: EMAIL_ENABLED ? 'resend' : 'outbox' })
}

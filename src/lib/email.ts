import 'server-only'

import { createEmailLog, getEmailLog, updateEmailLog } from '@/lib/backend'
import { SITE_NAME, SITE_URL } from '@/lib/site'

/**
 * ===== Moteur d'emails transactionnels =====
 *
 * Deux modes, choisis automatiquement :
 *  - RESEND_API_KEY définie  → envoi réel via l'API Resend (https://resend.com)
 *  - sinon (dev/sandbox)     → mode OUTBOX : l'email rendu est journalisé en DB
 *    et consultable dans l'admin (onglet Emails) — aucun email n'est expédié.
 *
 * L'envoi ne JAMAIS faire échouer le flux métier (commande, reset) : toutes les
 * erreurs sont capturées et tracées dans EmailLog.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
export const EMAIL_FROM = process.env.EMAIL_FROM ?? `${SITE_NAME} <onboarding@resend.dev>`
export const EMAIL_ENABLED = Boolean(RESEND_API_KEY)

export interface SendEmailInput {
  to: string
  subject: string
  template: 'order-confirmation' | 'password-reset'
  html: string
  userId?: string
  orderId?: string
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  let status: 'sent' | 'outbox' | 'failed' = EMAIL_ENABLED ? 'sent' : 'outbox'
  let provider: 'resend' | 'outbox' = EMAIL_ENABLED ? 'resend' : 'outbox'
  let error: string | null = null
  let sentAt: Date | null = EMAIL_ENABLED ? new Date() : null

  if (EMAIL_ENABLED) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [input.to],
          subject: input.subject,
          html: input.html,
        }),
      })
      if (!res.ok) {
        status = 'failed'
        sentAt = null
        error = `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`
      }
    } catch (e) {
      status = 'failed'
      sentAt = null
      error = e instanceof Error ? e.message : String(e)
    }
  }

  try {
    await createEmailLog({
      to: input.to,
      subject: input.subject,
      template: input.template,
      status,
      provider,
      error,
      orderId: input.orderId ?? null,
      userId: input.userId ?? null,
      html: input.html,
    })
  } catch (e) {
    // Le journal ne doit jamais casser le flux métier
    console.error('[email] journalisation impossible:', e)
  }
}

/** Ré-expédition d'un email journalisé (bouton « Renvoyer » de l'admin). */
export async function resendEmail(logId: string): Promise<{ ok: boolean; status?: string; error?: string }> {
  const log = await getEmailLog(logId)
  if (!log) return { ok: false, error: 'Email introuvable' }
  if (log.status === 'sent') return { ok: false, error: 'Email déjà envoyé' }

  if (!EMAIL_ENABLED) {
    // Toujours en outbox : marquer comme traité (re-consigné)
    await updateEmailLog(logId, { status: 'outbox', sentAt: new Date().toISOString() })
    return { ok: true, status: 'outbox' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [log.to], subject: log.subject, html: log.html }),
    })
    if (!res.ok) {
      const err = `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`
      await updateEmailLog(logId, { status: 'failed', error: err })
      return { ok: false, error: err }
    }
    await updateEmailLog(logId, { status: 'sent', provider: 'resend', sentAt: new Date().toISOString() })
    return { ok: true, status: 'sent' }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    await updateEmailLog(logId, { status: 'failed', error: err })
    return { ok: false, error: err }
  }
}

// ---------------------------------------------------------------------------
// Gabarit de marque commun (layout compatible clients email : tables + inline CSS)
// ---------------------------------------------------------------------------

const GOLD = '#C9A961'
const DARK = '#141414'

export function emailLayout(contentHtml: string, preheader: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SITE_NAME}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:${DARK};padding:22px 32px;border-radius:14px 14px 0 0;text-align:center;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">MIGNONCITE<span style="color:${GOLD};">SHOP</span></span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
          ${contentHtml}
        </td></tr>
        <tr><td style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 14px 14px;padding:20px 32px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#71717a;">Boutique ${SITE_NAME} — produits de qualité, livraison rapide, paiement sécurisé.</p>
          <p style="margin:0;font-size:11px;color:#a1a1aa;">© ${new Date().getFullYear()} ${SITE_NAME} · <a href="${SITE_URL}/?page=terms" style="color:${GOLD};text-decoration:none;">CGV</a> · <a href="${SITE_URL}/?page=privacy" style="color:${GOLD};text-decoration:none;">Confidentialité</a> · <a href="${SITE_URL}/?page=contact" style="color:${GOLD};text-decoration:none;">Contact</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function btn(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${GOLD};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:13px 30px;border-radius:999px;">${label}</a>`
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface OrderForEmail {
  orderNumber: string
  customerName: string
  customerEmail: string
  address: string
  city: string
  postalCode?: string | null
  country: string
  paymentMethod: string
  shippingMethod: string
  subtotal: number
  shipping: number
  discount: number
  total: number
  items: { name: string; price: number; quantity: number; image?: string | null }[]
}

const SHIPPING_LABELS: Record<string, string> = {
  standard: 'Livraison Standard (3 à 5 jours ouvrés)',
  express: 'Livraison Express (24 à 48h)',
  relais: 'Point Relais (3 à 6 jours ouvrés)',
}

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Carte bancaire',
  paypal: 'PayPal',
  cod: 'Paiement à la livraison',
  'Carte': 'Carte bancaire',
  'PayPal': 'PayPal',
  'Livraison': 'Paiement à la livraison',
}

function eur(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`
}

export function orderConfirmationHtml(order: OrderForEmail): string {
  const rows = order.items
    .map(
      (it) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#3f3f46;">${it.name}${it.quantity > 1 ? ` <span style="color:#a1a1aa;">× ${it.quantity}</span>` : ''}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#3f3f46;text-align:right;white-space:nowrap;">${eur(it.price * it.quantity)}</td>
      </tr>`
    )
    .join('')

  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#18181b;">Merci pour votre commande, ${order.customerName} ! 🎉</h1>
    <p style="margin:0 0 22px;font-size:14px;color:#52525b;line-height:1.6;">Votre commande <strong style="color:#18181b;">${order.orderNumber}</strong> est confirmée. Nous préparons votre colis avec soin — vous recevrez un email dès son expédition.</p>

    <h2 style="margin:0 0 10px;font-size:15px;color:#18181b;text-transform:uppercase;letter-spacing:0.5px;">Récapitulatif</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${rows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
      <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">Sous-total</td><td style="padding:4px 0;font-size:14px;color:#52525b;text-align:right;">${eur(order.subtotal)}</td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">Livraison</td><td style="padding:4px 0;font-size:14px;color:#52525b;text-align:right;">${order.shipping === 0 ? 'Offerte' : eur(order.shipping)}</td></tr>
      ${order.discount > 0 ? `<tr><td style="padding:4px 0;font-size:14px;color:#16a34a;">Remise</td><td style="padding:4px 0;font-size:14px;color:#16a34a;text-align:right;">− ${eur(order.discount)}</td></tr>` : ''}
      <tr><td style="padding:10px 0 0;font-size:16px;font-weight:bold;color:#18181b;border-top:2px solid ${GOLD};">Total</td><td style="padding:10px 0 0;font-size:16px;font-weight:bold;color:#18181b;text-align:right;border-top:2px solid ${GOLD};">${eur(order.total)}</td></tr>
    </table>

    <h2 style="margin:26px 0 8px;font-size:15px;color:#18181b;text-transform:uppercase;letter-spacing:0.5px;">Livraison &amp; paiement</h2>
    <p style="margin:0;font-size:14px;color:#52525b;line-height:1.7;">
      ${SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod}<br>
      ${order.address}, ${order.postalCode ? `${order.postalCode} ` : ''}${order.city}, ${order.country}<br>
      Paiement : ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
    </p>

    <p style="margin:26px 0 14px;">${btn(`${SITE_URL}/?page=tracking&orderNumber=${order.orderNumber}`, 'Suivre ma commande')}</p>
    <p style="margin:0;font-size:13px;color:#a1a1aa;">Une question ? Répondez simplement à cet email — notre équipe vous répond sous 24h.</p>`

  return emailLayout(content, `Commande ${order.orderNumber} confirmée — ${eur(order.total)}`)
}

export function passwordResetHtml(name: string, resetUrl: string, expiresInMin = 30): string {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#18181b;">Réinitialisation de votre mot de passe</h1>
    <p style="margin:0 0 22px;font-size:14px;color:#52525b;line-height:1.6;">Bonjour ${name}, vous avez demandé la réinitialisation de votre mot de passe ${SITE_NAME}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est <strong>valable ${expiresInMin} minutes</strong> et ne peut être utilisé qu'une seule fois.</p>
    <p style="margin:0 0 18px;text-align:center;">${btn(resetUrl, 'Choisir un nouveau mot de passe')}</p>
    <p style="margin:0 0 22px;font-size:13px;color:#71717a;line-height:1.6;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="color:#52525b;word-break:break-all;">${resetUrl}</span></p>
    <p style="margin:0;padding:14px;background:#fef9ec;border-radius:10px;font-size:13px;color:#92700f;line-height:1.5;">🔐 Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email — votre mot de passe actuel reste inchangé.</p>`

  return emailLayout(content, 'Réinitialisez votre mot de passe MignonciteShop')
}

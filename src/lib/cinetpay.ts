import 'server-only'

const CINETPAY_API = 'https://api-checkout.cinetpay.com/v2/payment'

export interface CinetPayPaymentInput {
  transactionId: string
  amount: number
  description: string
  customerName: string
  customerEmail: string
  customerPhone: string
}

export async function createCinetPayPayment(input: CinetPayPaymentInput) {
  const apiKey = process.env.CINETPAY_API_KEY
  const siteId = process.env.CINETPAY_SITE_ID
  if (!apiKey || !siteId) throw new Error('CINETPAY_NOT_CONFIGURED')

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const response = await fetch(CINETPAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: input.transactionId,
      amount: Math.round(input.amount),
      currency: 'XOF',
      description: input.description,
      notify_url: `${origin}/api/payments/cinetpay/notify`,
      return_url: `${origin}/?page=order-confirmation&orderNumber=${encodeURIComponent(input.transactionId)}`,
      channels: 'ALL',
      lang: 'fr',
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone_number: input.customerPhone,
    }),
    cache: 'no-store',
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.code !== '201') {
    console.error('[cinetpay] payment initialization failed', data)
    throw new Error('CINETPAY_INIT_FAILED')
  }
  return data.data as { payment_url: string; payment_token: string }
}

export function isCinetPayConfigured() {
  return Boolean(process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID)
}

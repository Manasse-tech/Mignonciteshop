import { NextRequest, NextResponse } from 'next/server'
import { generateOrderNumber } from '@/lib/format'
import { computeShipping, getShippingMethod } from '@/lib/shipping'
import { emitAdminEvent } from '@/lib/notify'
import { getSessionUserLive, unauthorized } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { ORDER_CREATE, firstIssue } from '@/lib/validators'
import { sendEmail, orderConfirmationHtml } from '@/lib/email'
import { createCinetPayPayment, isCinetPayConfigured } from '@/lib/cinetpay'
import {
  listOrders,
  getProductsByIds,
  findPromoByCode,
  loyaltyBalance,
  createOrderWithStock,
} from '@/lib/backend'

// ---------------------------------------------------------------------------
// GET /api/orders
//  - admin : toutes les commandes avec données complètes
//  - connecté (rôle user) : UNIQUEMENT ses propres commandes, données complètes
//    (l'original Base44 n'exposait jamais les commandes d'autrui)
//  - ?orderNumber= / ?search= (public) : tracking/confirmation par numéro
//  - liste anonyme sans paramètre : 401 — connexion obligatoire (auth Base44)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUserLive(req)
    const isAdmin = user?.role === 'admin'
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const status = searchParams.get('status')
    const orderNumber = searchParams.get('orderNumber')
    const search = searchParams.get('search')

    // Le filtrage par email expose de la PII : réservé admin
    if (email && !isAdmin) return unauthorized()

    // Tracking/confirmation par numéro : public (comportement original, réf. FAQ)
    const isTracking = Boolean(orderNumber || search)

    if (!isTracking) {
      // Liste : connexion obligatoire + scoping strict par compte
      if (!user) return unauthorized()
    }

    const orders = await listOrders({
      email,
      status,
      orderNumber,
      search,
      scopedUserId: !isTracking && user && !isAdmin ? user.uid : null,
      scopedUserEmail: !isTracking && user && !isAdmin ? user.email : null,
      take: isTracking ? 5 : 200,
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('GET /api/orders error:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des commandes' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/orders — création de commande (CONNEXION OBLIGATOIRE, comme l'original
// Base44 : le checkout redirigeait vers le login sans session).
//
// SÉCURITÉ (correctifs S1 + comptes) : le client n'est JAMAIS cru sur les prix,
// la remise ou les points. Tout est recalculé depuis la base :
//   1. prix = Product.price en DB (produits actifs uniquement)
//   2. remise promo = recalculée depuis la table PromoCode
//   3. points = validés contre le solde du COMPTE CONNECTÉ (jamais un autre), barème 100 pts = 5 €
//   4. livraison + total recomposés via lib/shipping
//   5. transaction : décrément de stock contrôlé (jamais négatif) + compteur ventes
//   6. la commande est rattachée au compte (Order.userId) — base du scoping IDOR
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientKey(req, 'orders-post'), 10)) return tooManyRequests()

    // Toute commande doit être liée à un compte client pour permettre le suivi.
    const user = await getSessionUserLive(req)
    if (!user) return unauthorized()

    const body = await req.json().catch(() => null)
    const parsed = ORDER_CREATE.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 })
    }
    const input = parsed.data
    // 1. Re-pricing : prix réels depuis la base (Firebase ou SQLite)
    const ids = [...new Set(input.items.map((i) => i.productId))]
    const products = (await getProductsByIds(ids)).filter((p) => p.isActive)
    const byId = new Map(products.map((p) => [p.id, p]))
    for (const it of input.items) {
      const p = byId.get(it.productId)
      if (!p) {
        return NextResponse.json({ error: 'Un produit du panier est indisponible' }, { status: 400 })
      }
      if (p.stock < it.quantity) {
        return NextResponse.json(
          { error: `Stock insuffisant pour ${p.name} (${p.stock} restant)` },
          { status: 409 },
        )
      }
    }

    const subtotal =
      Math.round(input.items.reduce((s, it) => s + byId.get(it.productId)!.price * it.quantity, 0) * 100) / 100

    // 2. Remise promo recalculée serveur (jamais lue depuis le body)
    let promoDiscount = 0
    let promoFreeShipping = false
    let promoRecord: { id: string; code: string } | null = null
    if (input.promoCode) {
      const code = input.promoCode.trim().toUpperCase()
      const promo = await findPromoByCode(code)
      if (!promo || !promo.active) {
        return NextResponse.json({ error: 'Code promo invalide ou expiré' }, { status: 400 })
      }
      promoRecord = { id: promo.id, code: promo.code }
      if (promo.type === 'percent') promoDiscount = Math.round(subtotal * promo.value) / 100
      else if (promo.type === 'fixed') promoDiscount = Math.min(promo.value, subtotal)
      else promoFreeShipping = true
    }

    // 3. Points fidélité : validés contre le solde DU COMPTE CONNECTÉ (jamais global)
    const safePoints = Math.max(0, Math.floor(input.pointsUsed || 0))
    if (safePoints % 100 !== 0) {
      return NextResponse.json({ error: 'Les points doivent être utilisés par blocs de 100' }, { status: 400 })
    }
    let pointsDiscount = 0
    if (safePoints > 0) {
      if (!user) return unauthorized()
      const { earned, used } = await loyaltyBalance(user.uid, user.email)
      const usableBlocks = Math.floor(Math.max(0, earned - used) / 100)
      if (safePoints > usableBlocks * 100) {
        return NextResponse.json({ error: 'Solde de points insuffisant' }, { status: 400 })
      }
      pointsDiscount = (safePoints / 100) * 5
    }

    // 4. Livraison + total recomposés serveur
    const method = getShippingMethod(input.shippingMethod)
    const shipping = computeShipping(method.id, subtotal, promoFreeShipping)
    const total = Math.max(0, Math.round((subtotal - promoDiscount - pointsDiscount) * 100) / 100 + shipping)

    if (input.paymentMethod === 'CinetPay' && !isCinetPayConfigured()) {
      return NextResponse.json({ error: 'Le paiement Mobile Money est momentanément indisponible.' }, { status: 503 })
    }

    // 5. Transaction : stock contrôlé (jamais négatif) + commande + usage promo
    try {
      const order = await createOrderWithStock({
        orderNumber: generateOrderNumber(),
        userId: user?.uid ?? null,
        customerName: input.customerName,
        customerEmail: user?.email ?? input.customerEmail,
        phone: input.phone || null,
        address: input.address,
        city: input.city,
        postalCode: input.postalCode || null,
        country: input.country || 'France',
        paymentMethod: input.paymentMethod || 'Carte',
        shippingMethod: method.id,
        subtotal,
        shipping,
        discount: Math.round((promoDiscount + pointsDiscount) * 100) / 100,
        promoCode: promoRecord?.code ?? null,
        promoId: promoRecord?.id ?? null,
        total,
        status: 'confirmee',
        pointsUsed: safePoints,
        notes: input.notes || null,
        items: input.items.map((it) => {
          const p = byId.get(it.productId)!
          return { productId: p.id, name: p.name, price: p.price, image: p.image, quantity: it.quantity }
        }),
      })

      let paymentUrl: string | undefined
      if (input.paymentMethod === 'CinetPay') {
        const payment = await createCinetPayPayment({
          transactionId: order.orderNumber,
          amount: order.total * 655.957,
          description: `Commande ${order.orderNumber} — MignonciteShop`,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.phone || '',
        })
        paymentUrl = payment.payment_url
      }

      // Notification temps réel vers l'admin (fire-and-forget, jamais bloquant)
      emitAdminEvent({
        type: 'order',
        orderNumber: order.orderNumber,
        total: order.total,
        customerName: order.customerName,
      })

      // Email de confirmation transactionnel (fire-and-forget : jamais bloquant
      // pour le checkout ; journalisé dans EmailLog → consultable côté admin)
      void sendEmail({
        to: order.customerEmail,
        subject: `Confirmation de votre commande ${order.orderNumber} — MignonciteShop`,
        template: 'order-confirmation',
        html: orderConfirmationHtml({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          address: order.address,
          city: order.city,
          postalCode: order.postalCode,
          country: order.country,
          paymentMethod: order.paymentMethod,
          shippingMethod: order.shippingMethod,
          subtotal: order.subtotal,
          shipping: order.shipping,
          discount: order.discount,
          total: order.total,
          items: order.items.map((it) => ({ name: it.name, price: it.price, quantity: it.quantity, image: it.image })),
        }),
        userId: order.userId ?? undefined,
        orderId: order.id,
      }).catch((e) => console.error('[email] confirmation commande:', e))

      return NextResponse.json({ ...order, paymentUrl }, { status: 201 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.startsWith('STOCK:')) {
        return NextResponse.json({ error: `Stock insuffisant pour ${msg.slice(6)}` }, { status: 409 })
      }
      throw e
    }
  } catch (error) {
    console.error('POST /api/orders error:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}

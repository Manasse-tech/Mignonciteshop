import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserLive, unauthorized } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { CART_ITEM_INPUT, firstIssue } from '@/lib/validators'
import { listCart, upsertCartItem, findCartItem, deleteCartItems, getProductById } from '@/lib/backend'

/**
 * Collection Cart de l'original Base44 (5ᵉ collection) — panier persisté par compte.
 * Toutes les opérations exigent une session (comportement original : le panier
 * appartenait à l'utilisateur connecté). Le prix n'est JAMAIS accepté du client :
 * il est relu depuis la base à chaque lecture (Firestore ou SQLite).
 */

const variantKey = (size?: string | null, color?: string | null) =>
  `${(size ?? '').trim()}|${(color ?? '').trim()}`

export async function GET(req: NextRequest) {
  const user = await getSessionUserLive(req)
  if (!user) return unauthorized()
  try {
    return NextResponse.json(await listCart(user.uid))
  } catch (error) {
    console.error('GET /api/cart error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUserLive(req)
  if (!user) return unauthorized()
  try {
    if (!rateLimit(clientKey(req, 'cart-post'), 60)) return tooManyRequests()
    const parsed = CART_ITEM_INPUT.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 })
    const { productId, quantity, size, color } = parsed.data
    if (quantity < 1) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 })

    const product = await getProductById(productId)
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Produit indisponible' }, { status: 404 })
    }

    const key = variantKey(size, color)
    const existing = await findCartItem(user.uid, productId, key)
    const nextQty = Math.min((existing ?? 0) + quantity, 99)
    if (nextQty > product.stock) {
      return NextResponse.json({ error: 'Stock insuffisant' }, { status: 409 })
    }
    await upsertCartItem({ userId: user.uid, productId, variantKey: key, quantity: nextQty })
    return NextResponse.json(await listCart(user.uid), { status: 201 })
  } catch (error) {
    console.error('POST /api/cart error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUserLive(req)
  if (!user) return unauthorized()
  try {
    const parsed = CART_ITEM_INPUT.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 })
    const { productId, quantity, size, color } = parsed.data
    const key = variantKey(size, color)

    if (quantity <= 0) {
      await deleteCartItems(user.uid, { productId, variantKey: key })
    } else {
      // Le stock est revérifié pour ne jamais dépasser la disponibilité réelle
      const product = await getProductById(productId)
      if (!product || !product.isActive) {
        return NextResponse.json({ error: 'Produit indisponible' }, { status: 404 })
      }
      await upsertCartItem({
        userId: user.uid,
        productId,
        variantKey: key,
        quantity: Math.min(quantity, product.stock, 99),
      })
    }
    return NextResponse.json(await listCart(user.uid))
  } catch (error) {
    console.error('PATCH /api/cart error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUserLive(req)
  if (!user) return unauthorized()
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    if (!productId) {
      // Sans paramètre : vidage complet du panier du compte
      await deleteCartItems(user.uid, 'all')
    } else {
      const key = variantKey(searchParams.get('size'), searchParams.get('color'))
      await deleteCartItems(user.uid, { productId, variantKey: key })
    }
    return NextResponse.json(await listCart(user.uid))
  } catch (error) {
    console.error('DELETE /api/cart error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { emitAdminEvent } from '@/lib/notify'
import { getSessionUserLive, unauthorized } from '@/lib/auth'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { REVIEW_CREATE, firstIssue } from '@/lib/validators'
import { listReviews, createReview, refreshProductRating, getProductById } from '@/lib/backend'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const status = searchParams.get('status')

    const reviews = await listReviews({ productId, status })

    // L'email des auteurs n'est pas exposé publiquement (admin seulement)
    const admin = await getSessionUserLive(req)
    const safe = admin ? reviews : reviews.map((r) => ({ ...r, email: undefined }))

    return NextResponse.json(safe)
  } catch (error) {
    console.error('GET /api/reviews error:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des avis' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(clientKey(req, 'reviews-post'), 5)) return tooManyRequests()

    // Connexion obligatoire pour publier un avis (comportement original Base44)
    const user = await getSessionUserLive(req)
    if (!user) return unauthorized()

    const parsed = REVIEW_CREATE.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 })
    }
    const { productId, rating, title, content, photos } = parsed.data

    // Le produit doit exister (sinon erreur 500 opaque à la création)
    const product = await getProductById(productId)
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }
    // Photos optionnelles : tableau d'URLs, max 3, nettoyées et dédupliquées
    const safePhotos = Array.isArray(photos)
      ? [...new Set(photos
          .filter((p: unknown): p is string => typeof p === 'string')
          .map((p: string) => p.trim())
          .filter(Boolean))]
          .slice(0, 3)
      : []
    const review = await createReview({
      productId,
      userId: user.uid, // auteur rattaché au compte (traçabilité anti-abus)
      author: user.name, // nom d'affichage du compte, jamais celui posté par le client
      email: user.email,
      rating,
      title: title || null,
      content,
      photos: JSON.stringify(safePhotos),
      status: 'pending', // modération conservée : aucun avis auto-approuvé
    })

    // Mettre à jour la note moyenne du produit avec les avis approuvés
    await refreshProductRating(productId, true)

    // Notification temps réel vers l'admin (fire-and-forget, jamais bloquant)
    emitAdminEvent({
      type: 'review',
      product: product.name,
      rating: review.rating,
      author: review.author,
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: "Erreur lors de la création de l'avis" }, { status: 500 })
  }
}

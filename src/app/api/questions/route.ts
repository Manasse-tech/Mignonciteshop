import { NextRequest, NextResponse } from 'next/server'
import { emitAdminEvent } from '@/lib/notify'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { listQuestions, createQuestion, getProductById } from '@/lib/backend'

// GET /api/questions?productId=xxx&status=pending|answered|all (défaut : answered pour le public)
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('productId') || undefined
    const status = request.nextUrl.searchParams.get('status') || 'answered'

    const questions = await listQuestions({ productId, status })
    return NextResponse.json(questions)
  } catch (error) {
    console.error('GET /api/questions', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/questions — un visiteur pose une question (modérée avant publication)
export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(clientKey(request, 'questions-post'), 5)) return tooManyRequests()

    const body = await request.json()
    const { productId, author, question } = body || {}

    if (!productId || !author?.trim() || !question?.trim()) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    if (question.trim().length < 10) {
      return NextResponse.json({ error: 'La question doit contenir au moins 10 caractères' }, { status: 400 })
    }

    const product = await getProductById(productId)
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    const created = await createQuestion({
      productId,
      author: author.trim().slice(0, 60),
      question: question.trim().slice(0, 500),
      status: 'pending',
    })

    // Notification temps réel vers l'admin (fire-and-forget, jamais bloquant)
    emitAdminEvent({
      type: 'question',
      product: product.name,
      author: created.author,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('POST /api/questions', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

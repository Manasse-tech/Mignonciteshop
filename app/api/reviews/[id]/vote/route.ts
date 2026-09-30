import { NextRequest, NextResponse } from 'next/server'
import { reviewExists, voteReview } from '@/lib/backend'

// Vote "Utile" sur un avis — incrémente le compteur
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!(await reviewExists(id))) {
      return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 })
    }
    const helpfulCount = await voteReview(id)
    return NextResponse.json({ success: true, helpfulCount })
  } catch (error) {
    console.error('POST /api/reviews/[id]/vote error:', error)
    return NextResponse.json({ error: 'Erreur lors du vote' }, { status: 500 })
  }
}

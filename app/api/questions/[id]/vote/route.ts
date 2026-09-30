import { NextRequest, NextResponse } from 'next/server'
import { questionExists, voteQuestion } from '@/lib/backend'

// Vote "Utile" sur une question produit — incrémente le compteur
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!(await questionExists(id))) {
      return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })
    }
    const helpfulCount = await voteQuestion(id)
    return NextResponse.json({ success: true, helpfulCount })
  } catch (error) {
    console.error('POST /api/questions/[id]/vote error:', error)
    return NextResponse.json({ error: 'Erreur lors du vote' }, { status: 500 })
  }
}

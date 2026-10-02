import { NextRequest, NextResponse } from 'next/server'
import { listPriceHistory } from '@/lib/backend'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const history = await listPriceHistory(id)
    return NextResponse.json(history)
  } catch (error) {
    console.error('GET /api/products/[id]/price-history error:', error)
    return NextResponse.json({ error: "Erreur lors du chargement de l'historique des prix" }, { status: 500 })
  }
}

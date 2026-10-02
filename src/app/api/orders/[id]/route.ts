import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive, getSessionUserLive, forbidden } from '@/lib/auth'
import { ORDER_STATUS } from '@/lib/validators'
import { getOrderByIdOrNumber, updateOrder } from '@/lib/backend'

// GET /api/orders/[id] — détail d'une commande (par id OU par numéro).
//
// Autorisation (faille IDOR de l'audit, corrigée avec les comptes clients) :
//  - identifiant = numéro de commande (MCS-XXXX, tracking public de la FAQ) :
//    accessible sans session, comme le suivi de livraison de l'original ;
//  - identifiant = id interne (cuid, ex. « Voir le détail complet » depuis
//    « Mes commandes ») : réservé au PROPRIÉTAIRE de la commande ou à l'admin.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { order, byNumber } = await getOrderByIdOrNumber(id)
    if (!order) return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })

    if (!byNumber) {
      // Accès par id interne : propriétaire ou admin uniquement
      const user = await getSessionUserLive(req)
      const isOwner =
        user && (order.userId === user.uid || order.customerEmail === user.email)
      if (!user || (!isOwner && user.role !== 'admin')) return forbidden()
    }
    return NextResponse.json(order)
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/orders/[id] — changement de statut (ADMIN UNIQUEMENT, statuts en liste blanche)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminLive(req)
  if (denied) return denied
  try {
    const { id } = await params
    const body = await req.json().catch(() => null)

    const data: Record<string, unknown> = {}
    if (body?.status !== undefined) {
      const parsed = ORDER_STATUS.safeParse(body.status)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Statut invalide (autorisés : confirmee, expediee, livree, annulee)' },
          { status: 400 },
        )
      }
      data.status = parsed.data
    }
    if (body?.notes !== undefined) {
      data.notes = String(body.notes ?? '').slice(0, 2000) || null
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
    }
    const order = await updateOrder(id, data)
    if (!order) return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    return NextResponse.json(order)
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

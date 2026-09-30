import { NextRequest, NextResponse } from 'next/server'
import { getSessionUserLive, unauthorized } from '@/lib/auth'
import { loyaltyBalance } from '@/lib/backend'

/**
 * Solde de fidélité du COMPTE CONNECTÉ (connexion obligatoire, comme l'original).
 * - pointsGagnes  : 1 € dépensé hors livraison (subtotal - discount - pointsUsed) = 1 point
 * - pointsUtilises: conversions de points en remise (Order.pointsUsed)
 * - solde         : gagnés - utilisés ; 100 pts = 5 € de remise
 * Le solde est strictement scopé au compte (userId ou email de session) :
 * un utilisateur ne peut plus consommer les points issus des commandes d'autrui.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUserLive(req)
  if (!user) return unauthorized()
  try {
    const { earned, used, orders } = await loyaltyBalance(user.uid, user.email)
    const balance = Math.max(0, earned - used)
    // Conversion : 100 pts = 5 € (par blocs de 100 points)
    const usableBlocks = Math.floor(balance / 100)
    return NextResponse.json({
      earned,
      used,
      balance,
      orders,
      usableBlocks,
      maxValue: usableBlocks * 5,
      rate: { points: 100, value: 5 },
    })
  } catch (error) {
    console.error('GET /api/loyalty error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

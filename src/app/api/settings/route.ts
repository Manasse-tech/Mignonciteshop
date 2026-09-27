import { NextResponse } from "next/server"
import { getStoreSettings, toPublicSettings } from "@/lib/settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/settings — réglages publics de la boutique (aucune donnée sensible).
 * Sert à afficher les frais de livraison et le seuil de gratuité à jour
 * dans le panier et le checkout. Le serveur reste la source de vérité :
 * ces valeurs ne sont qu'une estimation, le débit réel est recalculé
 * dans POST /api/orders.
 */
export async function GET() {
  const settings = await getStoreSettings()
  return NextResponse.json(toPublicSettings(settings))
}

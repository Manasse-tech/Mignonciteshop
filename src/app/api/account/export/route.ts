import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserFromRequest } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/account/export — EXPORT RGPD (art. 20 : portabilité).
 * Renvoie TOUTES les données rattachées à l'adresse e-mail du compte
 * connecté, en JSON téléchargeable :
 *   profil, commandes, avis, alertes réassort, abonnement newsletter,
 *   messages de contact, événements analytics (achats).
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connectez-vous pour exporter vos données." },
      { status: 401 }
    )
  }

  try {
    const email = user.email.toLowerCase()
    const [orders, reviews, stockAlerts, newsletter, contactMessages, analytics] =
      await Promise.all([
        db.order.findMany({
          where: { email },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        }),
        db.review.findMany({ where: { author: user.name ?? email }, orderBy: { createdAt: "desc" } }),
        db.stockAlert.findMany({ where: { email }, include: { product: { select: { name: true } } } }),
        db.newsletterSubscriber.findUnique({ where: { email } }),
        db.contactMessage.findMany({ where: { email }, orderBy: { createdAt: "desc" } }),
        db.analyticsEvent.findMany({
          where: { event: "purchase", meta: { contains: email } },
          orderBy: { createdAt: "desc" },
        }),
      ])

    const payload = {
      exportedAt: new Date().toISOString(),
      rgpd: "Article 20 RGPD — droit à la portabilité des données",
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: undefined as string | undefined,
      },
      orders,
      reviews,
      stockAlerts,
      newsletterSubscription: newsletter,
      contactMessages,
      analyticsEvents: analytics,
    }

    // Date de création du profil lue en base (complète).
    const dbUser = await db.user.findUnique({ where: { email } })
    payload.profile.createdAt = dbUser?.createdAt.toISOString()

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mignonciteshop-donnees-${user.id}.json"`,
      },
    })
  } catch (error) {
    console.error("GET /api/account/export error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

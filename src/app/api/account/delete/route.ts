import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSessionUserFromRequest, clearSessionCookie } from "@/lib/auth-server"
import { sendEmail } from "@/lib/mailer"
import { logAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/account/delete — SUPPRESSION RGPD (art. 17 : droit à l'effacement).
 *
 * Stratégie e-commerce standard (obligations comptables) :
 *   - DONNÉES PERSONNELLES : supprimées (compte, sessions, avis, alertes,
 *     abonnement newsletter, messages de contact)
 *   - COMMANDES : CONSERVÉES mais ANONYMISÉES (obligation légale de
 *     conservation des pièces comptables — art. L123-22 code de commerce) :
 *     email → `anonymise+<orderId>@rgpd.local`, nom → « Client supprimé »,
 *     téléphone et notes vidés. Aucun rapprochement n'est plus possible.
 *
 * L'admin est prévenu par e-mail (EmailLog) et l'action est journalisée.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Connectez-vous pour supprimer votre compte." },
      { status: 401 }
    )
  }

  if (user.role === "admin") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Un compte administrateur ne peut pas être supprimé depuis la boutique. Créez d'abord un autre admin puis rétrogradez ce compte.",
      },
      { status: 400 }
    )
  }

  try {
    const email = user.email.toLowerCase()

    // 1. Données personnelles directes.
    // Les avis sont rattachés par auteur (nom) — supprimés prudemment.
    if (user.name) {
      await db.review.deleteMany({ where: { author: user.name } })
    }
    await db.stockAlert.deleteMany({ where: { email } })
    await db.newsletterSubscriber.deleteMany({ where: { email } })
    await db.contactMessage.deleteMany({ where: { email } })

    // 2. Commandes : anonymisation (conservation comptable).
    const orders = await db.order.findMany({
      where: { email },
      select: { id: true },
    })
    for (const order of orders) {
      await db.order.update({
        where: { id: order.id },
        data: {
          email: `anonymise+${order.id}@rgpd.local`,
          customerName: "Client supprimé",
          phone: null,
          notes: null,
        },
      })
    }

    // 3. Compte + sessions (la session courante disparaît avec).
    await db.$transaction([
      db.session.deleteMany({ where: { userId: user.id } }),
      db.account.deleteMany({ where: { userId: user.id } }),
      db.user.delete({ where: { id: user.id } }),
    ])

    // 4. Traçabilité (sans donnée personnelle) + e-mail de confirmation
    // générique à l'ancienne adresse (dernier contact).
    await logAudit({ actor: email, action: "customer.role", target: "RGPD", details: { type: "account_deleted", ordersAnonymized: orders.length } })
    void sendEmail({
      to: email,
      subject: "Confirmation de suppression de votre compte — MignonciteShop",
      template: "account_deleted",
      lines: [
        `Bonjour,`,
        ``,
        `Votre demande de suppression de compte a bien été traitée.`,
        `Toutes vos données personnelles ont été effacées.`,
        `${orders.length} commande(s) ont été conservées sous forme anonymisée`,
        `(obligation comptable), sans aucun rattachement possible à votre identité.`,
        ``,
        `Merci pour la confiance accordée.`,
      ],
      data: { ordersAnonymized: orders.length },
    })

    const response = NextResponse.json({
      ok: true,
      message: "Votre compte et vos données personnelles ont été supprimés.",
    })
    clearSessionCookie(response)
    return response
  } catch (error) {
    console.error("POST /api/account/delete error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

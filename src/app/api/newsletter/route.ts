import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const newsletterSchema = z.object({
  email: z.email("Adresse email invalide"),
})

/**
 * POST /api/newsletter
 * Body : { email }
 * Inscrit (ou confirme) un abonné à la newsletter (upsert sur email unique).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = newsletterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Veuillez fournir une adresse email valide." },
        { status: 400 }
      )
    }

    const email = parsed.data.email.toLowerCase().trim()

    const existing = await db.newsletterSubscriber.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "Vous êtes déjà inscrit(e) à la newsletter. Merci !",
      })
    }

    await db.newsletterSubscriber.create({ data: { email } })

    return NextResponse.json({
      ok: true,
      message: "Merci ! Votre inscription à la newsletter est confirmée.",
    })
  } catch (error) {
    console.error("POST /api/newsletter error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/newsletter → 405 (méthode non autorisée) */
export async function GET() {
  return NextResponse.json(
    { error: "Méthode non autorisée" },
    { status: 405 }
  )
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.email("Adresse email invalide"),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(1, "Le message est requis")
    .max(5000),
})

/**
 * POST /api/contact
 * Body : { name, email, subject?, message }
 * Enregistre un message de contact.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "Formulaire invalide."
      return NextResponse.json(
        { ok: false, error: firstError },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = parsed.data

    await db.contactMessage.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        subject: subject && subject.length > 0 ? subject : null,
        message,
      },
    })

    return NextResponse.json({
      ok: true,
      message: "Votre message a bien été envoyé.",
    })
  } catch (error) {
    console.error("POST /api/contact error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/contact → 405 (méthode non autorisée) */
export async function GET() {
  return NextResponse.json(
    { error: "Méthode non autorisée" },
    { status: 405 }
  )
}

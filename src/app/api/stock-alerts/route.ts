import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const alertSchema = z.object({
  productId: z.string().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Adresse email invalide")
    .max(160),
})

/**
 * POST /api/stock-alerts
 * Body : { productId, email }
 * Inscrit le client à l'alerte de réassort d'un produit en rupture.
 * Upsert (contrainte unique email+produit) → pas de doublon.
 * L'admin déclenche les notifications depuis /?page=admin au réassort.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    const limit = checkRateLimit(`stock-alert:${ip}`, 10, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Trop de tentatives. Réessayez dans un instant." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = alertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Requête invalide.",
        },
        { status: 400 }
      )
    }

    const { productId, email } = parsed.data

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, name: true },
    })
    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Produit non trouvé" },
        { status: 404 }
      )
    }

    const result = await db.stockAlert.upsert({
      where: { email_productId: { email, productId } },
      update: { notified: false },
      create: { email, productId },
    })

    // TODO e-commerce avancé : envoi automatique de l'email dès le
    // réassort (cron ou hook sur PATCH /api/admin/products).
    console.log(
      `[STOCK-ALERT] ${email} → ${product.name} (inscrit, notified=${result.notified})`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/stock-alerts error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/** GET /api/stock-alerts → 405 (consultation via /api/admin/messages) */
export async function GET() {
  return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 })
}

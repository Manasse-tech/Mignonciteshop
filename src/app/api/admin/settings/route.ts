import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import {
  getStoreSettings,
  invalidateSettingsCache,
} from "@/lib/settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const settingsPatchSchema = z
  .object({
    shippingStandard: z.number().finite().min(0).max(100),
    shippingExpress: z.number().finite().min(0).max(100),
    shippingPickup: z.number().finite().min(0).max(100),
    freeShippingThreshold: z.number().finite().min(0).max(1000),
    lowStockThreshold: z.number().int().min(0).max(100),
  })
  .partial()

/**
 * GET /api/admin/settings — réglages courants de la boutique (admin).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  const settings = await getStoreSettings()
  return NextResponse.json(settings)
}

/**
 * PATCH /api/admin/settings — met à jour une partie des réglages.
 * Body : { shippingStandard?, shippingExpress?, shippingPickup?,
 *          freeShippingThreshold?, lowStockThreshold? }
 * Effet immédiat sur POST /api/orders (source de vérité serveur).
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = settingsPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.error.issues[0]?.message ??
            "Valeurs invalides (montants entre 0 et 1000).",
        },
        { status: 400 }
      )
    }

    const upserts = Object.entries(parsed.data).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
    await db.$transaction(upserts)
    invalidateSettingsCache()

    const settings = await getStoreSettings()
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error("PATCH /api/admin/settings error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

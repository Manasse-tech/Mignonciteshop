import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import {
  getStoreSettings,
  invalidateSettingsCache,
} from "@/lib/settings"
import { logAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const settingsPatchSchema = z
  .object({
    shippingStandard: z.number().finite().min(0).max(100),
    shippingExpress: z.number().finite().min(0).max(100),
    shippingPickup: z.number().finite().min(0).max(100),
    freeShippingThreshold: z.number().finite().min(0).max(1000),
    lowStockThreshold: z.number().int().min(0).max(100),
    // Paiement mobile money — structure réelle (pas de simulation) :
    // désactivé ⇒ POST /api/payments/initiate répond 503.
    paymentMobileMoneyEnabled: z.boolean(),
    paymentMobileMoneyNumber: z
      .string()
      .trim()
      .max(30)
      .regex(
        /^[+0-9 ().-]*$/,
        "Numéro invalide (chiffres, espaces, + - ( ) uniquement)."
      ),
    paymentInstructions: z.string().trim().max(600),
  })
  .partial()

/**
 * Sérialisation en base : booléens en "1"/"0" (convention Setting),
 * autres valeurs en texte décimal.
 */
function serializeSettingValue(value: number | boolean | string): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

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
        update: { value: serializeSettingValue(value) },
        create: { key, value: serializeSettingValue(value) },
      })
    )
    await db.$transaction(upserts)
    invalidateSettingsCache()
    await logAudit({ actor: admin.email, action: "settings.update", details: parsed.data })

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

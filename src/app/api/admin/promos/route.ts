import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import { logAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const promoCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code trop court")
    .max(30)
    .transform((value) => value.toUpperCase()),
  label: z.string().trim().min(2, "Libellé requis").max(120),
  type: z.enum(["percent", "freeship", "amount"]),
  value: z.number().finite().min(0).max(10000).default(0),
  minSubtotal: z.number().finite().min(0).max(100000).default(0),
  maxUses: z.number().int().min(1).max(1000000).nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
})

const promoUpdateSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(2).max(120).optional(),
  type: z.enum(["percent", "freeship", "amount"]).optional(),
  value: z.number().finite().min(0).max(10000).optional(),
  minSubtotal: z.number().finite().min(0).max(100000).optional(),
  maxUses: z.number().int().min(1).max(1000000).nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/admin/promos — liste des codes promo avec statistiques d'usage.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const promos = await db.promoCode.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(promos)
  } catch (error) {
    console.error("GET /api/admin/promos error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/promos — création d'un code promo.
 * Règles de cohérence : percent ≤ 100, amount > 0, freeship sans valeur.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = promoCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Code promo invalide.",
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    if (data.type === "percent" && data.value > 100) {
      return NextResponse.json(
        { ok: false, error: "Une remise en % ne peut pas dépasser 100." },
        { status: 400 }
      )
    }

    const existing = await db.promoCode.findUnique({ where: { code: data.code } })
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Ce code existe déjà." },
        { status: 409 }
      )
    }

    const promo = await db.promoCode.create({
      data: {
        code: data.code,
        label: data.label,
        type: data.type,
        value: data.type === "freeship" ? 0 : data.value,
        minSubtotal: data.minSubtotal,
        maxUses: data.maxUses ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
      },
    })
    await logAudit({ actor: admin.email, action: "promo.create", target: promo.code, details: { type: promo.type, value: promo.value, minSubtotal: promo.minSubtotal } })
    return NextResponse.json({ ok: true, promo })
  } catch (error) {
    console.error("POST /api/admin/promos error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/promos — édition / activation-désactivation.
 * Body : { id, ...champs }
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = promoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Requête invalide." },
        { status: 400 }
      )
    }

    const { id, ...fields } = parsed.data
    const existing = await db.promoCode.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Code promo non trouvé" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (fields.label !== undefined) updateData.label = fields.label
    if (fields.type !== undefined) updateData.type = fields.type
    if (fields.value !== undefined && fields.type !== "freeship") {
      updateData.value = fields.value
    }
    if (fields.minSubtotal !== undefined) updateData.minSubtotal = fields.minSubtotal
    if (fields.maxUses !== undefined) updateData.maxUses = fields.maxUses
    if (fields.expiresAt !== undefined) {
      updateData.expiresAt = fields.expiresAt ? new Date(fields.expiresAt) : null
    }
    if (fields.isActive !== undefined) updateData.isActive = fields.isActive

    const promo = await db.promoCode.update({ where: { id }, data: updateData })
    await logAudit({ actor: admin.email, action: "promo.update", target: promo.code, details: { fields: Object.keys(updateData), isActive: updateData.isActive } })
    return NextResponse.json({ ok: true, promo })
  } catch (error) {
    console.error("PATCH /api/admin/promos error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/promos — suppression définitive d'un code.
 * Body : { id }
 */
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const id = (body as { id?: string } | null)?.id
    if (!id) {
      return NextResponse.json({ ok: false, error: "id requis" }, { status: 400 })
    }

    const existing = await db.promoCode.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Code promo non trouvé" },
        { status: 404 }
      )
    }

    await db.promoCode.delete({ where: { id } })
    await logAudit({ actor: admin.email, action: "promo.delete", target: existing.code })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/admin/promos error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

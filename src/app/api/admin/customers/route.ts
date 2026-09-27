import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"
import { round2 } from "@/lib/order-pricing"
import { logAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/customers?q=recherche — liste des comptes avec
 * leurs statistiques d'achat (rapprochement par email : les commandes
 * invitées ne portent pas de userId, uniquement l'email).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? ""

    const [users, orders] = await Promise.all([
      db.user.findMany({
        where: q
          ? {
              OR: [
                { email: { contains: q } },
                { name: { contains: q } },
              ],
            }
          : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          emailVerified: true,
        },
      }),
      db.order.findMany({
        select: {
          email: true,
          status: true,
          total: true,
          createdAt: true,
        },
      }),
    ])

    // Agrégats par email (hors commandes annulées).
    const statsByEmail = new Map<
      string,
      { ordersCount: number; totalSpent: number; lastOrderAt: string | null }
    >()
    for (const order of orders) {
      const entry = statsByEmail.get(order.email) ?? {
        ordersCount: 0,
        totalSpent: 0,
        lastOrderAt: null as string | null,
      }
      if (order.status !== "cancelled") {
        entry.ordersCount += 1
        entry.totalSpent = round2(entry.totalSpent + order.total)
      }
      if (
        !entry.lastOrderAt ||
        order.createdAt.getTime() > new Date(entry.lastOrderAt).getTime()
      ) {
        entry.lastOrderAt = order.createdAt.toISOString()
      }
      statsByEmail.set(order.email, entry)
    }

    const customers = users.map((user) => {
      const stats = statsByEmail.get(user.email.toLowerCase()) ?? {
        ordersCount: 0,
        totalSpent: 0,
        lastOrderAt: null,
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        ordersCount: stats.ordersCount,
        totalSpent: stats.totalSpent,
        lastOrderAt: stats.lastOrderAt,
      }
    })

    // Les clients avec historique d'abord, puis par date d'inscription.
    customers.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1
      if (b.role === "admin" && a.role !== "admin") return 1
      if (a.totalSpent !== b.totalSpent) return b.totalSpent - a.totalSpent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("GET /api/admin/customers error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

const rolePatchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["customer", "admin"]),
})

/**
 * PATCH /api/admin/customers — change le rôle d'un compte.
 * Garde-fou : un administrateur ne peut pas modifier son propre rôle
 * (évite de se verrouiller hors de l'espace admin par accident).
 */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const body = await request.json().catch(() => null)
    const parsed = rolePatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Requête invalide." },
        { status: 400 }
      )
    }

    if (parsed.data.id === admin.id) {
      return NextResponse.json(
        { ok: false, error: "Vous ne pouvez pas modifier votre propre rôle." },
        { status: 400 }
      )
    }

    const target = await db.user.findUnique({ where: { id: parsed.data.id } })
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "Compte non trouvé." },
        { status: 404 }
      )
    }

    const updated = await db.user.update({
      where: { id: parsed.data.id },
      data: { role: parsed.data.role },
      select: { id: true, role: true },
    })
    // Sécurité : si un admin est rétrogradé, ses sessions ouvertes
    // (potentiellement admin) sont révoquées immédiatement.
    if (target.role === "admin" && parsed.data.role === "customer") {
      await db.session.deleteMany({ where: { userId: target.id } })
    }
    await logAudit({
      actor: admin.email,
      action: "customer.role",
      target: target.email,
      details: { from: target.role, to: parsed.data.role },
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (error) {
    console.error("PATCH /api/admin/customers error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

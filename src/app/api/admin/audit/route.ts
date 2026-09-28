import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/audit — journal d'audit (actions admin sensibles).
 * Query : ?page=&limit=&action=
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const params = request.nextUrl.searchParams
    const page = Math.max(1, Number(params.get("page")) || 1)
    const limit = Math.min(100, Math.max(10, Number(params.get("limit")) || 30))
    const action = params.get("action")?.trim()

    const where: Record<string, unknown> = {}
    if (action) where.action = { contains: action }

    const [entries, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])
    return NextResponse.json({ entries, total, page, limit })
  } catch (error) {
    console.error("GET /api/admin/audit error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/emails — journal des e-mails transactionnels.
 * Query : ?page=&limit=&q=&template=
 * Consultable dans l'onglet E-mails de l'admin (provider « log »).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  try {
    const params = request.nextUrl.searchParams
    const page = Math.max(1, Number(params.get("page")) || 1)
    const limit = Math.min(100, Math.max(10, Number(params.get("limit")) || 25))
    const q = params.get("q")?.trim()
    const template = params.get("template")?.trim()

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [{ to: { contains: q } }, { subject: { contains: q } }]
    }
    if (template) where.template = template

    const [emails, total] = await Promise.all([
      db.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.emailLog.count({ where }),
    ])
    return NextResponse.json({ emails, total, page, limit })
  } catch (error) {
    console.error("GET /api/admin/emails error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

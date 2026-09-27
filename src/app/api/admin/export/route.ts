import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, unauthorized } from "@/lib/auth-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Échappe une valeur CSV (séparateur « ; » compatible Excel FR, guillemets). */
function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value)
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(";")]
  for (const row of rows) lines.push(row.map(csvCell).join(";"))
  // BOM UTF-8 : accents corrects à l'ouverture dans Excel.
  return "\uFEFF" + lines.join("\r\n")
}

function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

/**
 * GET /api/admin/export?type=orders|products|customers — export CSV (admin).
 * Téléchargement direct via <a download> ; la session cookie est envoyée
 * automatiquement (same-origin).
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return unauthorized()

  const type = request.nextUrl.searchParams.get("type") ?? "orders"
  const stamp = new Date().toISOString().slice(0, 10)

  try {
    if (type === "orders") {
      const orders = await db.order.findMany({
        orderBy: { createdAt: "desc" },
        include: { items: true },
      })
      const csv = toCsv(
        [
          "Référence",
          "Date",
          "Statut",
          "Client",
          "Email",
          "Téléphone",
          "Adresse",
          "Code postal",
          "Ville",
          "Pays",
          "Articles",
          "Sous-total (€)",
          "Remise (€)",
          "Livraison (€)",
          "Total (€)",
          "Code promo",
          "Mode livraison",
          "Paiement",
          "Statut paiement",
        ],
        orders.map((o) => [
          o.reference,
          o.createdAt.toISOString(),
          o.status,
          o.customerName,
          o.email,
          o.phone ?? "",
          [o.addressLine1, o.addressLine2].filter(Boolean).join(", "),
          o.postalCode,
          o.city,
          o.country,
          o.items.reduce((sum, i) => sum + i.quantity, 0),
          o.subtotal.toFixed(2),
          o.discount.toFixed(2),
          o.shippingCost.toFixed(2),
          o.total.toFixed(2),
          o.promoCode ?? "",
          o.shippingMethod,
          o.paymentMethod,
          o.paymentStatus,
        ])
      )
      return csvResponse(csv, `commandes-${stamp}.csv`)
    }

    if (type === "products") {
      const products = await db.product.findMany({
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true } } },
      })
      const csv = toCsv(
        [
          "Nom",
          "Catégorie",
          "Prix (€)",
          "Ancien prix (€)",
          "Stock",
          "Vendus",
          "Note",
          "Avis",
          "Actif",
          "Vedette",
          "Nouveau",
          "Créé le",
        ],
        products.map((p) => [
          p.name,
          p.category.name,
          p.price.toFixed(2),
          p.oldPrice?.toFixed(2) ?? "",
          p.stock,
          p.soldCount,
          p.rating,
          p.reviewCount,
          p.isActive ? "oui" : "non",
          p.isFeatured ? "oui" : "non",
          p.isNew ? "oui" : "non",
          p.createdAt.toISOString(),
        ])
      )
      return csvResponse(csv, `produits-${stamp}.csv`)
    }

    if (type === "customers") {
      const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { name: true, email: true, role: true, createdAt: true },
      })
      const orders = await db.order.findMany({
        select: { email: true, status: true, total: true },
      })
      const statsByEmail = new Map<string, { count: number; spent: number }>()
      for (const order of orders) {
        if (order.status === "cancelled") continue
        const entry = statsByEmail.get(order.email) ?? { count: 0, spent: 0 }
        entry.count += 1
        entry.spent += order.total
        statsByEmail.set(order.email, entry)
      }
      const csv = toCsv(
        ["Nom", "Email", "Rôle", "Inscription", "Commandes", "Total dépensé (€)"],
        users.map((u) => {
          const stats = statsByEmail.get(u.email.toLowerCase()) ?? {
            count: 0,
            spent: 0,
          }
          return [
            u.name ?? "",
            u.email,
            u.role,
            u.createdAt.toISOString(),
            stats.count,
            stats.spent.toFixed(2),
          ]
        })
      )
      return csvResponse(csv, `clients-${stamp}.csv`)
    }

    return NextResponse.json(
      { ok: false, error: "Type d'export inconnu." },
      { status: 400 }
    )
  } catch (error) {
    console.error("GET /api/admin/export error:", error)
    return NextResponse.json(
      { ok: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

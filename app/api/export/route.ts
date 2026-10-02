import { NextRequest, NextResponse } from 'next/server'
import { requireAdminLive } from '@/lib/auth'
import { getOrdersForExport, listNewsletterSubscribers } from '@/lib/backend'

// Échappe une valeur CSV (guillemets, virgules, retours ligne)
const esc = (value: unknown): string => {
  const s = String(value ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

// GET /api/export?type=clients|newsletter|commandes — téléchargement CSV (ADMIN UNIQUEMENT :
// les exports contiennent des données personnelles — faille S3 de l'audit, corrigée)
export async function GET(request: NextRequest) {
  const denied = await requireAdminLive(request)
  if (denied) return denied
  const type = request.nextUrl.searchParams.get('type') || 'clients'
  const now = new Date().toISOString().slice(0, 10)
  let csv = ''
  let filename = `export-${type}-${now}.csv`

  try {
    if (type === 'newsletter') {
      const subs = await listNewsletterSubscribers()
      csv =
        "Email;Date d'inscription\n" +
        subs.map((s) => `${esc(s.email)};${esc(new Date(s.createdAt).toLocaleDateString('fr-FR'))}`).join('\n')
      filename = `newsletter-${now}.csv`
    } else if (type === 'commandes') {
      // Export comptable : une ligne par commande, TVA indicative 20 % calculée depuis le total HT/TTC
      const orders = await getOrdersForExport()
      csv =
        'N° commande;Date;Client;Email;Téléphone;Adresse;CP;Ville;Pays;Mode paiement;Mode livraison;Articles;Sous-total HT (€);Livraison (€);Remise (€);Total TTC (€);TVA 20% estimée (€);Statut\n' +
        orders
          .map((o) => {
            const date = new Date(o.createdAt).toLocaleDateString('fr-FR')
            const articles = o.items.reduce((n, it) => n + it.quantity, 0)
            const tva = (o.total / 1.2) * 0.2
            const statut =
              o.status === 'confirmee' ? 'Confirmée' : o.status === 'expediee' ? 'Expédiée' : o.status === 'livree' ? 'Livrée' : o.status === 'annulee' ? 'Annulée' : o.status
            return [
              o.orderNumber, date, o.customerName, o.customerEmail, o.phone || '',
              o.address, o.postalCode || '', o.city, o.country,
              o.paymentMethod === 'card' ? 'Carte bancaire' : o.paymentMethod === 'paypal' ? 'PayPal' : o.paymentMethod,
              o.shippingMethod === 'standard' ? 'Standard' : o.shippingMethod === 'express' ? 'Express' : o.shippingMethod,
              articles, o.subtotal.toFixed(2), o.shipping.toFixed(2), o.discount.toFixed(2),
              o.total.toFixed(2), tva.toFixed(2), statut,
            ].map(esc).join(';')
          })
          .join('\n')
      filename = `comptabilite-commandes-${now}.csv`
    } else {
      // Clients = emails distincts ayant passé une commande + leurs statistiques
      const orders = await getOrdersForExport()
      const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const byEmail = new Map<
        string,
        { name: string; orders: number; total: number; last: string; city: string }
      >()
      for (const o of sorted) {
        const key = o.customerEmail.toLowerCase()
        const prev = byEmail.get(key)
        byEmail.set(key, {
          name: o.customerName,
          orders: (prev?.orders || 0) + 1,
          total: (prev?.total || 0) + o.total,
          last: !prev || o.createdAt > prev.last ? o.createdAt : prev.last,
          city: o.city,
        })
      }
      csv =
        'Nom;Email;Ville;Commandes;Total dépensé (€);Dernière commande\n' +
        Array.from(byEmail.entries())
          .sort((a, b) => b[1].total - a[1].total)
          .map(
            ([email, c]) =>
              `${esc(c.name)};${esc(email)};${esc(c.city)};${c.orders};${c.total.toFixed(2)};${esc(
                new Date(c.last).toLocaleDateString('fr-FR'),
              )}`,
          )
          .join('\n')
      filename = `clients-${now}.csv`
    }

    return new NextResponse('\uFEFF' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('GET /api/export', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

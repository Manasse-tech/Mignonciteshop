'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Download, FileSpreadsheet } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatPrice, formatDate } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/types'
import type { Order } from '@/lib/types'

export default function OrdersAdmin() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      setOrders(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q),
    )
  }, [orders, search])

  const updateStatus = async (order: Order, status: string) => {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast({ title: 'Statut mis à jour', description: `${order.orderNumber} → ${STATUS_LABELS[status]}` })
      await load()
    } else {
      toast({ title: 'Erreur', variant: 'destructive' })
    }
  }

  const exportCSV = () => {
    const headers = ['N° commande', 'Date', 'Client', 'Email', 'Téléphone', 'Total', 'Paiement', 'Statut', 'Adresse']
    const rows = filtered.map((o) => [
      o.orderNumber,
      formatDate(o.createdAt),
      o.customerName,
      o.customerEmail,
      o.phone || '',
      o.total.toFixed(2),
      o.paymentMethod,
      STATUS_LABELS[o.status] || o.status,
      `${o.address}, ${o.city}`,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes-mignoncite-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Export réussi', description: `${filtered.length} commande(s) exportée(s)` })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
      <p className="text-muted-foreground mt-1">Gérez et suivez les commandes de vos clients</p>

      <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-foreground">Commandes ({filtered.length})</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="h-9 pl-9 pr-4 rounded-md border border-border text-sm w-full sm:w-64 focus:outline-none focus:border-[#C9A961]"
              />
            </div>
            <button
              onClick={exportCSV}
              className="h-9 px-4 rounded-md bg-[#C9A961] hover:bg-[#b8994f] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Exporter CSV
            </button>
            <a
              href="/api/export?type=commandes"
              className="h-9 px-4 rounded-md border border-border hover:bg-muted/50 text-foreground text-sm font-medium inline-flex items-center gap-2 transition-colors"
              title="Export comptable complet : TVA, adresses, paiements"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export comptable
            </a>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground/80">Aucune commande trouvée.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">N° commande</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Client</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Téléphone</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Produits</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground text-right">Total</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground whitespace-nowrap">Paiement</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Adresse</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b hover:bg-muted/50 align-top">
                    <td className="py-3 px-2 font-medium text-foreground whitespace-nowrap">{o.orderNumber}</td>
                    <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    <td className="py-3 px-2">
                      <p className="font-medium text-foreground">{o.customerName}</p>
                      <p className="text-xs text-muted-foreground/80">{o.customerEmail}</p>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{o.phone || '—'}</td>
                    <td className="py-3 px-2">
                      {o.items.map((it) => (
                        <p key={it.id} className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {it.name} <span className="text-muted-foreground/80">× {it.quantity}</span>
                        </p>
                      ))}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold whitespace-nowrap">{formatPrice(o.total)}</td>
                    <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">{o.paymentMethod}</td>
                    <td className="py-3 px-2">
                      <p className="text-xs text-muted-foreground max-w-[220px]">{o.address}</p>
                      <p className="text-xs text-muted-foreground/80 max-w-[220px]">{o.city}</p>
                    </td>
                    <td className="py-3 px-2">
                      <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
                        <SelectTrigger className="w-36 h-8 text-xs rounded-md border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmee">Confirmée</SelectItem>
                          <SelectItem value="expediee">Expédiée</SelectItem>
                          <SelectItem value="livree">Livrée</SelectItem>
                          <SelectItem value="annulee">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

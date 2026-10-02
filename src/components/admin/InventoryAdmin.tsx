'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Minus, Plus, AlertTriangle, Package, TrendingDown, TrendingUp, CalendarClock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Order, Product } from '@/lib/types'

interface Forecast {
  velocity: number          // unités vendues par jour (moyenne 30 j)
  daysLeft: number | null   // jours de stock restants (null si jamais vendu)
  restock: number           // quantité conseillée pour 14 jours
}

export default function InventoryAdmin() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, number>>({})

  const load = async () => {
    setLoading(true)
    try {
      const [resP, resO] = await Promise.all([
        fetch('/api/products?includeInactive=true'),
        fetch('/api/orders'),
      ])
      const data: Product[] = await resP.json()
      const ordersData: Order[] = resO.ok ? await resO.json() : []
      setProducts(data)
      setOrders(ordersData)
      setDrafts(Object.fromEntries(data.map((p) => [p.id, p.stock])))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Prévisions de stock : vélocité de vente sur les 30 derniers jours (commandes non annulées)
  const forecasts = useMemo(() => {
    const map: Record<string, Forecast> = {}
    const now = Date.now()
    const sold30: Record<string, number> = {}
    for (const o of orders) {
      if (o.status === 'annulee') continue
      const age = now - new Date(o.createdAt).getTime()
      if (age > 30 * 24 * 3600 * 1000) continue
      for (const it of o.items) {
        if (!it.productId) continue
        sold30[it.productId] = (sold30[it.productId] || 0) + it.quantity
      }
    }
    for (const p of products) {
      const velocity = Math.round(((sold30[p.id] || 0) / 30) * 100) / 100
      const daysLeft = velocity > 0 ? Math.max(0, Math.round(p.stock / velocity)) : null
      const restock = velocity > 0 ? Math.ceil(velocity * 14) : 0
      map[p.id] = { velocity, daysLeft, restock }
    }
    return map
  }, [products, orders])

  const forecastBadge = (f: Forecast | undefined, stock: number) => {
    if (!f) return null
    if (stock === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 rounded-md px-2.5 py-1 text-xs font-semibold">
          <TrendingDown className="w-3.5 h-3.5" />
          {f.velocity > 0 ? 'Rupture — réappro. urgent' : 'Rupture'}
        </span>
      )
    }
    if (f.velocity === 0) {
      return <span className="text-xs text-muted-foreground/70">Vente lente</span>
    }
    if (f.daysLeft !== null && f.daysLeft <= 10) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 rounded-md px-2.5 py-1 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          ≈ {f.daysLeft} j — commander {f.restock} u.
        </span>
      )
    }
    if (f.daysLeft !== null && f.daysLeft <= 30) {
      return (
        <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 rounded-md px-2.5 py-1 text-xs font-semibold">
          <CalendarClock className="w-3.5 h-3.5" />
          ≈ {f.daysLeft} j
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-green-700 rounded-md px-2.5 py-1 text-xs font-semibold">
        <TrendingUp className="w-3.5 h-3.5" />
        ≈ {f.daysLeft} j de stock
      </span>
    )
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const lowStock = products.filter((p) => p.stock <= 10).length
  const outOfStock = products.filter((p) => p.stock === 0).length
  const totalUnits = products.reduce((s, p) => s + p.stock, 0)
  const urgentRestock = products.filter((p) => {
    const f = forecasts[p.id]
    return f && f.velocity > 0 && (p.stock === 0 || (f.daysLeft !== null && f.daysLeft <= 10))
  }).length

  const adjust = async (p: Product, delta: number) => {
    const newStock = Math.max(0, (drafts[p.id] ?? p.stock) + delta)
    setDrafts({ ...drafts, [p.id]: newStock })
    const res = await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock }),
    })
    if (res.ok) {
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, stock: newStock } : x)))
    }
  }

  const commit = async (p: Product) => {
    const value = drafts[p.id]
    if (value === undefined || value === p.stock) return
    const res = await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: value }),
    })
    if (res.ok) {
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, stock: value } : x)))
      toast({ title: 'Stock mis à jour', description: `${p.name} : ${value} unités` })
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Gestion du stock</h1>
      <p className="text-muted-foreground mt-1">Ajustez les niveaux de stock et anticipez les réapprovisionnements</p>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-card rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <span className="w-11 h-11 rounded-full bg-[#C9A961]/10 text-[#C9A961] flex items-center justify-center">
            <Package className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Références</p>
            <p className="text-xl font-bold text-foreground">{products.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <span className="w-11 h-11 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Unités totales en stock</p>
            <p className="text-xl font-bold text-foreground">{totalUnits}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <span className="w-11 h-11 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Alertes stock · ruptures</p>
            <p className="text-xl font-bold text-foreground">{lowStock} / {outOfStock}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <span className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <CalendarClock className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Réappro. urgents ≤ 10 j</p>
            <p className="text-xl font-bold text-foreground">{urgentRestock}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            className="h-9 pl-9 pr-4 rounded-md border border-border text-sm w-full focus:outline-none focus:border-[#C9A961]"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Produit</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Stock actuel</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Prévision 30 j</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Statut</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Ajuster</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const draft = drafts[p.id] ?? p.stock
                  return (
                    <tr key={p.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground/80">
                              {p.category?.name || '—'}
                              {(p.soldCount ?? 0) > 0 && <> · {(p.soldCount ?? 0).toLocaleString('fr-FR')} vendus</>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`font-bold text-lg ${draft <= 10 ? 'text-orange-500' : 'text-foreground'}`}>
                          {draft}
                        </span>
                        {draft !== p.stock && (
                          <span className="block text-xs text-muted-foreground/80">(actuel : {p.stock})</span>
                        )}
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell">
                        {forecastBadge(forecasts[p.id], p.stock)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {p.stock === 0 ? (
                          <span className="bg-red-100 text-red-800 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                            Rupture
                          </span>
                        ) : p.stock <= 10 ? (
                          <span className="bg-orange-100 text-orange-800 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                            Stock faible
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-800 rounded-md px-2.5 py-0.5 text-xs font-semibold">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => adjust(p, -1)}
                            className="h-9 w-9 rounded-md border inline-flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Diminuer le stock"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={draft}
                            onChange={(e) => setDrafts({ ...drafts, [p.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                            onBlur={() => commit(p)}
                            className="w-20 h-9 text-center rounded-md border border-border focus:outline-none focus:border-[#C9A961]"
                          />
                          <button
                            onClick={() => adjust(p, 1)}
                            className="h-9 w-9 rounded-md border inline-flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Augmenter le stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Méthodologie des prévisions */}
      <div className="mt-4 flex items-start gap-3 bg-muted/50 rounded-2xl p-4 text-sm text-muted-foreground">
        <CalendarClock className="w-4 h-4 text-[#C9A961] mt-0.5 flex-shrink-0" />
        <p>
          Prévisions calculées sur les ventes des 30 derniers jours (commandes confirmées, expédiées ou livrées) :
          vélocité moyenne → jours de stock restants → quantité conseillée pour couvrir 14 jours.
        </p>
      </div>
    </div>
  )
}

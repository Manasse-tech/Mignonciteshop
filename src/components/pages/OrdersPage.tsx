'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, CircleCheckBig, Truck, PackageOpen, Loader2 } from 'lucide-react'
import SectionHero from '@/components/shop/SectionHero'
import { useShopStore } from '@/store/useShopStore'
import { formatPrice, formatDateHour } from '@/lib/format'
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/lib/types'
import type { Order } from '@/lib/types'
import usePageMeta from '@/hooks/usePageMeta'
import { useSessionGate } from '@/hooks/useSessionGate'
import AuthGate from '@/components/pages/AuthGate'

const STATUS_ICONS: Record<string, typeof CircleCheckBig> = {
  confirmee: CircleCheckBig,
  expediee: Truck,
  livree: PackageOpen,
}

export default function OrdersPage() {
  usePageMeta("Mes commandes — MignonciteShop", "Suivez l'historique de vos commandes MignonciteShop : statut, suivi de livraison et détail de chaque commande.")
  const { navigate } = useShopStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('toutes')

  // Auth obligatoire (original Base44) : l'historique appartient au compte connecté
  const sessionStatus = useSessionGate()

  useEffect(() => {
    if (sessionStatus !== 'authed') return
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [sessionStatus])

  const counts = {
    toutes: orders.length,
    confirmee: orders.filter((o) => o.status === 'confirmee').length,
    expediee: orders.filter((o) => o.status === 'expediee').length,
    livree: orders.filter((o) => o.status === 'livree').length,
  }

  const filtered = filter === 'toutes' ? orders : orders.filter((o) => o.status === filter)

  // Murs de session (après TOUS les hooks — Rules of Hooks)
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
        <span className="sr-only">Vérification de la session…</span>
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A961]" aria-hidden="true" />
      </div>
    )
  }
  if (sessionStatus === 'anon') {
    return (
      <AuthGate
        title="Retrouvez vos commandes"
        message="Connectez-vous pour consulter l'historique, le statut et le suivi de vos commandes."
        returnTo="orders"
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SectionHero
        eyebrow="Mon compte"
        title="Historique des commandes"
        subtitle="Suivez le statut détaillé de toutes vos commandes"
        py="py-16"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'toutes', label: `Toutes (${counts.toutes})` },
            { id: 'confirmee', label: `Confirmée (${counts.confirmee})` },
            { id: 'expediee', label: `Expédiée (${counts.expediee})` },
            { id: 'livree', label: `Livrée (${counts.livree})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f.id ? 'bg-[#C9A961] text-white' : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-sm animate-pulse">
                <div className="h-5 bg-muted rounded w-1/3 mb-4" />
                <div className="h-16 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <PackageOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucune commande</h3>
            <p className="text-muted-foreground mb-6">Vous n&apos;avez pas encore passé de commande.</p>
            <button
              onClick={() => navigate('shop')}
              className="text-[#C9A961] font-medium hover:underline"
            >
              Découvrir la boutique
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const Icon = STATUS_ICONS[order.status] || CircleCheckBig
              return (
                <div key={order.id} className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b">
                    <div>
                      <span className="font-bold text-foreground">{order.orderNumber}</span>
                      <span className="text-sm text-muted-foreground ml-3">{formatDateHour(order.createdAt)}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASSES[order.status] || 'bg-muted text-foreground'}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4 overflow-x-auto py-1">
                    {order.items.slice(0, 6).map((item) => (
                      <div key={item.id} className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        { }
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PackageOpen className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 6 && (
                      <span className="text-sm text-muted-foreground/80 flex-shrink-0">+{order.items.length - 6}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} article(s)
                      </span>
                      <span className="font-bold text-[#C9A961] text-lg ml-4">{formatPrice(order.total)}</span>
                    </div>
                    <button
                      onClick={() => navigate('order-detail', { id: order.id })}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#C9A961] hover:gap-2 transition-all"
                    >
                      Voir les détails <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

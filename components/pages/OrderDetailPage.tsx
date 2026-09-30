'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, CircleCheckBig, Truck, PackageOpen, MapPin, CreditCard, Package, Loader2, Printer } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { formatPrice, formatDateHour } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/types'
import type { Order } from '@/lib/types'
import OrderInvoice from '@/components/shop/OrderInvoice'
import usePageMeta from '@/hooks/usePageMeta'

const TIMELINE = [
  { id: 'confirmee', label: 'Commande confirmée', icon: CircleCheckBig },
  { id: 'expediee', label: 'Colis expédié', icon: Truck },
  { id: 'livree', label: 'Colis livré', icon: PackageOpen },
]

export default function OrderDetailPage() {
  const { params, navigate } = useShopStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(!!params.id)
  const [lastId, setLastId] = useState(params.id)

  // SEO dynamique : le titre affiche le numéro de commande dès qu'il est chargé
  usePageMeta(
    order ? `Commande ${order.orderNumber} — MignonciteShop` : 'Détail de commande — MignonciteShop',
    'Consultez le détail de votre commande MignonciteShop : articles, adresse de livraison, paiement et statut.',
  )

  if (params.id !== lastId) {
    setLastId(params.id)
    setOrder(null)
    setLoading(!!params.id)
  }

  useEffect(() => {
    if (!params.id) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`)
        if (res.ok) {
          if (!cancelled) setOrder(await res.json())
        } else if (!cancelled) {
          setOrder(null)
        }
      } catch {
        if (!cancelled) setOrder(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A961] animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-foreground mb-4">Commande non trouvée</h2>
        <button onClick={() => navigate('orders')} className="text-[#C9A961] hover:underline">
          Retour à mes commandes
        </button>
      </div>
    )
  }

  const currentStep = TIMELINE.findIndex((t) => t.id === order.status)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('orders')}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-[#C9A961] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à mes commandes
        </button>

        {/* En-tête */}
        <div className="bg-card rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{order.orderNumber}</h1>
              <p className="text-sm text-muted-foreground mt-1">Passée le {formatDateHour(order.createdAt)}</p>
            </div>
            <span className="text-sm font-semibold text-foreground/80 bg-muted rounded-full px-4 py-2">
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-card rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-foreground mb-6">Suivi de la commande</h2>
          <div className="relative">
            {TIMELINE.map((step, i) => {
              const done = i <= currentStep
              const isLast = i === TIMELINE.length - 1
              return (
                <div key={step.id} className="flex gap-4 pb-8 last:pb-0 relative">
                  {!isLast && (
                    <div
                      className={`absolute left-[21px] top-11 bottom-0 w-0.5 ${
                        i < currentStep ? 'bg-[#C9A961]' : 'bg-muted'
                      }`}
                    />
                  )}
                  <span
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      done ? 'bg-[#C9A961] text-white' : 'bg-muted text-muted-foreground/80'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </span>
                  <div className="pt-2">
                    <p className={`font-semibold ${done ? 'text-foreground' : 'text-muted-foreground/80'}`}>{step.label}</p>
                    <p className="text-xs text-muted-foreground/80 mt-0.5">
                      {done
                        ? i === 0
                          ? formatDateHour(order.createdAt)
                          : 'Terminé'
                        : 'En attente'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Articles */}
          <div className="bg-card rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#C9A961]" /> Articles ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    { }
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-sm text-foreground">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Adresses + paiement */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#C9A961]" /> Adresse de livraison
              </h2>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">{order.customerName}</p>
                <p>{order.address}</p>
                <p>{order.postalCode} {order.city}</p>
                <p>{order.country}</p>
                {order.phone && <p>Tél : {order.phone}</p>}
                <p className="text-muted-foreground/80">{order.customerEmail}</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#C9A961]" /> Paiement
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{order.paymentMethod}</p>
              {order.shippingMethod && (
                <p className="text-sm text-muted-foreground mb-4">
                  Livraison : <span className="font-medium text-foreground">{order.shippingMethod === 'express' ? 'Express (24-48h)' : order.shippingMethod === 'relais' ? 'Point Relais' : 'Standard'}</span>
                </p>
              )}
              <div className="space-y-2 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Réduction {order.promoCode ? `(${order.promoCode})` : ''}</span>
                    <span className="font-medium">-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="font-medium">{order.shipping === 0 ? 'Gratuite' : formatPrice(order.shipping)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-bold text-[#C9A961]">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('tracking', { orderNumber: order.orderNumber })}
            className="inline-flex items-center gap-2 bg-[#C9A961] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
          >
            <Truck className="w-4 h-4" /> Suivre ce colis
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-full font-semibold text-foreground/80 hover:border-[#C9A961] hover:text-[#C9A961] transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimer la facture
          </button>
          <button
            onClick={() => navigate('shop')}
            className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-full font-semibold text-foreground/80 hover:border-[#C9A961] transition-colors"
          >
            Commander à nouveau
          </button>
        </div>
      </div>

      {/* Facture imprimable (invisible à l'écran) */}
      <OrderInvoice order={order} />
    </div>
  )
}

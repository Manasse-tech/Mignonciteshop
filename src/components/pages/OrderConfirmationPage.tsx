'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Package, ArrowRight, Mail, Truck, Sparkles, Printer, Loader2, Gift } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import OrderInvoice from '@/components/shop/OrderInvoice'
import type { Order } from '@/lib/types'
import usePageMeta from '@/hooks/usePageMeta'

export default function OrderConfirmationPage() {
  usePageMeta("Commande confirmée — MignonciteShop", "Merci pour votre commande ! Retrouvez le récapitulatif, le numéro de suivi et les prochaines étapes de livraison.")
  const { params, navigate } = useShopStore()
  const orderNumber = params.orderNumber || 'MCS-XXXXXXXX'
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  // Mode d'envoi réel ('resend') ou boîte d'attente ('outbox') — message toujours vrai
  const [emailMode, setEmailMode] = useState<'resend' | 'outbox' | null>(null)

  // Charge la commande pour permettre l'impression de la facture
  useEffect(() => {
    let cancelled = false
    fetch(`/api/orders?orderNumber=${encodeURIComponent(orderNumber)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((orders: Order[]) => {
        if (!cancelled && orders?.length > 0) setOrder(orders[0])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    fetch('/api/email-mode')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { mode?: 'resend' | 'outbox' } | null) => {
        if (!cancelled && d?.mode) setEmailMode(d.mode)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [orderNumber])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-card rounded-3xl shadow-sm p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-[#C9A961]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[#C9A961]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Merci pour votre commande !</h1>
          <p className="text-muted-foreground mb-8">
            Votre commande a été enregistrée avec succès.{' '}
            {emailMode === 'resend'
              ? 'Un email de confirmation vient de vous être envoyé.'
              : 'L\'email de confirmation est prêt dans la boîte d\'attente — son envoi s\'activera dès la configuration de Resend.'}
          </p>

          <div className="bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-2xl p-6 mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Numéro de commande</p>
            <p className="text-2xl font-mono font-bold text-[#C9A961]">{orderNumber}</p>
          </div>

          {/* Points fidélité gagnés (ajout non répertorié : 1 € hors livraison = 1 pt) */}
          {order && (
            <button
              onClick={() => navigate('fidelite')}
              className="w-full mb-8 group bg-black text-white rounded-2xl p-5 flex items-center justify-between hover:shadow-xl transition-all"
            >
              <span className="flex items-center gap-3 text-left">
                <span className="w-10 h-10 rounded-full bg-[#C9A961]/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-[#C9A961]" />
                </span>
                <span>
                  <span className="block font-semibold">+{Math.floor(Math.max(0, order.subtotal - order.discount))} points fidélité</span>
                  <span className="block text-xs text-gray-400">Crédités sur votre carte Club MignonciteShop</span>
                </span>
              </span>
              <span className="text-[#C9A961] text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Voir mes points <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
            {[
              { icon: Mail, title: 'Confirmation', text: emailMode === 'outbox' ? 'Récapitulatif prêt — visible dans l\'admin (onglet Emails).' : 'Un récapitulatif vous a été envoyé par email.' },
              { icon: Package, title: 'Préparation', text: 'Votre colis est préparé sous 24-48h ouvrées.' },
              { icon: Truck, title: 'Expédition', text: 'Livraison sous 3-5 jours ouvrés en France.' },
            ].map((item) => (
              <div key={item.title} className="bg-muted/50 rounded-xl p-4">
                <item.icon className="w-5 h-5 text-[#C9A961] mb-2" />
                <p className="font-semibold text-foreground text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('tracking', { orderNumber })}
              className="inline-flex items-center justify-center gap-2 bg-[#C9A961] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
            >
              Suivre ma commande <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.print()}
              disabled={!order}
              className="inline-flex items-center justify-center gap-2 border border-border px-8 py-4 rounded-full font-semibold text-foreground/80 hover:border-[#C9A961] hover:text-[#C9A961] transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              Imprimer la facture
            </button>
            <button
              onClick={() => navigate('shop')}
              className="inline-flex items-center justify-center gap-2 border border-border px-8 py-4 rounded-full font-semibold text-foreground/80 hover:border-[#C9A961] transition-colors"
            >
              <Sparkles className="w-5 h-5" /> Continuer mes achats
            </button>
          </div>
        </div>
      </div>

      {/* Facture imprimable (invisible à l'écran) */}
      {order && <OrderInvoice order={order} />}
    </div>
  )
}

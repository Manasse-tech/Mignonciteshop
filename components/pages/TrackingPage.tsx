'use client'

import { useState } from 'react'
import { Truck, Search, MapPin, Package, Warehouse, ClipboardCheck, CheckCircle2, Loader2, CircleDashed } from 'lucide-react'
import SectionHero from '@/components/shop/SectionHero'
import { formatPrice, formatDateHour } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import type { Order } from '@/lib/types'
import usePageMeta from '@/hooks/usePageMeta'
import { useShopStore } from '@/store/useShopStore'

// 5 étapes originales (bundle : pending / confirmed / processing / shipped / delivered)
const TRACK_STEPS = [
  { id: 'pending', label: 'Commande reçue', desc: 'Votre commande a été enregistrée.', icon: Warehouse },
  { id: 'confirmed', label: 'Confirmée', desc: 'Votre commande a été confirmée.', icon: ClipboardCheck },
  { id: 'processing', label: 'En préparation', desc: 'Vos articles sont préparés dans notre entrepôt.', icon: Package },
  { id: 'shipped', label: 'Expédiée', desc: 'Votre colis est parti de notre entrepôt.', icon: Truck },
  { id: 'delivered', label: 'Livré', desc: 'Votre colis a été livré. Bonne réception !', icon: CheckCircle2 },
]

export default function TrackingPage() {
  usePageMeta("Suivi de commande — MignonciteShop", "Suivez votre commande MignonciteShop en temps réel : numéro de suivi, étapes de préparation, expédition et livraison.")
  const { params, navigate } = useShopStore()
  const { toast } = useToast()
  const [orderNumber, setOrderNumber] = useState(params.orderNumber || '')
  const [searching, setSearching] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [searched, setSearched] = useState(false)

  const handleTrack = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!orderNumber.trim()) return
    setSearching(true)
    setSearched(false)
    setOrder(null)
    try {
      const res = await fetch(`/api/orders?search=${encodeURIComponent(orderNumber.trim().toUpperCase())}`)
      const orders: Order[] = await res.json()
      const found = orders.find((o) => o.orderNumber.toUpperCase() === orderNumber.trim().toUpperCase())
      // fallback: chercher par id
      let result = found
      if (!result) {
        const res2 = await fetch(`/api/orders/${orderNumber.trim()}`)
        if (res2.ok) result = await res2.json()
      }
      if (result) {
        setOrder(result)
      } else {
        toast({
          title: 'Commande introuvable',
          description: 'Vérifiez votre numéro de commande (ex : MCS-XXXXXXXX).',
          variant: 'destructive',
        })
      }
      setSearched(true)
    } catch {
      toast({ title: 'Erreur', description: 'La recherche a échoué', variant: 'destructive' })
    } finally {
      setSearching(false)
    }
  }

  const statusStepMap: Record<string, number> = {
    confirmee: 1,
    expediee: 3,
    livree: 4,
  }
  const currentStep = order ? (statusStepMap[order.status] ?? 0) : -1

  return (
    <div className="min-h-screen bg-background">
      <SectionHero
        icon={Truck}
        title="Suivi de livraison"
        subtitle="Saisissez votre numéro de commande pour connaître l'état de livraison de vos articles en temps réel."
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Formulaire */}
        <div className="bg-card rounded-2xl p-6 shadow-sm mb-8">
          <form onSubmit={handleTrack}>
            <label htmlFor="tracking-number" className="block text-sm font-medium text-foreground mb-2">
              Numéro de commande
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/80" />
                <input
                  id="tracking-number"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="ex: MCS-XXXXXXXX"
                  className="w-full h-12 pl-10 pr-4 rounded-lg border border-border text-sm font-mono focus:outline-none focus:border-[#C9A961] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="h-12 px-6 rounded-lg bg-[#C9A961] hover:bg-[#b8994f] text-white font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {searching && <Loader2 className="w-4 h-4 animate-spin" />}
                Suivre ma commande
              </button>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-2">
              Vous trouverez votre numéro de commande dans l&apos;email de confirmation.
            </p>
          </form>
        </div>

        {/* Résultat */}
        {order && (
          <div className="bg-card rounded-2xl p-6 shadow-sm animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b">
              <div>
                <p className="font-bold text-foreground font-mono">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Commandée le {formatDateHour(order.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{order.items.length} article(s)</p>
                <p className="font-bold text-[#C9A961]">{formatPrice(order.total)}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {TRACK_STEPS.map((step, i) => {
                const done = i <= currentStep
                const isCurrent = i === currentStep
                return (
                  <div key={step.id} className="flex gap-4 pb-8 last:pb-0 relative">
                    {i < TRACK_STEPS.length - 1 && (
                      <div
                        className={`absolute left-[21px] top-11 bottom-0 w-0.5 ${
                          i < currentStep ? 'bg-[#C9A961]' : 'bg-muted'
                        }`}
                      />
                    )}
                    <span
                      className={`relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        done
                          ? 'bg-[#C9A961] text-white'
                          : 'bg-muted text-muted-foreground/80'
                      } ${isCurrent ? 'ring-4 ring-[#C9A961]/20' : ''}`}
                    >
                      {done ? <step.icon className="w-5 h-5" /> : <CircleDashed className="w-5 h-5" />}
                    </span>
                    <div className="pt-1.5">
                      <p className={`font-semibold text-sm ${done ? 'text-foreground' : 'text-muted-foreground/80'}`}>
                        {step.label}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-medium text-[#C9A961] bg-[#C9A961]/10 rounded-full px-2 py-0.5">
                            Étape actuelle
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Adresse de livraison (bloc original) */}
            <div className="border-t mt-6 pt-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Adresse de livraison</p>
                  <p>{order.customerName}</p>
                  <p>{order.address}</p>
                  <p>
                    {order.postalCode} {order.city}
                  </p>
                  <p>{order.country}</p>
                </div>
              </div>
            </div>

            {/* Articles suivis (ajout) */}
            <div className="border-t mt-6 pt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contenu du colis</p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      { }
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <p className="flex-1 text-sm text-foreground truncate">
                      {item.name} <span className="text-muted-foreground/80">× {item.quantity}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Voir le détail complet (navigation zustand, comme l'original) */}
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('order-detail', { id: order.id })}
                className="inline-flex items-center justify-center h-10 px-6 rounded-full border border-border bg-background shadow-sm text-sm font-medium text-foreground hover:bg-muted/50 hover:border-[#C9A961] transition-colors"
              >
                Voir le détail complet
              </button>
            </div>
          </div>
        )}

        {searched && !order && (
          <div className="text-center py-10 text-muted-foreground/80 text-sm">
            Aucune commande correspondante. Essayez avec un numéro au format MCS-XXXXXXXX.
          </div>
        )}
      </div>
    </div>
  )
}

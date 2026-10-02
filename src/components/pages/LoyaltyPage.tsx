'use client'

import { useEffect, useMemo, useState } from 'react'
import { Gift, Crown, Medal, Sparkles, Trophy, TrendingUp, ShoppingBag, ArrowRight, Info, CheckCircle2, Loader2 } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { formatDate } from '@/lib/format'
import usePageMeta from '@/hooks/usePageMeta'
import type { Order } from '@/lib/types'
import { useSessionGate } from '@/hooks/useSessionGate'
import AuthGate from '@/components/pages/AuthGate'

/** Paliers du programme : seuils en points, avantages associés */
const TIERS = [
  { id: 'decouverte', name: 'Découverte', min: 0, icon: Sparkles,
    perks: ['1 € dépensé = 1 point', 'Offres exclusives par email'] },
  { id: 'bronze', name: 'Bronze', min: 500, icon: Medal,
    perks: ['Livraison offerte dès 40 €', 'Accès anticipé aux ventes flash'] },
  { id: 'argent', name: 'Argent', min: 1500, icon: Medal,
    perks: ['-5 % sur les promotions', 'Retours étendus 45 jours'] },
  { id: 'or', name: 'Or', min: 3000, icon: Crown,
    perks: ['-10 % permanent', 'Livraison express offerte', 'Support prioritaire'] },
  { id: 'platine', name: 'Platine', min: 6000, icon: Trophy,
    perks: ['-15 % permanent', 'Avant-premières & cadeaux', 'Conseiller dédié'] },
] as const

const tierBadge: Record<string, string> = {
  decouverte: 'bg-muted text-muted-foreground',
  bronze: 'bg-amber-700/15 text-amber-700 dark:text-amber-400',
  argent: 'bg-gray-300/40 text-gray-700 dark:text-gray-300',
  or: 'bg-[#C9A961]/15 text-[#C9A961]',
  platine: 'bg-gradient-to-r from-[#C9A961]/25 to-gray-400/25 text-foreground',
}

interface LoyaltyApi {
  earned: number
  used: number
  balance: number
}

export default function LoyaltyPage() {
  usePageMeta('Programme de fidélité — MignonciteShop', 'Gagnez des points à chaque commande, convertissez-les en remise au paiement et profitez d\'avantages exclusifs : remises permanentes, livraisons offertes et avant-premières.')
  const { navigate } = useShopStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltyApi | null>(null)
  const [loading, setLoading] = useState(true)

  // Auth obligatoire (original Base44) : le solde et l'historique de points
  // appartiennent au compte connecté
  const sessionStatus = useSessionGate()

  useEffect(() => {
    if (sessionStatus !== 'authed') return
    Promise.all([
      fetch('/api/orders').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/loyalty').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([ordersData, loyaltyData]: [Order[], LoyaltyApi | null]) => {
        setOrders(ordersData)
        setLoyalty(loyaltyData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionStatus])

  // Solde officiel (gagnés − utilisés) depuis l'API dédiée ; fallback calcul local
  const totalPoints = loyalty?.balance ?? orders.reduce((s, o) => s + Math.floor(Math.max(0, o.subtotal - o.discount)) - (o.pointsUsed ?? 0), 0)
  const pointsUsedTotal = loyalty?.used ?? orders.reduce((s, o) => s + (o.pointsUsed ?? 0), 0)
  const ordersCount = orders.length

  const currentTier = useMemo(() => {
    let t: (typeof TIERS)[number] = TIERS[0]
    for (const tier of TIERS) if (totalPoints >= tier.min) t = tier
    return t
  }, [totalPoints])

  const nextTier = useMemo(() => TIERS.find((t) => t.min > totalPoints), [totalPoints])
  const progress = nextTier
    ? Math.min(100, Math.round(((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
    : 100

  // Historique : gains (par commande) + conversions de points en remise (négatif)
  const pointsHistory = useMemo(() => {
    const rows: { key: string; orderNumber: string; date: string; points: number; total: number; kind: 'earn' | 'redeem' }[] = []
    for (const o of orders) {
      const earned = Math.floor(Math.max(0, o.subtotal - o.discount))
      if (earned > 0) rows.push({ key: `e-${o.id}`, orderNumber: o.orderNumber, date: o.createdAt, points: earned, total: o.total, kind: 'earn' })
      if ((o.pointsUsed ?? 0) > 0) rows.push({ key: `r-${o.id}`, orderNumber: o.orderNumber, date: o.createdAt, points: -(o.pointsUsed ?? 0), total: o.total, kind: 'redeem' })
    }
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [orders])

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
        title="Votre club de fidélité"
        message="Connectez-vous pour consulter votre solde de points, vos paliers et convertir vos points en remises."
        returnTo="loyalty"
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero fidélité */}
      <div className="bg-card border-b relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#C9A961]/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-[#C9A961]/5 blur-3xl" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-[#C9A961]/10 text-[#C9A961] text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full">
                <Gift className="w-3.5 h-3.5" /> Club MignonciteShop
              </span>
              <h1 className="text-4xl font-bold text-foreground mt-4 leading-tight">
                Chaque achat vous rapproche de <span className="text-[#C9A961]">plus d&apos;avantages</span>
              </h1>
              <p className="text-muted-foreground mt-4 max-w-lg leading-relaxed">
                Cumulez des points à chaque commande, gravissez les cinq niveaux du programme
                et débloquez remises permanentes, livraisons offertes et avant-premières.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={() => navigate('shop')}
                  className="btn-shine inline-flex items-center gap-2 bg-[#C9A961] text-white px-7 py-3 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" /> Gagner des points
                </button>
                <button
                  onClick={() => navigate('orders')}
                  className="inline-flex items-center gap-2 border border-border px-7 py-3 rounded-full font-semibold text-foreground hover:border-[#C9A961] hover:text-[#C9A961] transition-colors"
                >
                  Mes commandes <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Carte membre */}
            <div className="relative rounded-3xl bg-black text-white p-8 shadow-2xl overflow-hidden">
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[#C9A961]/20 blur-2xl" aria-hidden />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">Carte de fidélité</p>
                  <p className="text-3xl font-bold mt-3">
                    {loading ? '…' : totalPoints.toLocaleString('fr-FR')}
                    <span className="text-base font-medium text-[#C9A961] ml-2">points</span>
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${tierBadge[currentTier.id]} !text-white !bg-[#C9A961]/20`}>
                  <currentTier.icon className="w-3.5 h-3.5" /> {currentTier.name}
                </span>
              </div>
              <div className="mt-6 relative">
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full gold-gradient rounded-full transition-all duration-700"
                    style={{ width: `${loading ? 0 : progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {nextTier
                    ? `Encore ${Math.max(0, nextTier.min - totalPoints).toLocaleString('fr-FR')} points pour atteindre le niveau ${nextTier.name}`
                    : 'Niveau maximum atteint — merci pour votre fidélité !'}
                </p>
              </div>
              <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10 text-sm text-gray-400 relative">
                <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[#C9A961]" /> {ordersCount} commande(s)</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#C9A961]" /> 1 € = 1 point</span>
                <span className="inline-flex items-center gap-1.5"><Gift className="w-4 h-4 text-[#C9A961]" /> 100 pts = 5 €</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        {/* Niveaux */}
        <section aria-labelledby="niveaux-titre">
          <h2 id="niveaux-titre" className="text-2xl md:text-3xl font-bold text-foreground mb-2">Les cinq niveaux</h2>
          <p className="text-muted-foreground mb-8">Vos points s&apos;accumulent toute l&apos;année : plus le niveau est élevé, plus les avantages grandissent.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {TIERS.map((tier) => {
              const reached = totalPoints >= tier.min
              const isCurrent = currentTier.id === tier.id
              return (
                <div
                  key={tier.id}
                  className={`rounded-2xl p-5 border transition-all duration-300 ${
                    isCurrent
                      ? 'border-[#C9A961] bg-[#C9A961]/5 shadow-md ring-1 ring-[#C9A961]/40'
                      : reached
                        ? 'border-border bg-card shadow-sm'
                        : 'border-border/60 bg-card/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center ${tierBadge[tier.id]}`}>
                      <tier.icon className="w-5 h-5" />
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A961] bg-[#C9A961]/10 px-2 py-1 rounded-full">
                        Votre niveau
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-foreground mt-3">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">{tier.min.toLocaleString('fr-FR')} pts</p>
                  <ul className="mt-3 space-y-1.5">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#C9A961] mt-0.5 flex-shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* Historique des points */}
        <section aria-labelledby="historique-titre">
          <h2 id="historique-titre" className="text-2xl md:text-3xl font-bold text-foreground mb-2">Historique des points</h2>
          <p className="text-muted-foreground mb-8">
            Les points sont crédités dès la confirmation (hors livraison) et déduits lors de leurs conversions en remise.
            {pointsUsedTotal > 0 && <> Solde converti en remises à ce jour : <span className="font-semibold text-foreground">{pointsUsedTotal.toLocaleString('fr-FR')} pts</span>.</>}
          </p>
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-14 text-center text-muted-foreground/80">Chargement…</div>
            ) : pointsHistory.length === 0 ? (
              <div className="py-14 text-center">
                <Gift className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune commande pour l&apos;instant. Passez votre première commande pour cumuler des points !</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto shop-scrollbar">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b">
                      <th className="text-left py-3 px-5 font-medium text-muted-foreground">Commande</th>
                      <th className="text-left py-3 px-5 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-5 font-medium text-muted-foreground">Opération</th>
                      <th className="text-right py-3 px-5 font-medium text-muted-foreground">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsHistory.map((row) => (
                      <tr
                        key={row.key}
                        className={`border-b hover:bg-muted/50 transition-colors ${row.kind === 'earn' ? 'cursor-pointer' : ''}`}
                        onClick={() => row.kind === 'earn' && navigate('order-detail', { id: row.key.slice(2) })}
                      >
                        <td className="py-3.5 px-5 font-medium text-[#C9A961]">{row.orderNumber}</td>
                        <td className="py-3.5 px-5 text-muted-foreground">{formatDate(row.date)}</td>
                        <td className="py-3.5 px-5 text-muted-foreground">
                          {row.kind === 'earn' ? 'Achat' : 'Conversion en remise'}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`inline-flex items-center gap-1 font-bold ${row.kind === 'earn' ? 'text-green-600' : 'text-orange-500'}`}>
                            {row.points > 0 ? `+${row.points}` : row.points.toLocaleString('fr-FR')}
                            <Gift className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Comment ça marche */}
        <section aria-labelledby="comment-titre">
          <h2 id="comment-titre" className="text-2xl md:text-3xl font-bold text-foreground mb-8">Comment ça marche ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Commandez', text: 'Chaque euro dépensé (hors livraison) vous rapporte automatiquement 1 point fidélité.' },
              { step: '2', title: 'Cumulez', text: 'Vos points s\'additionnent commande après commande et débloquent les niveaux Bronze, Argent, Or puis Platine.' },
              { step: '3', title: 'Profitez', text: 'Au paiement, convertissez vos points par blocs de 100 (100 pts = 5 € de remise immédiate) et profitez des avantages de votre niveau.' },
            ].map((s) => (
              <div key={s.step} className="relative bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="w-10 h-10 rounded-full gold-gradient text-black font-bold flex items-center justify-center mb-4">
                  {s.step}
                </span>
                <h3 className="font-bold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-2xl p-4 text-sm text-muted-foreground">
            <Info className="w-4 h-4 text-[#C9A961] mt-0.5 flex-shrink-0" />
            <p>
              Démonstration : cette page agrège l&apos;historique de commandes disponible sur la boutique.
              Dans une version connectée, chaque client retrouve ici son propre solde et ses avantages.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

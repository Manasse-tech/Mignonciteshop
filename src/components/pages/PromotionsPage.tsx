'use client'

import { useMemo, useState } from 'react'
import { Search, Tag } from 'lucide-react'
import { useData } from './AppShell'
import ProductCard from '@/components/shop/ProductCard'
import { discountPercent, formatPrice } from '@/lib/format'
import usePageMeta from '@/hooks/usePageMeta'
import FlashCountdown from '@/components/shop/FlashCountdown'

export default function PromotionsPage() {
  usePageMeta("Promotions & Offres — MignonciteShop", "Profitez de nos meilleures promotions : remises jusqu'à -31 % sur l'électronique, le sport et la mode. Offres valables dans la limite des stocks disponibles.")
  const { products, loading } = useData()
  const [search, setSearch] = useState('')

  const promos = useMemo(() => products.filter((p) => p.oldPrice), [products])
  const filtered = useMemo(() => {
    if (!search.trim()) return promos
    const q = search.toLowerCase()
    return promos.filter((p) => p.name.toLowerCase().includes(q))
  }, [promos, search])

  const maxSaving = useMemo(
    () => promos.reduce((max, p) => Math.max(max, (p.oldPrice ?? 0) - p.price), 0),
    [promos],
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-black text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Tag className="w-12 h-12 text-[#C9A961] mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold">Promotions</h1>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto">
            Profitez de nos meilleures offres et réductions sur une sélection de produits.
          </p>
          <div className="mt-8 flex justify-center">
            <FlashCountdown />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Bandeau info */}
        <div className="bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-2xl p-6 mb-8 flex items-center gap-4">
          <div className="p-3 bg-[#C9A961] rounded-xl flex-shrink-0">
            <Tag className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {loading ? '…' : `${promos.length} produit(s) en promotion`}
            </p>
            <p className="text-sm text-muted-foreground">
              Jusqu&apos;à {formatPrice(maxSaving)} d&apos;économie !
            </p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/80" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une promotion..."
            className="w-full h-12 pl-10 pr-4 rounded-full border border-border bg-card text-sm focus:outline-none focus:border-[#C9A961] transition-colors"
          />
        </div>

        {/* Grille produits */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Tag className="w-12 h-12 text-muted-foreground/80 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Aucune promotion trouvée</h3>
            <p className="text-muted-foreground">Revenez bientôt, de nouvelles offres arrivent régulièrement !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p) => (
              <div key={p.id} className="relative">
                <span className="absolute -top-2 -right-2 z-20 bg-black text-[#C9A961] text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  Éco. {formatPrice((p.oldPrice ?? 0) - p.price)}
                </span>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}

        {/* Codes promo (ajout non répertorié) */}
        <div className="mt-16 bg-card rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-foreground mb-2">Codes promo actifs</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Utilisez ces codes lors du paiement pour bénéficier d&apos;avantages supplémentaires.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { code: 'BIENVENUE10', label: '-10% sur votre première commande' },
              { code: 'MIGNON15', label: '-15 € immédiats dès 100 € d\'achat' },
              { code: 'LIVRAISONFREE', label: 'Livraison offerte, sans minimum' },
            ].map((c) => (
              <div key={c.code} className="border-2 border-dashed border-[#C9A961]/40 bg-[#C9A961]/5 rounded-xl p-4 text-center">
                <p className="font-mono font-bold text-[#C9A961] text-lg tracking-wider">{c.code}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

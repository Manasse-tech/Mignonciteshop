'use client'

import { useMemo, useState } from 'react'
import { Plus, ShoppingBag, BadgePercent, Check } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { useData } from '@/components/pages/AppShell'
import { formatPrice } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/lib/types'

/**
 * « Fréquemment achetés ensemble » : pack de 3 produits complémentaires
 * (produit courant + 2 suggestions) avec remise pack de -5 % et ajout groupé
 * au panier en un clic. Non répertorié dans le ZIP d'origine (ajout).
 */
export default function FrequentlyBoughtTogether({ product }: { product: Product }) {
  const { products } = useData()
  const { addToCart, navigate } = useShopStore()
  const { toast } = useToast()
  const [added, setAdded] = useState(false)

  const BUNDLE_DISCOUNT = 0.05

  const companions = useMemo(() => {
    const sameCategory = products.filter(
      (p) => p.id !== product.id && p.categoryId === product.categoryId && p.stock > 0,
    )
    const others = products.filter(
      (p) => p.id !== product.id && p.categoryId !== product.categoryId && p.stock > 0 && p.rating >= 4.5,
    )
    return [...sameCategory, ...others].slice(0, 2)
  }, [products, product])

  const pack = useMemo(() => [product, ...companions], [product, companions])
  const totalRaw = pack.reduce((sum, p) => sum + p.price, 0)
  const totalWithDiscount = totalRaw * (1 - BUNDLE_DISCOUNT)
  const savings = totalRaw - totalWithDiscount

  if (companions.length < 2) return null

  const handleAddPack = () => {
    pack.forEach((p) => addToCart(p, 1))
    setAdded(true)
    toast({
      title: 'Pack ajouté au panier !',
      description: `3 articles · Vous économisez ${formatPrice(savings)}`,
      action: (
        <button
          onClick={() => navigate('cart')}
          className="text-xs font-semibold text-[#C9A961] hover:underline"
        >
          Voir le panier
        </button>
      ),
    })
    setTimeout(() => setAdded(false), 4000)
  }

  return (
    <section aria-label="Fréquemment achetés ensemble" className="mb-16">
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Fréquemment achetés ensemble</h2>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          {/* Produits du pack */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3">
            {pack.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <button
                  onClick={() => navigate('product', { id: p.id })}
                  className={`relative flex-1 min-w-0 group rounded-xl overflow-hidden border-2 bg-background transition-colors ${
                    i === 0 ? 'border-[#C9A961]' : 'border-border hover:border-[#C9A961]/50'
                  }`}
                >
                  <span className="block aspect-square overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </span>
                  {i === 0 && (
                    <span className="absolute top-2 left-2 bg-[#C9A961] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Cet article
                    </span>
                  )}
                  <span className="block px-2 py-2 text-left">
                    <span className="block text-[11px] sm:text-xs font-medium text-foreground truncate">
                      {p.name}
                    </span>
                    <span className="block text-[11px] sm:text-xs font-bold text-[#C9A961]">
                      {formatPrice(p.price)}
                    </span>
                  </span>
                </button>
                {i < pack.length - 1 && (
                  <Plus className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          {/* Récap pack */}
          <div className="lg:w-72 flex-shrink-0 lg:border-l lg:border-border lg:pl-8 space-y-3">
            <div className="flex items-center gap-2">
              <BadgePercent className="w-4 h-4 text-[#C9A961]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#C9A961]">
                Remise pack -5 %
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total du pack :{' '}
                <span className="line-through text-muted-foreground/70">{formatPrice(totalRaw)}</span>
              </p>
              <p className="text-2xl font-bold text-foreground">
                {formatPrice(totalWithDiscount)}
                <span className="ml-2 text-sm font-semibold text-green-600">
                  Économisez {formatPrice(savings)}
                </span>
              </p>
            </div>
            <button
              onClick={handleAddPack}
              disabled={product.stock <= 0}
              className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold transition-all active:scale-95 disabled:opacity-40 ${
                added
                  ? 'bg-green-600 text-white'
                  : 'btn-shine bg-[#C9A961] text-black hover:bg-[#b8994f] hover:text-black'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" /> Pack ajouté !
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" /> Ajouter les {pack.length} au panier
                </>
              )}
            </button>
            <p className="text-[11px] text-muted-foreground/80 text-center">
              Les trois articles sont ajoutés d&apos;un coup · Stock vérifié à la commande
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

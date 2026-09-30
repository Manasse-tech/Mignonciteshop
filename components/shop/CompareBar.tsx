'use client'

import { useState } from 'react'
import { GitCompareArrows, X, ShoppingBag, Check, Minus, Crown, Flame } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useShopStore } from '@/store/useShopStore'
import { useData } from '@/components/pages/AppShell'
import { formatPrice, discountPercent } from '@/lib/format'
import Stars from './Stars'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/lib/types'

export default function CompareBar() {
  const { compare, clearCompare, removeFromCompare } = useShopStore()
  const { products } = useData()
  const { toast } = useToast()

  const items = compare
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p)

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl animate-fade-up">
      <div className="bg-black text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 sm:gap-4">
        <span className="inline-flex items-center gap-2 text-sm font-semibold flex-shrink-0">
          <GitCompareArrows className="w-5 h-5 text-[#C9A961]" />
          <span className="hidden sm:inline">Comparateur</span>
          <span className="text-[#C9A961]">{items.length}/3</span>
        </span>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {items.map((p) => (
            <span key={p.id} className="relative flex-shrink-0">
              { }
              <img
                src={p.image}
                alt={p.name}
                className="w-11 h-11 rounded-lg object-cover border border-gray-700"
              />
              <button
                onClick={() => removeFromCompare(p.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label={`Retirer ${p.name} du comparateur`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {Array.from({ length: 3 - items.length }).map((_, i) => (
            <span key={i} className="w-11 h-11 rounded-lg border border-dashed border-gray-700 flex-shrink-0" />
          ))}
        </div>
        <CompareDialog items={items} />
        <button
          onClick={() => {
            clearCompare()
            toast({ title: 'Comparateur vidé' })
          }}
          className="p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
          aria-label="Vider le comparateur"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function CompareDialog({ items }: { items: Product[] }) {
  const [open, setOpen] = useState(false)
  const { addToCart } = useShopStore()
  const { toast } = useToast()
  const { navigate, removeFromCompare } = useShopStore()

  // Points forts mis en avant : prix le plus bas et meilleure note du comparateur
  const cheapestId = items.length > 1 ? items.reduce((a, b) => (b.price < a.price ? b : a)).id : null
  const bestRatedId = items.length > 1 ? items.reduce((a, b) => (b.rating > a.rating ? b : a)).id : null

  const rows: { label: string; render: (p: Product) => React.ReactNode }[] = [
    {
      label: 'Aperçu',
      render: (p) => (
        <div className="w-full aspect-square max-w-[130px] mx-auto rounded-xl overflow-hidden bg-muted">
          { }
          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
        </div>
      ),
    },
    {
      label: 'Catégorie',
      render: (p) => (
        <span className="text-[11px] uppercase tracking-wider text-[#C9A961] font-semibold">
          {p.category?.name || '—'}
        </span>
      ),
    },
    {
      label: 'Prix',
      render: (p) => (
        <span>
          {p.id === cheapestId && (
            <span className="block w-fit mx-auto mb-1 inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> Le moins cher
            </span>
          )}
          <span className={`font-bold ${p.id === cheapestId ? 'text-green-700' : 'text-foreground'}`}>{formatPrice(p.price)}</span>
          {p.oldPrice && <span className="block text-xs text-muted-foreground/70 line-through">{formatPrice(p.oldPrice)}</span>}
          {discountPercent(p.price, p.oldPrice) && (
            <span className="block text-xs text-red-500 font-semibold">-{discountPercent(p.price, p.oldPrice)}%</span>
          )}
        </span>
      ),
    },
    {
      label: 'Note',
      render: (p) => (
        <span>
          {p.id === bestRatedId && (
            <span className="block w-fit mx-auto mb-1 inline-flex items-center gap-1 bg-[#C9A961]/15 text-[#C9A961] text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> Mieux noté
            </span>
          )}
          <Stars rating={p.rating} size={13} showCount count={p.reviewCount} className="justify-center" />
        </span>
      ),
    },
    {
      label: 'Popularité',
      render: (p) =>
        (p.soldCount ?? 0) > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600">
            <Flame className="w-3.5 h-3.5" /> {(p.soldCount ?? 0).toLocaleString('fr-FR')} vendus
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      label: 'Disponibilité',
      render: (p) =>
        p.stock > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
            <Check className="w-3.5 h-3.5" /> En stock ({p.stock})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500">
            <Minus className="w-3.5 h-3.5" /> Rupture
          </span>
        ),
    },
    {
      label: 'Points clés',
      render: (p) => (
        <span className="text-xs text-muted-foreground line-clamp-4">
          {p.details?.split('·').map((d) => d.trim()).filter(Boolean).join(' · ') || p.description || '—'}
        </span>
      ),
    },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={items.length < 2}
        className="flex-shrink-0 h-10 px-4 rounded-full bg-[#C9A961] text-white text-sm font-semibold hover:bg-[#b8994f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Comparer
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="text-xl font-bold text-foreground">Comparaison des produits</DialogTitle>
          <DialogDescription className="sr-only">Comparez les caractéristiques des produits sélectionnés côte à côte.</DialogDescription>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr>
                  <th className="w-24" />
                  {items.map((p) => (
                    <th key={p.id} className="p-2 align-bottom">
                      <span className="block text-sm font-semibold text-foreground">{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t">
                    <td className="py-3 px-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide align-middle">
                      {row.label}
                    </td>
                    {items.map((p) => (
                      <td key={p.id} className="py-3 px-2 text-center align-middle">
                        {row.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="py-3 px-2 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                    Action
                  </td>
                  {items.map((p) => (
                    <td key={p.id} className="py-3 px-2 text-center">
                      <button
                        onClick={() => {
                          if (p.stock <= 0) return
                          addToCart(p, 1)
                          setOpen(false)
                          toast({ title: 'Ajouté au panier', description: p.name })
                        }}
                        disabled={p.stock <= 0}
                        className="inline-flex items-center gap-1.5 bg-[#C9A961] text-black text-xs font-medium px-3 py-2 rounded-full hover:bg-[#b8994f] hover:text-black transition-colors disabled:opacity-40"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td />
                  {items.map((p) => (
                    <td key={p.id} className="pb-3 text-center">
                      <button
                        onClick={() => {
                          removeFromCompare(p.id)
                          setOpen(false)
                        }}
                        className="text-xs text-muted-foreground hover:text-red-500 underline transition-colors"
                      >
                        Retirer
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Astuce : ajoutez un produit au comparateur depuis sa fiche ou son bouton « Comparer » en boutique.
          </p>
          <button
            onClick={() => {
              setOpen(false)
              navigate('shop')
            }}
            className="text-sm text-[#C9A961] hover:underline"
          >
            Voir plus de produits →
          </button>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ShoppingBag, X } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { formatPrice, discountPercent } from '@/lib/format'
import Stars from './Stars'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/lib/types'

export default function QuickViewDialog({ product, children }: { product: Product; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { addToCart, navigate } = useShopStore()
  const { toast } = useToast()
  const discount = discountPercent(product.price, product.oldPrice)

  const handleAdd = () => {
    addToCart(product, 1)
    setOpen(false)
    toast({ title: 'Ajouté au panier', description: `${product.name} a été ajouté à votre panier.` })
  }

  return (
    <>
      <span
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl">
          <DialogTitle className="sr-only">Aperçu de {product.name}</DialogTitle>
          <DialogDescription className="sr-only">Résumé du produit {product.name}, prix {formatPrice(product.price)}.</DialogDescription>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="relative aspect-square bg-muted">
              { }
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              {discount && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  -{discount}%
                </span>
              )}
            </div>
            <div className="p-6 flex flex-col">
              <p className="text-xs text-[#C9A961] font-medium uppercase tracking-wider mb-1">
                {product.category?.name || 'Produit'}
              </p>
              <h3 className="text-xl font-bold text-foreground mb-2">{product.name}</h3>
              <Stars rating={product.rating} count={product.reviewCount} showCount size={14} className="mb-3" />
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-foreground">{formatPrice(product.price)}</span>
                {product.oldPrice && (
                  <span className="text-base text-muted-foreground/70 line-through">{formatPrice(product.oldPrice)}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{product.description}</p>
              <div className="mt-auto space-y-2">
                <button
                  onClick={handleAdd}
                  className="w-full flex items-center justify-center gap-2 bg-[#C9A961] text-black px-4 py-3 rounded-full text-sm font-medium hover:bg-[#b8994f] hover:text-black transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" /> Ajouter au panier
                </button>
                <button
                  onClick={() => {
                    setOpen(false)
                    navigate('product', { id: product.id })
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-[#C9A961] transition-colors"
                >
                  Voir la fiche produit
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

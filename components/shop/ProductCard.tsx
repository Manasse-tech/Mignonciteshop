'use client'

import { Heart, Eye, ShoppingBag, GitCompareArrows, Flame } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { formatPrice, discountPercent } from '@/lib/format'
import Stars from './Stars'
import QuickViewDialog from './QuickViewDialog'
import { useToast } from '@/hooks/use-toast'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
}

/** Logique partagée entre la carte grille et la carte liste */
function useProductCardActions(product: Product) {
  const { navigate, addToCart, wishlist, toggleWishlist, compare, toggleCompare } = useShopStore()
  const { toast } = useToast()
  const discount = discountPercent(product.price, product.oldPrice)
  const isFavorite = wishlist.includes(product.id)
  const isCompared = compare.includes(product.id)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (product.stock <= 0) {
      toast({ title: 'Rupture de stock', description: 'Ce produit est momentanément indisponible.', variant: 'destructive' })
      return
    }
    addToCart(product, 1)
    toast({ title: 'Ajouté au panier', description: `${product.name} a été ajouté à votre panier.` })
  }

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isCompared && compare.length >= 3) {
      toast({ title: 'Comparateur plein', description: 'Retirez un produit avant d\'en ajouter un autre (max 3).' })
      return
    }
    toggleCompare(product.id)
    toast({
      title: isCompared ? 'Retiré du comparateur' : 'Ajouté au comparateur',
      description: isCompared ? product.name : `${product.name} (${Math.min(compare.length + 1, 3)}/3)`,
    })
  }

  return { navigate, toggleWishlist, toast, discount, isFavorite, isCompared, handleAdd, handleCompare }
}

/** Carte mode grille (défaut) */
export default function ProductCard({ product }: ProductCardProps) {
  const { navigate, toggleWishlist, discount, isFavorite, isCompared, handleAdd, handleCompare } =
    useProductCardActions(product)

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 hover:ring-1 hover:ring-[#C9A961]/40 transition-all duration-500">
      <div
        className="relative overflow-hidden aspect-square bg-muted cursor-pointer"
        onClick={() => navigate('product', { id: product.id })}
      >
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${
            product.stock === 0 ? 'grayscale opacity-70' : ''
          }`}
          loading="lazy"
        />

        {discount && (
          <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-md">
            -{discount}%
          </span>
        )}

        {/* Rupture de stock : image grisée + bandeau */}
        {product.stock === 0 && (
          <>
            <div className="absolute inset-0 bg-background/60 backdrop-grayscale z-10" />
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 mx-auto w-fit bg-black/85 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full">
              Rupture de stock
            </span>
          </>
        )}

        {product.isFeatured && (
          <span className="absolute top-4 right-4 bg-[#C9A961] text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-md">
            Vedette
          </span>
        )}

        {product.isNew && !product.isFeatured && (
          <span className="absolute top-4 right-4 bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 shadow-md">
            Nouveau
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleWishlist(product.id)
          }}
          className={`absolute top-4 right-4 z-20 p-2 rounded-full shadow-md bg-card/90 text-muted-foreground transition-all hover:text-[#C9A961] ${
            isFavorite
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          } ${product.isFeatured ? 'top-14' : 'top-4'}`}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#C9A961] text-[#C9A961]' : ''}`} />
        </button>

        {/* Barre d'actions au survol */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-10">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#C9A961] transition-colors shadow-lg active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            Ajouter
          </button>
          <QuickViewDialog product={product}>
            <button
              className="ml-2 p-2 bg-card rounded-full shadow-lg hover:bg-[#C9A961] hover:text-white transition-colors"
              aria-label="Aperçu rapide"
            >
              <Eye className="w-4 h-4" />
            </button>
          </QuickViewDialog>
          <button
            onClick={handleCompare}
            className={`ml-2 p-2 rounded-full shadow-lg transition-colors ${
              isCompared
                ? 'bg-[#C9A961] text-white'
                : 'bg-card hover:bg-[#C9A961] hover:text-white'
            }`}
            aria-label={isCompared ? 'Retirer du comparateur' : 'Ajouter au comparateur'}
            title="Comparer ce produit"
          >
            <GitCompareArrows className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button className="block w-full text-left p-4" onClick={() => navigate('product', { id: product.id })}>
        <p className="text-xs text-[#C9A961] font-medium uppercase tracking-wider mb-1">
          {product.category?.name || 'Produit'}
        </p>
        <h3 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-[#C9A961] transition-colors">
          {product.name}
        </h3>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Stars rating={product.rating} count={product.reviewCount} showCount />
          {(product.soldCount ?? 0) >= 20 && (
            <span className="inline-flex items-center gap-1 flex-shrink-0 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              {product.soldCount} vendus
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="text-sm text-muted-foreground/70 line-through">{formatPrice(product.oldPrice)}</span>
          )}
        </div>
        {product.stock > 0 && product.stock <= 10 && (
          <p className="text-xs text-orange-500 font-medium mt-1">Plus que {product.stock} en stock !</p>
        )}
        {product.stock === 0 && <p className="text-xs text-red-500 font-medium mt-1">Rupture de stock</p>}
      </button>
    </div>
  )
}

/** Carte mode liste : disposition horizontale, actions toujours visibles */
export function ProductListCard({ product }: ProductCardProps) {
  const { navigate, toggleWishlist, discount, isFavorite, isCompared, handleAdd, handleCompare } =
    useProductCardActions(product)

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:ring-1 hover:ring-[#C9A961]/40 transition-all duration-300 flex">
      <div
        className="relative w-28 sm:w-40 lg:w-44 flex-shrink-0 aspect-square bg-muted cursor-pointer overflow-hidden"
        onClick={() => navigate('product', { id: product.id })}
      >
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            product.stock === 0 ? 'grayscale opacity-70' : ''
          }`}
          loading="lazy"
        />
        {discount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-md">
            -{discount}%
          </span>
        )}
        {product.stock === 0 && (
          <>
            <div className="absolute inset-0 bg-background/60 backdrop-grayscale z-10" />
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 mx-auto w-fit bg-black/85 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full">
              Rupture
            </span>
          </>
        )}
        {product.isNew && !product.isFeatured && product.stock !== 0 && (
          <span className="absolute top-2 right-2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-md">
            Nouveau
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[#C9A961] font-medium uppercase tracking-wider mb-0.5">
              {product.category?.name || 'Produit'}
            </p>
            <button
              onClick={() => navigate('product', { id: product.id })}
              className="block text-left font-semibold text-foreground line-clamp-1 hover:text-[#C9A961] transition-colors"
            >
              {product.name}
            </button>
          </div>
          {product.isFeatured && (
            <span className="hidden sm:inline-flex flex-shrink-0 bg-[#C9A961] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              Vedette
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <Stars rating={product.rating} count={product.reviewCount} showCount />
          {(product.soldCount ?? 0) >= 20 && (
            <span className="inline-flex items-center gap-1 flex-shrink-0 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              <Flame className="w-3.5 h-3.5" />
              {product.soldCount} vendus
            </span>
          )}
        </div>

        {product.description && (
          <p className="hidden md:block text-sm text-muted-foreground line-clamp-2 mt-2">{product.description}</p>
        )}

        <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="text-sm text-muted-foreground/70 line-through">{formatPrice(product.oldPrice)}</span>
              )}
            </div>
            {product.stock > 0 && product.stock <= 10 ? (
              <p className="text-xs text-orange-500 font-medium mt-0.5">Plus que {product.stock} en stock !</p>
            ) : product.stock === 0 ? (
              <p className="text-xs text-red-500 font-medium mt-0.5">Rupture de stock</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#C9A961] shadow-md transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter au panier</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleWishlist(product.id)
              }}
              className="p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-[#C9A961] hover:border-[#C9A961]/50 transition-colors"
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#C9A961] text-[#C9A961]' : ''}`} />
            </button>
            <QuickViewDialog product={product}>
              <button
                className="hidden min-[420px]:block p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-[#C9A961] hover:border-[#C9A961]/50 transition-colors"
                aria-label="Aperçu rapide"
              >
                <Eye className="w-4 h-4" />
              </button>
            </QuickViewDialog>
            <button
              onClick={handleCompare}
              className={`p-2 rounded-full border transition-colors ${
                isCompared
                  ? 'bg-[#C9A961] border-[#C9A961] text-white'
                  : 'border-border bg-card text-muted-foreground hover:text-[#C9A961] hover:border-[#C9A961]/50'
              }`}
              aria-label={isCompared ? 'Retirer du comparateur' : 'Ajouter au comparateur'}
              title="Comparer ce produit"
            >
              <GitCompareArrows className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

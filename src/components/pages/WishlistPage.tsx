'use client'

import { Heart, ShoppingBag, ArrowLeft, Share2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useShopStore } from '@/store/useShopStore'
import { useData } from './AppShell'
import ProductCard from '@/components/shop/ProductCard'
import { useToast } from '@/hooks/use-toast'
import usePageMeta from '@/hooks/usePageMeta'

export default function WishlistPage() {
  usePageMeta("Mes favoris — MignonciteShop", "Retrouvez vos produits favoris MignonciteShop et ajoutez-les à votre panier en un clic.")
  const { navigate } = useShopStore()
  const { products, productsByIds, loading } = useData()
  const { wishlist, addToCart } = useShopStore()
  const { toast } = useToast()
  const [shared, setShared] = useState(false)

  const favorites = productsByIds(wishlist)

  // Partage de la liste : navigator.share (mobile) sinon copie du résumé dans le presse-papiers
  const shareWishlist = async () => {
    if (favorites.length === 0) return
    const summary = `Ma liste de favoris MignonciteShop (${favorites.length} produit${favorites.length > 1 ? 's' : ''}) :\n\n` +
      favorites.map((p, i) => `${i + 1}. ${p.name} — ${p.price.toFixed(2).replace('.', ',')} €`).join('\n') +
      `\n\nTotal : ${favorites.reduce((s, p) => s + p.price, 0).toFixed(2).replace('.', ',')} €\n` +
      window.location.origin + window.location.pathname + '?page=wishlist'
    const shareData = {
      title: 'Ma liste de favoris — MignonciteShop',
      text: summary,
      url: window.location.origin + window.location.pathname + '?page=wishlist',
    }
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData)
        return
      }
      // Copie presse-papiers avec double fallback (API async puis execCommand)
      let copied = false
      try {
        await navigator.clipboard.writeText(summary)
        copied = true
      } catch {
        const ta = document.createElement('textarea')
        ta.value = summary
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        copied = document.execCommand('copy')
        document.body.removeChild(ta)
      }
      if (copied) {
        setShared(true)
        setTimeout(() => setShared(false), 3000)
        toast({
          title: 'Liste copiée !',
          description: 'Le résumé de vos favoris est dans le presse-papiers, prêt à être partagé.',
        })
      } else {
        toast({ title: 'Partage impossible', description: 'Votre navigateur a refusé l\'accès au presse-papiers.', variant: 'destructive' })
      }
    } catch {
      // Partage annulé par l'utilisateur : silencieux
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
              <Heart className="w-8 h-8 fill-[#C9A961] text-[#C9A961]" /> Mes favoris
            </h1>
            <p className="text-muted-foreground mt-2">
              {loading ? '…' : `${favorites.length} produit(s) sauvegardé(s)`}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-muted-foreground/80" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Votre liste de favoris est vide</h3>
            <p className="text-muted-foreground mb-8">
              Cliquez sur le cœur des produits que vous aimez pour les retrouver ici.
            </p>
            <button
              onClick={() => navigate('shop')}
              className="inline-flex items-center gap-2 bg-[#C9A961] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Découvrir la boutique
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-end gap-3 mb-6">
              <button
                onClick={shareWishlist}
                disabled={favorites.length === 0}
                className="inline-flex items-center gap-2 border border-border bg-card text-foreground px-6 py-3 rounded-full text-sm font-semibold hover:border-[#C9A961] hover:text-[#C9A961] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {shared ? <Check className="w-4 h-4 text-green-600" /> : typeof navigator.share === 'function' ? <Share2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {shared ? 'Copié !' : 'Partager ma liste'}
              </button>
              <button
                onClick={() => {
                  favorites.forEach((p) => addToCart(p, 1))
                }}
                className="btn-shine inline-flex items-center gap-2 bg-[#C9A961] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#b8994f] transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> Tout ajouter au panier
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {favorites.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

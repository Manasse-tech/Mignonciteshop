'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Trash2, ArrowLeft, ArrowRight, Minus, Plus, Tag, CheckCircle2, Loader2, Ticket } from 'lucide-react'
import { useShopStore, cartSubtotal, cartCount, promoDiscount } from '@/store/useShopStore'
import { formatPrice } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import type { PromoCode } from '@/lib/types'
import usePageMeta from '@/hooks/usePageMeta'
import { useSessionGate } from '@/hooks/useSessionGate'
import AuthGate from '@/components/pages/AuthGate'

export default function CartPage() {
  usePageMeta("Mon panier | MignonciteShop", "Consultez et finalisez votre panier MignonciteShop : articles sélectionnés, codes promo et montant total avant commande.")
  const { cart, updateQuantity, removeFromCart, navigate, promo, setPromo } = useShopStore()
  const { toast } = useToast()
  const [promoInput, setPromoInput] = useState('')
  const [promoValidating, setPromoValidating] = useState(false)
  const [activePromos, setActivePromos] = useState<PromoCode[]>([])

  const subtotal = cartSubtotal(cart)
  const count = cartCount(cart)
  const discount = promoDiscount(promo, subtotal)
  const promoFreeShipping = promo?.type === 'shipping'
  const cartTotal = subtotal - discount + (promoFreeShipping || subtotal >= 50 ? 0 : 4.99)

  // Auth obligatoire (original Base44) : le panier appartient au compte connecté
  // (gate appelé AVANT les rendus conditionnels mais APRÈS tous les hooks)
  const sessionStatus = useSessionGate()

  // Codes promo actifs (affichés sous le champ de saisie)
  useEffect(() => {
    fetch('/api/promo-codes')
      .then((r) => (r.ok ? r.json() : []))
      .then((codes: PromoCode[]) => setActivePromos((codes || []).filter((c) => c.active)))
      .catch(() => {})
  }, [])

  const applyPromoCode = async (code: string, subtotalValue = subtotal) => {
    if (!code.trim()) return
    setPromoValidating(true)
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: subtotalValue }),
      })
      const data = await res.json()
      if (data.valid) {
        setPromo({ code: data.code, type: data.type, value: data.value, label: data.label })
        setPromoInput('')
        toast({ title: 'Code promo appliqué', description: data.label })
      } else {
        toast({ title: 'Code invalide', description: data.error || 'Ce code promo n\'est pas valide', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de valider le code', variant: 'destructive' })
    } finally {
      setPromoValidating(false)
    }
  }

  const applyPromo = () => applyPromoCode(promoInput)

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
        title="Votre panier vous attend"
        message="Connectez-vous pour accéder à votre panier — il vous suivra sur tous vos appareils."
        returnTo="cart"
      />
    )
  }

  // ===== Panier vide (textes exacts de l'original) =====
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-foreground">Mon Panier</h1>
              <p className="text-muted-foreground mt-2">0 article(s)</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/80" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Votre panier est vide</h3>
            <p className="text-muted-foreground mb-8">Découvrez nos produits et ajoutez-les à votre panier</p>
            <button
              onClick={() => navigate('shop')}
              className="inline-flex items-center gap-2 bg-[#C9A961] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Continuer mes achats
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau titre */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground">Mon Panier</h1>
            <p className="text-muted-foreground mt-2">{count} article(s)</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Articles */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={`${item.productId}-${item.size ?? ''}-${item.color ?? ''}`}
                className="bg-card rounded-2xl p-4 shadow-sm flex gap-4"
              >
                <button
                  onClick={() => navigate('product', { id: item.productId })}
                  className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0"
                >
                  { }
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      {(item.size || item.color) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.size && `Taille : ${item.size}`}
                          {item.size && item.color && ' · '}
                          {item.color && `Couleur : ${item.color}`}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPrice(item.price)} <span className="text-xs">/ unité</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        removeFromCart(item.productId, item.size, item.color)
                        toast({ title: 'Article retiré', description: item.name })
                      }}
                      className="p-2 text-muted-foreground/80 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                      aria-label={`Retirer ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <div className="flex items-center border border-border rounded-full flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.size, item.color)}
                        className="p-2 hover:text-[#C9A961] transition-colors"
                        aria-label="Diminuer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.size, item.color)}
                        className="p-2 hover:text-[#C9A961] transition-colors"
                        aria-label="Augmenter"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-bold text-foreground whitespace-nowrap text-sm sm:text-base">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate('shop')}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-[#C9A961] transition-colors mt-2"
            >
              <ArrowLeft className="w-4 h-4" /> Continuer mes achats
            </button>
          </div>

          {/* Résumé */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl p-6 shadow-sm sticky top-32">
              <h2 className="text-lg font-bold text-foreground mb-6">Récapitulatif</h2>

              {/* Code promo */}
              {promo ? (
                <div className="mb-4 flex items-center justify-between bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-xl px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#C9A961]">
                    <CheckCircle2 className="w-4 h-4" /> Code {promo.code}
                  </span>
                  <button
                    onClick={() => setPromo(null)}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <div className="mb-6">
                  <label htmlFor="promo" className="text-xs font-medium text-muted-foreground mb-2 block">
                    Code promo
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                      <input
                        id="promo"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Ex : BIENVENUE10"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                      />
                    </div>
                    <button
                      onClick={applyPromo}
                      disabled={promoValidating || !promoInput.trim()}
                      className="h-10 px-4 rounded-lg bg-[#C9A961] text-black text-sm font-medium hover:bg-[#b8994f] hover:text-black transition-colors disabled:opacity-40"
                    >
                      {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
                    </button>
                  </div>
                  {activePromos.length > 0 && (
                    <div className="mt-3">
                      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80 mb-2">
                        <Ticket className="w-3.5 h-3.5" /> Codes disponibles :
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activePromos.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => applyPromoCode(c.code)}
                            disabled={promoValidating}
                            title={c.label}
                            className="inline-flex items-center gap-1 bg-[#C9A961]/10 border border-dashed border-[#C9A961]/40 text-[#C9A961] hover:bg-[#C9A961] hover:text-white hover:border-solid text-xs font-semibold rounded-full px-2.5 py-1 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {c.code}
                            <span className="font-normal opacity-80">
                              {c.type === 'percent' ? `-${c.value}%` : c.type === 'fixed' ? `-${formatPrice(c.value)}` : 'Livraison offerte'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Réduction ({promo?.code})</span>
                    <span className="font-semibold">-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className={`font-semibold ${promoFreeShipping || subtotal >= 50 ? 'text-green-600' : 'text-foreground'}`}>
                    {promoFreeShipping || subtotal >= 50 ? 'Gratuite' : formatPrice(4.99)}
                  </span>
                </div>
                {subtotal < 50 && !promoFreeShipping && (
                  <p className="text-xs text-[#C9A961] bg-[#C9A961]/10 rounded-lg px-3 py-2">
                    Plus que <strong>{formatPrice(50 - subtotal)}</strong> pour la livraison gratuite !
                  </p>
                )}
                <div className="border-t pt-3 flex justify-between text-base">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-[#C9A961] text-lg">{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('checkout')}
                className="w-full mt-6 inline-flex items-center justify-center gap-2 btn-shine bg-[#C9A961] text-black px-8 py-4 rounded-full font-semibold hover:bg-[#b8994f] hover:text-black transition-colors"
              >
                Commander
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-xs text-muted-foreground/80 text-center mt-4">
                Paiement 100% sécurisé · Retours gratuits sous 30 jours
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PageName, Product } from '@/lib/types'
import { isAuthed, serverAdd, serverSet, serverRemove, serverClear } from '@/lib/cartSync'

export interface CartItem {
  productId: string
  name: string
  price: number
  oldPrice?: number | null
  image: string
  quantity: number
  size?: string | null
  color?: string | null
}

export interface AppliedPromo {
  code: string
  type: 'percent' | 'fixed' | 'shipping'
  value: number
  label: string
}

interface ShopState {
  // Routing
  page: PageName
  params: Record<string, string>
  navigate: (page: PageName, params?: Record<string, string>) => void

  // Cart
  cart: CartItem[]
  addToCart: (product: Product, quantity?: number, size?: string | null, color?: string | null) => void
  removeFromCart: (productId: string, size?: string | null, color?: string | null) => void
  updateQuantity: (productId: string, quantity: number, size?: string | null, color?: string | null) => void
  clearCart: () => void

  // Wishlist
  wishlist: string[]
  toggleWishlist: (productId: string) => void

  // Recently viewed
  recentlyViewed: string[]
  addRecentlyViewed: (productId: string) => void

  // Promo code (objet complet validé via API)
  promo: AppliedPromo | null
  setPromo: (promo: AppliedPromo | null) => void

  // Votes "Utile" sur les avis (1 vote par avis et par visiteur)
  votedReviews: string[]
  addReviewVote: (reviewId: string) => void

  // Votes "Utile" sur les questions produit (1 vote par question et par visiteur)
  votedQuestions: string[]
  addQuestionVote: (questionId: string) => void

  // Historique de recherche
  searchHistory: string[]
  addSearchHistory: (query: string) => void
  clearSearchHistory: () => void

  // Alertes retour en stock (produits suivis par le visiteur)
  stockAlerts: string[]
  addStockAlert: (productId: string) => void
  dismissStockAlert: (productId: string) => void

  // Comparateur de produits (max 3)
  compare: string[]
  toggleCompare: (productId: string) => void
  clearCompare: () => void
  removeFromCompare: (productId: string) => void

  // Affichage de la boutique : grille ou liste (préférence persistée)
  shopView: 'grid' | 'list'
  setShopView: (view: 'grid' | 'list') => void

  // Mobile menu / search
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
}

const sameVariant = (item: CartItem, productId: string, size?: string | null, color?: string | null) =>
  item.productId === productId && (item.size ?? null) === (size ?? null) && (item.color ?? null) === (color ?? null)

// Construit l'URL canonique d'une page SPA (?page=xxx&params…) — l'original Base44
// utilise de vraies routes (/ProductDetail?id=…) : on aligne le comportement pour
// que le bouton Précédent, le rafraîchissement et le partage de liens fonctionnent.
const buildPageUrl = (page: PageName, params: Record<string, string> = {}): string => {
  const sp = new URLSearchParams()
  const hasParams = Object.keys(params).length > 0
  if (page !== 'home' || hasParams) sp.set('page', page)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) sp.set(k, String(v))
  })
  const qs = sp.toString()
  return window.location.pathname + (qs ? `?${qs}` : '')
}

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      page: 'home',
      params: {},
      navigate: (page, params = {}) => {
        set({ page, params })
        if (typeof window !== 'undefined') {
          // Synchronise l'URL (sauf si déjà à jour : boot deep-link, retour navigateur)
          const url = buildPageUrl(page, params)
          if (window.location.pathname + window.location.search !== url) {
            window.history.pushState({ page, params }, '', url)
          }
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
        }
      },

      cart: [],
      addToCart: (product, quantity = 1, size = null, color = null) => {
        const cart = [...get().cart]
        const idx = cart.findIndex((i) => sameVariant(i, product.id, size, color))
        if (idx >= 0) {
          cart[idx] = { ...cart[idx], quantity: cart[idx].quantity + quantity }
        } else {
          cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            oldPrice: product.oldPrice,
            image: product.image,
            quantity,
            size,
            color,
          })
        }
        set({ cart })
        // Collection Cart serveur : réplication dès qu'un compte est connecté
        if (isAuthed()) void serverAdd(product.id, quantity, size, color)
      },
      removeFromCart: (productId, size = null, color = null) => {
        set({ cart: get().cart.filter((i) => !sameVariant(i, productId, size, color)) })
        if (isAuthed()) void serverRemove(productId, size, color)
      },
      updateQuantity: (productId, quantity, size = null, color = null) => {
        if (quantity < 1) {
          set({ cart: get().cart.filter((i) => !sameVariant(i, productId, size, color)) })
          if (isAuthed()) void serverRemove(productId, size, color)
          return
        }
        set({
          cart: get().cart.map((i) => (sameVariant(i, productId, size, color) ? { ...i, quantity } : i)),
        })
        if (isAuthed()) void serverSet(productId, quantity, size, color)
      },
      clearCart: () => {
        set({ cart: [], promo: null })
        if (isAuthed()) void serverClear()
      },

      wishlist: [],
      toggleWishlist: (productId) => {
        const list = get().wishlist
        set({ wishlist: list.includes(productId) ? list.filter((id) => id !== productId) : [...list, productId] })
      },

      recentlyViewed: [],
      addRecentlyViewed: (productId) => {
        const list = [productId, ...get().recentlyViewed.filter((id) => id !== productId)].slice(0, 8)
        set({ recentlyViewed: list })
      },

      promo: null,
      setPromo: (promo) => set({ promo }),

      votedReviews: [],
      addReviewVote: (reviewId) => {
        if (!get().votedReviews.includes(reviewId)) {
          set({ votedReviews: [...get().votedReviews, reviewId] })
        }
      },

      votedQuestions: [],
      addQuestionVote: (questionId) => {
        if (!get().votedQuestions.includes(questionId)) {
          set({ votedQuestions: [...get().votedQuestions, questionId] })
        }
      },

      searchHistory: [],
      addSearchHistory: (query) => {
        const q = query.trim()
        if (!q) return
        const list = [q, ...get().searchHistory.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 6)
        set({ searchHistory: list })
      },
      clearSearchHistory: () => set({ searchHistory: [] }),

      stockAlerts: [],
      addStockAlert: (productId) => {
        if (!get().stockAlerts.includes(productId)) {
          set({ stockAlerts: [...get().stockAlerts, productId] })
        }
      },
      dismissStockAlert: (productId) =>
        set({ stockAlerts: get().stockAlerts.filter((id) => id !== productId) }),

      compare: [],
      toggleCompare: (productId) => {
        const list = get().compare
        if (list.includes(productId)) {
          set({ compare: list.filter((id) => id !== productId) })
        } else if (list.length < 3) {
          set({ compare: [...list, productId] })
        }
      },
      clearCompare: () => set({ compare: [] }),
      removeFromCompare: (productId) =>
        set({ compare: get().compare.filter((id) => id !== productId) }),

      shopView: 'grid',
      setShopView: (view) => set({ shopView: view }),

      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: 'mignoncite-shop',
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        recentlyViewed: state.recentlyViewed,
        promo: state.promo,
        compare: state.compare,
        votedReviews: state.votedReviews,
        votedQuestions: state.votedQuestions,
        searchHistory: state.searchHistory,
        stockAlerts: state.stockAlerts,
        shopView: state.shopView,
      }),
    },
  ),
)

export const cartCount = (cart: CartItem[]) => cart.reduce((sum, item) => sum + item.quantity, 0)
export const cartSubtotal = (cart: CartItem[]) => cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

// Réduction calculée à partir de la promo appliquée (validée par l'API)
export const promoDiscount = (promo: AppliedPromo | null, subtotal: number): number => {
  if (!promo) return 0
  if (promo.type === 'percent') return Math.round(subtotal * promo.value) / 100
  if (promo.type === 'fixed') return Math.min(promo.value, subtotal)
  return 0
}

export { SHIPPING_METHODS } from '@/lib/shipping'
export type { ShippingMethodId } from '@/lib/shipping'

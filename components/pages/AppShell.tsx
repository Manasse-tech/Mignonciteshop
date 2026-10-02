'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import Header from '@/components/shop/Header'
import Footer from '@/components/shop/Footer'
import { useShopStore } from '@/store/useShopStore'
import AdminShell from '@/components/admin/AdminShell'
import HomePage from '@/components/pages/HomePage'
import ShopPage from '@/components/pages/ShopPage'
import CategoriesPage from '@/components/pages/CategoriesPage'
import PromotionsPage from '@/components/pages/PromotionsPage'
import AboutPage from '@/components/pages/AboutPage'
import ContactPage from '@/components/pages/ContactPage'
import FaqPage from '@/components/pages/FaqPage'
import GuideTaillesPage from '@/components/pages/GuideTaillesPage'
import TermsPage from '@/components/pages/TermsPage'
import PrivacyPage from '@/components/pages/PrivacyPage'
import ProductDetailPage from '@/components/pages/ProductDetailPage'
import AuthPage from '@/components/pages/AuthPage'
import CartPage from '@/components/pages/CartPage'
import CheckoutPage from '@/components/pages/CheckoutPage'
import OrdersPage from '@/components/pages/OrdersPage'
import OrderDetailPage from '@/components/pages/OrderDetailPage'
import TrackingPage from '@/components/pages/TrackingPage'
import WishlistPage from '@/components/pages/WishlistPage'
import OrderConfirmationPage from '@/components/pages/OrderConfirmationPage'
import LoyaltyPage from '@/components/pages/LoyaltyPage'
import CompareBar from '@/components/shop/CompareBar'
import ScrollExtras from '@/components/shop/ScrollExtras'
import CookieConsent from '@/components/shop/CookieConsent'
import { bootstrapCartSync } from '@/lib/cartSync'
import type { Category, Product, Review, PageName } from '@/lib/types'

// Pages publiques connues du routeur SPA — sert au fallback « Page introuvable »
// quand un deep-link ?page=xxx désigne une page inexistante (sinon : main vide).
const PUBLIC_PAGES: ReadonlySet<PageName> = new Set<PageName>([
  'home', 'shop', 'categories', 'promotions', 'about', 'contact', 'faq',
  'guide-tailles', 'terms', 'privacy', 'product', 'login', 'cart', 'checkout',
  'orders', 'order-detail', 'tracking', 'wishlist', 'order-confirmation',
  'fidelite',
])

// ===== Contexte de données partagées =====
interface DataContextValue {
  products: Product[]
  categories: Category[]
  loading: boolean
  refreshProducts: () => Promise<void>
  refreshCategories: () => Promise<void>
  getProduct: (id: string) => Product | undefined
  productsByIds: (ids: string[]) => Product[]
  productReviews: (productId: string) => Promise<Review[]>
}

const DataContext = createContext<DataContextValue>({
  products: [],
  categories: [],
  loading: true,
  refreshProducts: async () => {},
  refreshCategories: async () => {},
  getProduct: () => undefined,
  productsByIds: () => [],
  productReviews: async () => [],
})

export const useData = () => useContext(DataContext)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const refreshProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) setProducts(await res.json())
    } catch (e) {
      console.error('Erreur chargement produits:', e)
    }
  }, [])

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) setCategories(await res.json())
    } catch (e) {
      console.error('Erreur chargement catégories:', e)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      await Promise.all([refreshProducts(), refreshCategories()])
      if (!cancelled) setLoading(false)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [refreshProducts, refreshCategories])

  const getProduct = useCallback((id: string) => products.find((p) => p.id === id), [products])

  const productsByIds = useCallback(
    (ids: string[]) => ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [products],
  )

  const productReviews = useCallback(async (productId: string): Promise<Review[]> => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}&status=approved`)
      if (res.ok) return await res.json()
      return []
    } catch {
      return []
    }
  }, [])

  return (
    <DataContext.Provider
      value={{ products, categories, loading, refreshProducts, refreshCategories, getProduct, productsByIds, productReviews }}
    >
      {children}
    </DataContext.Provider>
  )
}

export default function AppShell() {
  const { page, navigate, compare } = useShopStore()
  const isAdmin = page.startsWith('admin')
  // Sur le panier et le checkout, on masque la barre comparateur (focus achat)
  const showCompareBar = compare.length > 0 && page !== 'cart' && page !== 'checkout' && page !== 'order-confirmation'

  // Deep-linking : restaure la page depuis ?page=xxx&id=... (partage de liens)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const target = sp.get('page') as PageName | null
    if (!target) return
    const params: Record<string, string> = {}
    sp.forEach((v, k) => {
      if (k !== 'page') params[k] = v
    })
    navigate(target, params)
  }, [])

  // Boutons Précédent/Suivant du navigateur : l'URL est source de vérité
  // (navigate() écrit l'URL via history.pushState — cf. store)
  useEffect(() => {
    const onPopState = () => {
      const sp = new URLSearchParams(window.location.search)
      const target = (sp.get('page') as PageName | null) ?? 'home'
      const params: Record<string, string> = {}
      sp.forEach((v, k) => {
        if (k !== 'page') params[k] = v
      })
      navigate(target, params)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [navigate])

  // Session de boot : alimente le header (compte connecté) et fusionne le panier
  // invité local avec la collection Cart du compte (auth Base44 restaurée)
  useEffect(() => {
    void bootstrapCartSync()
  }, [])

  if (isAdmin) {
    return (
      <DataProvider>
        <AdminShell />
      </DataProvider>
    )
  }

  return (
    <DataProvider>
      <div className="min-h-screen bg-background font-sans flex flex-col">
        <Header />
        <main className={`pt-20 flex-1 ${showCompareBar ? 'pb-24' : ''}`}>
          {page === 'home' && <HomePage />}
          {page === 'shop' && <ShopPage />}
          {page === 'categories' && <CategoriesPage />}
          {page === 'promotions' && <PromotionsPage />}
          {page === 'about' && <AboutPage />}
          {page === 'contact' && <ContactPage />}
          {page === 'faq' && <FaqPage />}
          {page === 'guide-tailles' && <GuideTaillesPage />}
          {page === 'terms' && <TermsPage />}
          {page === 'privacy' && <PrivacyPage />}
          {page === 'product' && <ProductDetailPage />}
          {page === 'login' && <AuthPage />}
          {page === 'cart' && <CartPage />}
          {page === 'checkout' && <CheckoutPage />}
          {page === 'orders' && <OrdersPage />}
          {page === 'order-detail' && <OrderDetailPage />}
          {page === 'tracking' && <TrackingPage />}
          {page === 'wishlist' && <WishlistPage />}
          {page === 'order-confirmation' && <OrderConfirmationPage />}
          {page === 'fidelite' && <LoyaltyPage />}
          {/* Fallback deep-link inconnu (?page=xxx inexistant) */}
          {!PUBLIC_PAGES.has(page) && (
            <div className="min-h-[55vh] flex flex-col items-center justify-center text-center px-4 py-16">
              <p className="text-7xl font-bold text-[#C9A961]/30 mb-4" aria-hidden="true">404</p>
              <h1 className="text-2xl font-bold text-foreground mb-2">Page introuvable</h1>
              <p className="text-muted-foreground mb-8 max-w-md">
                La page que vous cherchez n'existe pas ou a été déplacée. Utilisez le menu ci-dessus pour reprendre votre visite.
              </p>
              <button
                onClick={() => navigate('shop')}
                className="inline-flex items-center gap-2 bg-[#C9A961] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
              >
                Retour à la boutique
              </button>
            </div>
          )}
        </main>
        <Footer />
        {showCompareBar && <CompareBar />}
        <ScrollExtras />
        <CookieConsent />
      </div>
    </DataProvider>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LayoutDashboard, Package, Layers, ShoppingCart, Star, Boxes, Store, LogOut, Menu, Mail, Ticket, Wifi, WifiOff, Loader2, Send,
} from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { useAdminAuthStore } from '@/store/useAdminAuthStore'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { formatPrice } from '@/lib/format'
import { connectAdminRealtime, type AdminRealtimeEvent } from '@/lib/realtime'
import { showBrowserNotification } from '@/lib/browserNotify'
import usePageMeta from '@/hooks/usePageMeta'
import NotifToggle from './NotifToggle'
import ThemeToggle from '@/components/shop/ThemeToggle'
import AdminLogin from './AdminLogin'
import DashboardAdmin from './DashboardAdmin'
import ProductsAdmin from './ProductsAdmin'
import CategoriesAdmin from './CategoriesAdmin'
import OrdersAdmin from './OrdersAdmin'
import ReviewsAdmin from './ReviewsAdmin'
import InventoryAdmin from './InventoryAdmin'
import MessagesAdmin from './MessagesAdmin'
import EmailsAdmin from './EmailsAdmin'
import PromosAdmin from './PromosAdmin'
import type { Stats } from '@/lib/types'

const ADMIN_NAV = [
  { id: 'admin-dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'admin-products', label: 'Produits', icon: Package },
  { id: 'admin-categories', label: 'Catégories', icon: Layers },
  { id: 'admin-orders', label: 'Commandes', icon: ShoppingCart, badge: (s: Stats) => s.ordersCount },
  { id: 'admin-promos', label: 'Codes promo', icon: Ticket },
  { id: 'admin-reviews', label: 'Avis & Questions', icon: Star, badge: (s: Stats) => s.pendingReviews + (s.pendingQuestions ?? 0) },
  { id: 'admin-inventory', label: 'Stock', icon: Boxes, badge: (s: Stats) => s.lowStock },
  { id: 'admin-messages', label: 'Messages', icon: Mail, badge: (s: Stats) => s.unreadMessages },
  { id: 'admin-emails', label: 'Emails', icon: Send },
] as const

function SidebarBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#C9A961] text-white text-[11px] font-bold leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function AdminNav({
  currentPage,
  onNavigate,
  stats,
}: {
  currentPage: string
  onNavigate: (id: string) => void
  stats: Stats | null
}) {
  return (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {ADMIN_NAV.map((item) => {
          const badgeCount = stats && 'badge' in item ? (item.badge as (s: Stats) => number)(stats) : 0
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                currentPage === item.id
                  ? 'bg-[#C9A961] text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
              <SidebarBadge count={badgeCount} />
            </button>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-800 space-y-1">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Apparence</span>
          <div className="flex items-center gap-1">
            <NotifToggle />
            <ThemeToggle className="hover:bg-gray-800" />
          </div>
        </div>
        <button
          onClick={() => onNavigate('__home__')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Store className="w-5 h-5" /> Retour à la boutique
        </button>
        <button
          onClick={() => onNavigate('__logout__')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" /> Déconnexion
        </button>
      </div>
    </>
  )
}

/**
 * Porte d'authentification de l'espace admin (audit S2) : aucun panneau n'est
 * rendu tant qu'une session admin valide n'existe. Les deep-links « admin-* »
 * aboutissent ici → écran de connexion. L'autorisation réelle est vérifiée
 * indépendamment par chaque route API (requireAdmin côté serveur).
 */
export default function AdminShell() {
  const { status, user, fetchSession } = useAdminAuthStore()

  useEffect(() => {
    if (status === 'loading') fetchSession()
  }, [status, fetchSession])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
        <span className="sr-only">Vérification de la session…</span>
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A961]" aria-hidden="true" />
      </div>
    )
  }
  if (!user || user.role !== 'admin') {
    return <AdminLogin />
  }
  return <AdminShellContent />
}

function AdminShellContent() {
  const { page, navigate } = useShopStore()
  const logout = useAdminAuthStore((s) => s.logout)
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [realtimeUp, setRealtimeUp] = useState(false)

  // SEO : titre dédié à l'espace d'administration
  const adminPage = ADMIN_NAV.find((n) => n.id === page)
  usePageMeta(
    adminPage ? `${adminPage.label} — Administration — MignonciteShop` : 'Administration — MignonciteShop',
    'Espace administrateur MignonciteShop : gestion des produits, commandes, avis, stocks et messages.',
  )

  const refreshStats = useCallback(() => {
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data)
      })
      .catch(() => {})
  }, [])

  // Charge les compteurs (messages non lus, avis en attente, stock faible) et rafraîchit toutes les 30 s
  useEffect(() => {
    refreshStats()
    const timer = setInterval(refreshStats, 30000)
    return () => clearInterval(timer)
  }, [refreshStats])

  // Notifications temps réel via WebSocket (mini-service notify-service)
  useEffect(() => {
    const onEvent = (e: AdminRealtimeEvent) => {
      refreshStats()
      // Notification système (onglet en arrière-plan) si activée par l'admin
      switch (e.type) {
        case 'order':
          showBrowserNotification(
            'Nouvelle commande reçue !',
            `${e.customerName} · ${formatPrice(e.total)} · ${e.orderNumber}`,
            'mcs-order',
          )
          toast({
            title: 'Nouvelle commande reçue !',
            description: `${e.customerName} · ${formatPrice(e.total)} · ${e.orderNumber}`,
            action: (
              <ToastAction altText="Voir la commande" onClick={() => navigate('admin-orders')}>
                Voir
              </ToastAction>
            ),
          })
          break
        case 'message':
          showBrowserNotification('Nouveau message de contact', `${e.name} — ${e.subject}`, 'mcs-message')
          toast({
            title: 'Nouveau message de contact',
            description: `${e.name} — ${e.subject}`,
            action: (
              <ToastAction altText="Voir le message" onClick={() => navigate('admin-messages')}>
                Voir
              </ToastAction>
            ),
          })
          break
        case 'review':
          showBrowserNotification('Nouvel avis à modérer', `${e.author} · ${e.rating}/5 · ${e.product}`, 'mcs-review')
          toast({
            title: 'Nouvel avis à modérer',
            description: `${e.author} · ${e.rating}/5 · ${e.product}`,
            action: (
              <ToastAction altText="Voir les avis" onClick={() => navigate('admin-reviews')}>
                Voir
              </ToastAction>
            ),
          })
          break
        case 'question':
          showBrowserNotification('Nouvelle question produit', `${e.author} · ${e.product}`, 'mcs-question')
          toast({
            title: 'Nouvelle question produit',
            description: `${e.author} · ${e.product}`,
            action: (
              <ToastAction altText="Voir les questions" onClick={() => navigate('admin-reviews')}>
                Voir
              </ToastAction>
            ),
          })
          break
      }
    }
    return connectAdminRealtime(onEvent, setRealtimeUp)
  }, [toast, refreshStats, navigate])

  const handleNavigate = (id: string) => {
    if (id === '__home__') {
      navigate('home')
    } else if (id === '__logout__') {
      // Déconnexion réelle : purge du cookie de session (audit S2)
      logout().then(() => navigate('home'))
    } else {
      navigate(id as Parameters<typeof navigate>[0])
    }
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 bg-black text-white flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">
            <span className="text-white">MIGNONCITE</span>
            <span className="text-[#C9A961]">SHOP</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            Espace administrateur
            <span
              className={`inline-flex items-center gap-1 ${realtimeUp ? 'text-green-400' : 'text-gray-600'}`}
              title={realtimeUp ? 'Notifications temps réel connectées' : 'Notifications temps réel déconnectées'}
            >
              {realtimeUp ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className={`w-1.5 h-1.5 rounded-full ${realtimeUp ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            </span>
          </p>
        </div>
        <AdminNav currentPage={page} onNavigate={handleNavigate} stats={stats} />
      </aside>

      {/* Topbar mobile */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-black text-white px-4 h-16 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          <span className="text-white">MIGNONCITE</span>
          <span className="text-[#C9A961]">SHOP</span>
        </h2>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu admin">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-black text-white flex flex-col h-full animate-fade-up">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">
                <span className="text-white">MIGNONCITE</span>
                <span className="text-[#C9A961]">SHOP</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                Espace administrateur
                <span className={`inline-flex items-center ${realtimeUp ? 'text-green-400' : 'text-gray-600'}`}>
                  {realtimeUp ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                </span>
              </p>
            </div>
            <AdminNav currentPage={page} onNavigate={handleNavigate} stats={stats} />
          </aside>
        </div>
      )}

      {/* Contenu */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {(page === 'admin' || page === 'admin-dashboard') && <DashboardAdmin />}
          {page === 'admin-products' && <ProductsAdmin />}
          {page === 'admin-categories' && <CategoriesAdmin />}
          {page === 'admin-orders' && <OrdersAdmin />}
          {page === 'admin-promos' && <PromosAdmin />}
          {page === 'admin-reviews' && <ReviewsAdmin />}
          {page === 'admin-inventory' && <InventoryAdmin />}
          {page === 'admin-messages' && <MessagesAdmin />}
          {page === 'admin-emails' && <EmailsAdmin />}
        </div>
      </main>
    </div>
  )
}

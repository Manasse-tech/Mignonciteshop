'use client'

import { useEffect, useState } from 'react'
import { Search, User, ShoppingBag, Menu, X, Heart, ChevronRight, Gift, LogOut, Package, LayoutDashboard } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useShopStore, cartCount } from '@/store/useShopStore'
import { useAdminAuthStore } from '@/store/useAdminAuthStore'
import SearchDialog from './SearchDialog'
import ThemeToggle from './ThemeToggle'

const NAV_ITEMS = [
  { label: 'Accueil', page: 'home' as const },
  { label: 'Boutique', page: 'shop' as const },
  { label: 'Catégories', page: 'categories' as const },
  { label: 'Promotions', page: 'promotions' as const },
  { label: 'À propos', page: 'about' as const },
  { label: 'Contact', page: 'contact' as const },
]

// Menu mobile : ajoute le programme de fidélité (l'icône Cadeau du header est masquée < 480 px)
const MOBILE_NAV_ITEMS = [...NAV_ITEMS, { label: 'Programme de fidélité', page: 'fidelite' as const }]

export default function Header() {
  const { page, navigate, cart, wishlist, mobileMenuOpen, setMobileMenuOpen, setSearchOpen } = useShopStore()
  const { status, user, logout, fetchSession } = useAdminAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const count = cartCount(cart)

  // Session (compte connecté) : nécessaire pour le menu utilisateur du header
  useEffect(() => {
    if (status === 'loading') fetchSession()
  }, [status, fetchSession])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (p: string) => page === p

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-card/90 backdrop-blur-md shadow-sm border-b border-border/60' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 px-4 sm:px-0">
            <button
              onClick={() => navigate('home')}
              className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
              aria-label="MignonciteShop — Accueil"
            >
              <span className="text-lg sm:text-2xl font-bold tracking-tight logo-glow rounded-lg">
                <span className="text-foreground">MIGNONCITE</span>
                <span className="text-[#C9A961]">SHOP</span>
              </span>
            </button>

            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-10" aria-label="Navigation principale">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.page}
                  onClick={() => navigate(item.page)}
                  data-active={isActive(item.page)}
                  className={`nav-link text-sm font-medium transition-colors hover:text-[#C9A961] ${
                    isActive(item.page) ? 'text-[#C9A961]' : 'text-foreground/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-0.5 sm:space-x-1.5 xl:space-x-3">
              <ThemeToggle className="hidden min-[400px]:block" />
              <button
                onClick={() => setSearchOpen(true)}
                className="p-1.5 min-[400px]:p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Rechercher"
              >
                <Search className="w-5 h-5 text-foreground/80" />
              </button>
              <button
                onClick={() => navigate('wishlist')}
                className="relative p-1.5 min-[400px]:p-2 hover:bg-muted rounded-full transition-colors hidden min-[420px]:block"
                aria-label="Mes favoris"
              >
                <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-[#C9A961] text-[#C9A961]' : 'text-foreground/80'}`} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#C9A961] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </button>
              {status === 'authed' && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative p-1.5 min-[400px]:p-2 hover:bg-muted rounded-full transition-colors"
                      aria-label={`Mon compte — ${user.name}`}
                    >
                      <span
                        className="w-6 h-6 rounded-full bg-[#C9A961] text-white text-xs font-bold flex items-center justify-center uppercase"
                        aria-hidden="true"
                      >
                        {user.name.charAt(0)}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <span className="block font-semibold text-foreground">Bonjour, {user.name}</span>
                      <span className="block text-xs font-normal text-muted-foreground truncate">{user.email}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('orders')}>
                      <Package className="w-4 h-4 mr-2" aria-hidden="true" /> Mes commandes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('fidelite')}>
                      <Gift className="w-4 h-4 mr-2" aria-hidden="true" /> Mes points fidélité
                    </DropdownMenuItem>
                    {/* Espace admin : visible uniquement pour le compte administrateur
                        (jamais dans le footer public — accès clients impossible) */}
                    {user.role === 'admin' && (
                      <DropdownMenuItem onClick={() => navigate('admin-dashboard')}>
                        <LayoutDashboard className="w-4 h-4 mr-2" aria-hidden="true" /> Espace admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        await logout()
                        navigate('home')
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={() => navigate('login')}
                  className="p-1.5 min-[400px]:p-2 hover:bg-muted rounded-full transition-colors"
                  aria-label="Se connecter à mon compte"
                >
                  <User className="w-5 h-5 text-foreground/80" />
                </button>
              )}
              <button
                onClick={() => navigate('fidelite')}
                className={`relative p-1.5 min-[400px]:p-2 hover:bg-muted rounded-full transition-colors hidden min-[480px]:block ${
                  page === 'fidelite' ? 'text-[#C9A961]' : ''
                }`}
                aria-label="Programme de fidélité"
                title="Programme de fidélité"
              >
                <Gift className={`w-5 h-5 ${page === 'fidelite' ? 'text-[#C9A961]' : 'text-foreground/80'}`} />
              </button>
              <button
                onClick={() => navigate('cart')}
                className="relative p-1.5 min-[400px]:p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Mon panier"
              >
                <ShoppingBag className="w-5 h-5 text-foreground/80" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#C9A961] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
              <button
                className="lg:hidden p-1.5 min-[400px]:p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Ouvrir le menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile : visibilité alignée sur le burger (lg:hidden) — sinon bug 768-1023px burger sans menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-card border-t border-border shadow-lg animate-fade-up">
            <nav className="px-4 py-4 space-y-1" aria-label="Navigation mobile">
              {MOBILE_NAV_ITEMS.map((item) => (
                <button
                  key={item.page}
                  onClick={() => {
                    navigate(item.page)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(item.page) ? 'bg-[#C9A961]/10 text-[#C9A961]' : 'text-foreground/80 hover:bg-muted/60'
                  }`}
                >
                  {item.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      <SearchDialog />
    </>
  )
}

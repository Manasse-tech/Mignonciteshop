"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Gift,
  Heart,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  ShoppingBag,
  Sun,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShopStore, selectCartCount } from "@/lib/store";
import { useAuthStore } from "@/lib/auth-store";

const NAV_ITEMS = [
  { key: "home", label: "Accueil" },
  { key: "shop", label: "Boutique" },
  { key: "categories", label: "Catégories" },
  { key: "promotions", label: "Promotions" },
  { key: "about", label: "À propos" },
  { key: "contact", label: "Contact" },
] as const;

const emptySubscribe = () => () => {};

export type NavigatePage =
  | "home"
  | "shop"
  | "categories"
  | "promotions"
  | "about"
  | "contact"
  | "cart"
  | "wishlist"
  | "login"
  | "admin";

interface HeaderProps {
  active: string;
  onNavigate: (page: NavigatePage) => void;
  onSearch: () => void;
}

export function Header({ active, onNavigate, onSearch }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { resolvedTheme, setTheme } = useTheme();
  const cartCount = useShopStore(selectCartCount);
  const { user, ready, hydrate, logout } = useAuthStore();

  // Vérifie la session une seule fois au montage (cookie httpOnly côté serveur).
  useEffect(() => {
    if (!ready) {
      void hydrate();
    }
  }, [ready, hydrate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const handleComingSoon = () => {
    onNavigate("shop");
    toast.info("Cette fonctionnalité arrive bientôt !");
  };

  const go = (page: NavigatePage) => {
    setMobileOpen(false);
    onNavigate(page);
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    toast.success("Vous êtes déconnecté. À bientôt !");
    onNavigate("home");
  };

  const accountButton = (size: "desktop" | "mobile") => {
    const pad = size === "desktop" ? "p-1.5 min-[400px]:p-2" : "p-2.5";
    const visibility = size === "desktop" ? "hidden min-[380px]:block" : "";
    const triggerClass = `${pad} hover:bg-muted rounded-full transition-colors ${visibility}`;

    if (!user) {
      return (
        <button
          type="button"
          className={triggerClass}
          aria-label="Se connecter à mon compte"
          onClick={() => go("login")}
        >
          <User aria-hidden="true" />
        </button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={triggerClass}
            aria-label={`Mon compte — ${user.name ?? user.email}`}
          >
            <span className="relative inline-flex">
              <User aria-hidden="true" />
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#C9A961]"
                aria-hidden="true"
              />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate font-semibold">
              {user.name ?? "Mon compte"}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.role === "admin" && (
            <DropdownMenuItem onClick={() => go("admin")} className="gap-2">
              <Shield className="w-4 h-4 text-[#C9A961]" aria-hidden="true" />
              Espace admin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const actionButtons = (size: "desktop" | "mobile") => {
    const pad = size === "desktop" ? "p-1.5 min-[400px]:p-2" : "p-2.5";
    return (
      <>
        <button
          type="button"
          className={`${pad} hover:bg-muted rounded-full transition-colors ${
            size === "desktop" ? "hidden min-[400px]:block" : ""
          }`}
          aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          title={isDark ? "Mode clair" : "Mode sombre"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? (
            <Sun aria-hidden="true" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={`${pad} hover:bg-muted rounded-full transition-colors`}
          aria-label="Rechercher"
          onClick={() => {
            setMobileOpen(false);
            onSearch();
          }}
        >
          <Search aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${pad} hover:bg-muted rounded-full transition-colors ${
            size === "desktop" ? "hidden min-[420px]:block" : ""
          }`}
          aria-label="Mes favoris"
          onClick={() => go("wishlist")}
        >
          <Heart aria-hidden="true" />
        </button>
        {accountButton(size)}
        <button
          type="button"
          className={`${pad} hover:bg-muted rounded-full transition-colors ${
            size === "desktop" ? "hidden min-[480px]:block" : ""
          }`}
          aria-label="Programme de fidélité"
          title="Programme de fidélité"
          onClick={handleComingSoon}
        >
          <Gift aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${pad} hover:bg-muted rounded-full transition-colors relative`}
          aria-label="Mon panier"
          onClick={() => go("cart")}
        >
          <ShoppingBag aria-hidden="true" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#C9A961] text-white text-[10px] font-bold flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      </>
    );
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-card/90 backdrop-blur-md shadow-sm border-b border-border/60"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 px-4 sm:px-0">
          <button
            type="button"
            className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
            aria-label="MignonciteShop — Accueil"
            onClick={() => onNavigate("home")}
          >
            <span className="text-lg sm:text-2xl font-bold tracking-tight logo-glow rounded-lg">
              <span className="text-foreground">MIGNONCITE</span>
              <span className="text-[#C9A961]">SHOP</span>
            </span>
          </button>

          <nav
            className="hidden lg:flex items-center space-x-4 xl:space-x-10"
            aria-label="Navigation principale"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                data-active={active === item.key}
                className={`nav-link text-sm font-medium transition-colors hover:text-[#C9A961] ${
                  active === item.key ? "text-[#C9A961]" : "text-foreground/80"
                }`}
                onClick={() => onNavigate(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-0.5 sm:space-x-1.5 xl:space-x-3 max-[379px]:[&_svg]:w-[18px] max-[379px]:[&_svg]:h-[18px]">
            {actionButtons("desktop")}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="lg:hidden p-1.5 min-[400px]:p-2"
                  aria-label="Ouvrir le menu"
                >
                  <Menu aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
                <div className="mt-6 flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors hover:bg-muted hover:text-[#C9A961] ${
                        active === item.key ? "text-[#C9A961] bg-muted/60" : "text-foreground/80"
                      }`}
                      onClick={() => go(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-6 border-t border-border pt-5">
                  <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mon compte
                  </p>
                  <div className="flex items-center justify-around px-2">
                    {actionButtons("mobile")}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

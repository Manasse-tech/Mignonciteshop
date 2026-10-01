"use client";

import { Heart, Home, ShoppingBag, ShoppingCart, Store, User } from "lucide-react";
import { useShopStore, selectCartCount } from "@/lib/store";

/**
 * Barre de navigation inférieure fixe — mobile uniquement (lg:hidden).
 * 5 items : Accueil · Boutique · Panier (badge) · Favoris · Compte.
 * Hauteur ~56px + safe-area-inset-bottom (encoches iOS).
 * Item actif : doré #C9A961 (identité MIGNONCITESHOP).
 */
interface BottomNavProps {
  active: string;
  onNavigate: (page: string) => void;
}

const ITEMS = [
  { key: "home", label: "Accueil", icon: Home },
  { key: "shop", label: "Boutique", icon: Store },
  { key: "cart", label: "Panier", icon: ShoppingCart },
  { key: "wishlist", label: "Favoris", icon: Heart },
  { key: "account", label: "Compte", icon: User },
] as const;

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const cartCount = useShopStore(selectCartCount);

  const isActive = (key: string) =>
    key === "account"
      ? active === "account" || active === "login"
      : active === key;

  return (
    <nav
      aria-label="Navigation mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/70 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <ul className="grid grid-cols-5 h-14">
        {ITEMS.map((item) => {
          const activeItem = isActive(item.key);
          return (
            <li key={item.key} className="min-w-0">
              <button
                type="button"
                aria-current={activeItem ? "page" : undefined}
                onClick={() => onNavigate(item.key)}
                className={`relative w-full h-full flex flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                  activeItem
                    ? "text-[#C9A961]"
                    : "text-muted-foreground active:text-[#C9A961]"
                }`}
              >
                {activeItem && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[#C9A961]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative">
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                  {item.key === "cart" && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-[#C9A961] text-white text-[9px] font-bold flex items-center justify-center">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-none truncate max-w-full">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import type { Product } from "@/lib/types";

interface FeaturedSectionProps {
  products: Product[];
  loading: boolean;
  onQuickView: (p: Product) => void;
  onNavigate: (page: string) => void;
}

function ProductCardSkeleton() {
  return (
    <div className="bg-muted rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-1/3 bg-muted-foreground/15 rounded-full" />
        <div className="h-4 w-3/4 bg-muted-foreground/15 rounded-full" />
        <div className="h-3 w-1/2 bg-muted-foreground/15 rounded-full" />
        <div className="h-5 w-1/3 bg-muted-foreground/15 rounded-full" />
      </div>
    </div>
  );
}

export function FeaturedSection({
  products,
  loading,
  onQuickView,
  onNavigate,
}: FeaturedSectionProps) {
  return (
    <section className="py-16 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-2">
              Sélection
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Produits Vedettes
            </h2>
          </div>
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-[#C9A961] transition-colors"
            onClick={() => onNavigate("shop")}
          >
            Voir tout <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={onQuickView}
              />
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-[#C9A961] transition-colors"
            onClick={() => onNavigate("shop")}
          >
            Voir tous les produits{" "}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

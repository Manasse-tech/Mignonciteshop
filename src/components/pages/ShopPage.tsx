'use client'

import { useMemo, useState } from "react"
import { Search, SlidersHorizontal, X, Tag, PackageCheck, Loader2, LayoutGrid, List } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useData } from './AppShell'
import ProductCard, { ProductListCard } from '@/components/shop/ProductCard'
import { useShopStore } from '@/store/useShopStore'
import usePageMeta from '@/hooks/usePageMeta'

export default function ShopPage() {
  const { params } = useShopStore()
  const { products, categories, loading } = useData()
  const { shopView, setShopView } = useShopStore()
  const [search, setSearch] = useState<string>(params.q || '')
  const [category, setCategory] = useState<string>(params.category || 'all')

  // SEO dynamique : le titre reflète la catégorie ou la recherche en cours
  const activeCategory = categories.find((c) => c.slug === category)
  const shopTitle = search.trim()
    ? `Recherche « ${search.trim()} » — MignonciteShop`
    : activeCategory
      ? `${activeCategory.name} — Boutique — MignonciteShop`
      : 'Boutique — MignonciteShop'
  usePageMeta(
    shopTitle,
    activeCategory
      ? `Découvrez tous nos produits ${activeCategory.name.toLowerCase()} : sélection qualité MignonciteShop, livraison rapide et paiement sécurisé.`
      : 'Découvrez notre sélection de produits : mode, sport & loisirs, maison & déco, électronique. Filtres, tri et livraison rapide sur MignonciteShop.',
  )
  const [sort, setSort] = useState('recent')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [onlyPromo, setOnlyPromo] = useState(false)
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(8)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastCategoryParam, setLastCategoryParam] = useState(params.category || '')
  const [lastQueryParam, setLastQueryParam] = useState(params.q || '')

  // Réinitialise la pagination quand les filtres changent (adjusting state during render)
  const filterKey = `${category}|${search}|${sort}|${priceRange[0]}|${priceRange[1]}|${onlyPromo}|${onlyInStock}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setVisibleCount(8)
  }

  if ((params.category || '') !== lastCategoryParam) {
    setLastCategoryParam(params.category || '')
    setCategory(params.category || 'all')
  }

  if ((params.q || '') !== lastQueryParam) {
    setLastQueryParam(params.q || '')
    setSearch(params.q || '')
  }

  const filtered = useMemo(() => {
    let list = [...products]
    if (category !== 'all') {
      const cat = categories.find((c) => c.slug === category)
      if (cat) list = list.filter((p) => p.categoryId === cat.id)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    list = list.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    if (onlyPromo) list = list.filter((p) => p.oldPrice)
    if (onlyInStock) list = list.filter((p) => p.stock > 0)
    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
        break
      case 'sold':
        list.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0) || b.reviewCount - a.reviewCount)
        break
      default:
        break
    }
    return list
  }, [products, categories, category, search, sort, priceRange, onlyPromo, onlyInStock])

  const visible = filtered.slice(0, visibleCount)
  const remaining = filtered.length - visibleCount

  const loadMore = () => {
    setLoadingMore(true)
    // Petit délai pour montrer le spinner puis révèle la suite
    setTimeout(() => {
      setVisibleCount((c) => c + 8)
      setLoadingMore(false)
    }, 350)
  }

  const categoryButtons = (
    <div>
      <h4 className="font-semibold text-foreground mb-4">Catégories</h4>
      <div className="space-y-1">
        <button
          onClick={() => setCategory('all')}
          className={`block w-full text-left px-4 py-2 rounded-lg transition-colors text-sm ${
            category === 'all' ? 'bg-[#C9A961] text-white' : 'hover:bg-muted text-foreground/80'
          }`}
        >
          Toutes les catégories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.slug)}
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors text-sm ${
              category === cat.slug ? 'bg-[#C9A961] text-white' : 'hover:bg-muted text-foreground/80'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  )

  const priceFilter = (
    <div>
      <h4 className="font-semibold text-foreground mb-4">Prix</h4>
      <Slider
        value={priceRange}
        onValueChange={(v) => setPriceRange(v as [number, number])}
        max={1000}
        step={10}
        className="mb-3"
      />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{priceRange[0]} €</span>
        <span>{priceRange[1]} €</span>
      </div>
    </div>
  )

  const extraFilters = (
    <div className="space-y-2">
      <h4 className="font-semibold text-foreground mb-4">Filtres rapides</h4>
      <button
        onClick={() => setOnlyPromo(!onlyPromo)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
          onlyPromo
            ? 'border-[#C9A961] bg-[#C9A961]/10 text-[#C9A961]'
            : 'border-border text-muted-foreground hover:border-[#C9A961]/50'
        }`}
      >
        <Tag className="w-4 h-4" /> En promotion uniquement
      </button>
      <button
        onClick={() => setOnlyInStock(!onlyInStock)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
          onlyInStock
            ? 'border-[#C9A961] bg-[#C9A961]/10 text-[#C9A961]'
            : 'border-border text-muted-foreground hover:border-[#C9A961]/50'
        }`}
      >
        <PackageCheck className="w-4 h-4" /> En stock uniquement
      </button>
    </div>
  )

  const resetFilters = (
    <button
      onClick={() => {
        setCategory('all')
        setPriceRange([0, 1000])
        setSearch('')
        setOnlyPromo(false)
        setOnlyInStock(false)
      }}
      className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-[#C9A961] transition-colors"
    >
      <X className="w-4 h-4" /> Réinitialiser les filtres
    </button>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau titre */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground">Notre Boutique</h1>
            <p className="text-muted-foreground mt-2">Découvrez notre sélection de produits</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Recherche + tri */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full h-12 pl-12 pr-4 rounded-full border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-[#C9A961] transition-colors"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-48 h-12 rounded-full border-border bg-card">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="price-asc">Prix croissant</SelectItem>
              <SelectItem value="price-desc">Prix décroissant</SelectItem>
              <SelectItem value="name">Nom A-Z</SelectItem>
              <SelectItem value="sold">Popularité</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden inline-flex items-center justify-center h-12 px-6 rounded-full bg-card border border-border text-sm font-medium"
          >
            <SlidersHorizontal className="w-5 h-5 mr-2" />
            Filtres
          </button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filtres desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-32 bg-card rounded-2xl p-6 shadow-sm space-y-8">
              {categoryButtons}
              {priceFilter}
              {extraFilters}
              {resetFilters}
            </div>
          </aside>

          {/* Grille produits */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{loading ? '…' : filtered.length}</span> produits
                {!loading && filtered.length > 8 && (
                  <span className="text-muted-foreground/80 text-sm"> · {visible.length} affichés</span>
                )}
              </p>
              <div className="flex items-center gap-3">
                {category !== 'all' && (
                  <button
                    onClick={() => setCategory('all')}
                    className="inline-flex items-center gap-1 text-sm text-[#C9A961] hover:underline"
                  >
                    <X className="w-4 h-4" /> Quitter le filtre catégorie
                  </button>
                )}
                {/* Bascule grille / liste (préférence persistée) */}
                <div
                  className="hidden sm:flex items-center rounded-full border border-border bg-card p-1 shadow-sm"
                  role="group"
                  aria-label="Mode d'affichage"
                >
                  <button
                    onClick={() => setShopView('grid')}
                    aria-pressed={shopView === 'grid'}
                    aria-label="Affichage en grille"
                    title="Affichage en grille"
                    className={`p-2 rounded-full transition-all ${
                      shopView === 'grid'
                        ? 'bg-[#C9A961] text-white shadow-sm'
                        : 'text-muted-foreground hover:text-[#C9A961]'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShopView('list')}
                    aria-pressed={shopView === 'list'}
                    aria-label="Affichage en liste"
                    title="Affichage en liste"
                    className={`p-2 rounded-full transition-all ${
                      shopView === 'list'
                        ? 'bg-[#C9A961] text-white shadow-sm'
                        : 'text-muted-foreground hover:text-[#C9A961]'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-2xl overflow-hidden shadow-sm">
                    <div className="aspect-square skeleton" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 skeleton rounded w-1/3" />
                      <div className="h-4 skeleton rounded w-3/4" />
                      <div className="h-4 skeleton rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Aucun produit trouvé</h3>
                <p className="text-muted-foreground">Essayez de modifier vos filtres ou votre recherche.</p>
              </div>
            ) : (
              <>
                {shopView === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {visible.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visible.map((product) => (
                      <ProductListCard key={product.id} product={product} />
                    ))}
                  </div>
                )}
                {remaining > 0 && (
                  <div className="flex flex-col items-center gap-3 mt-10">
                    <p className="text-xs text-muted-foreground/80">
                      {visible.length} sur {filtered.length} produits affichés
                    </p>
                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9A961] rounded-full transition-all duration-500"
                        style={{ width: `${(visible.length / filtered.length) * 100}%` }}
                      />
                    </div>
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="mt-2 inline-flex items-center gap-2 bg-card border border-border text-foreground px-8 py-3.5 rounded-full text-sm font-semibold hover:border-[#C9A961] hover:text-[#C9A961] transition-colors disabled:opacity-60 shadow-sm"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                        </>
                      ) : (
                        <>
                          Charger plus ({remaining})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sheet filtres mobile */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetTitle className="text-lg font-bold text-foreground mb-6">Filtres</SheetTitle>
          <div className="space-y-8">
            {categoryButtons}
            {priceFilter}
            {extraFilters}
            {resetFilters}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Package, Clock, X, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useShopStore } from '@/store/useShopStore'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/lib/types'

export default function SearchDialog() {
  const { searchOpen, setSearchOpen, navigate, searchHistory, addSearchHistory, clearSearchHistory } = useShopStore()
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    if (searchOpen && products.length === 0) {
      fetch('/api/products')
        .then((r) => r.json())
        .then(setProducts)
        .catch(() => {})
    }
  }, [searchOpen, products.length])

  // À la fermeture du dialog, la requête est réinitialisée via onOpenChange
  // (voir ci-dessous) afin d'afficher l'historique à la réouverture.

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
    ).slice(0, 8)
  }, [query, products])

  const openProduct = (productId: string, searchTerm?: string) => {
    if (searchTerm?.trim()) addSearchHistory(searchTerm)
    setSearchOpen(false)
    setQuery('')
    navigate('product', { id: productId })
  }

  const submitSearch = () => {
    if (!query.trim()) return
    addSearchHistory(query)
    setSearchOpen(false)
    navigate('shop', { q: query.trim() })
    setQuery('')
  }

  return (
    <Dialog
      open={searchOpen}
      onOpenChange={(open) => {
        setSearchOpen(open)
        if (!open) setQuery('')
      }}
    >
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-2xl top-24 translate-y-0">
        <DialogTitle className="sr-only">Rechercher un produit</DialogTitle>
        <DialogDescription className="sr-only">Tapez votre recherche et accédez rapidement aux produits.</DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitSearch()
          }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full h-14 pl-12 pr-4 text-base outline-none border-b"
          />
        </form>
        <div className="max-h-80 overflow-y-auto p-2 shop-scrollbar">
          {query.trim() === '' ? (
            searchHistory.length > 0 ? (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 mb-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    <Clock className="w-3.5 h-3.5" /> Recherches récentes
                  </p>
                  <button
                    onClick={clearSearchHistory}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Effacer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 px-1">
                  {searchHistory.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="inline-flex items-center gap-1.5 bg-muted hover:bg-[#C9A961]/10 hover:text-[#C9A961] text-foreground/80 text-sm rounded-full px-3.5 py-1.5 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                Commencez à taper pour rechercher parmi nos produits
              </div>
            )
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Aucun produit trouvé pour « {query} »</div>
          ) : (
            <>
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProduct(p.id, query)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 text-left transition-colors"
                >
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-muted" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{p.name}</span>
                    <span className="block text-xs text-[#C9A961] uppercase tracking-wide">{p.category?.name}</span>
                  </span>
                  <span className="text-sm font-bold text-foreground">{formatPrice(p.price)}</span>
                </button>
              ))}
              <button
                onClick={submitSearch}
                className="w-full flex items-center justify-center gap-2 mt-1 p-3 rounded-xl text-sm font-medium text-[#C9A961] hover:bg-[#C9A961]/10 transition-colors"
              >
                Voir tous les résultats pour « {query} » <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

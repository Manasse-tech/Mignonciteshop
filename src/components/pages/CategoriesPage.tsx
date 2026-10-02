'use client'

import { ArrowRight } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { useData } from './AppShell'
import SectionHero from '@/components/shop/SectionHero'
import usePageMeta from '@/hooks/usePageMeta'

export default function CategoriesPage() {
  usePageMeta("Catégories — MignonciteShop", "Explorez nos catégories de produits : mode, sport & loisirs, maison & déco, électronique. Trouvez le produit qu'il vous faut sur MignonciteShop.")
  const { navigate } = useShopStore()
  const { categories, products, loading } = useData()

  return (
    <div className="min-h-screen bg-background">
      <SectionHero
        eyebrow="Nos univers"
        title="Catégories"
        subtitle="Explorez nos différentes catégories de produits et trouvez exactement ce que vous cherchez."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => {
              const catProducts = products.filter((p) => p.categoryId === cat.id)
              const promoCount = catProducts.filter((p) => p.oldPrice).length
              return (
                <div key={cat.id} className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                  <button
                    onClick={() => navigate('shop', { category: cat.slug })}
                    className="relative block w-full aspect-[4/5] overflow-hidden"
                  >
                    { }
                    <img
                      src={cat.image || '/images/products/photo-1445205170230-053b83016050.jpg'}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
                      <h3 className="text-xl font-bold text-white group-hover:text-[#C9A961] transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-gray-300 text-xs mt-1">
                        {catProducts.length} produits{promoCount > 0 ? ` · ${promoCount} en promo` : ''}
                      </p>
                    </div>
                  </button>
                  <div className="p-5">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]">{cat.description}</p>
                    <button
                      onClick={() => navigate('shop', { category: cat.slug })}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#C9A961] hover:gap-3 transition-all"
                    >
                      Explorer la catégorie <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Truck, Shield, RefreshCw, Headphones, Sparkles, ChevronRight, ChevronDown, History, ChevronLeft, Quote } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import { useData } from './AppShell'
import type { Product } from '@/lib/types'
import ProductCard from '@/components/shop/ProductCard'
import Stars from '@/components/shop/Stars'
import usePageMeta from '@/hooks/usePageMeta'
import FlashCountdown from '@/components/shop/FlashCountdown'
import { useToast } from '@/hooks/use-toast'

/* Ordre original du bundle (index-CJO3oG8A.js) :
   featured = Product.filter({ is_featured: true }, '-created_date', 8)
   nouveaux = Product.filter({ is_active: true }, '-created_date', 4)
   L'API /api/products trie déjà par createdAt desc ; Product n'exposant pas
   createdAt côté client, on épingle l'ordre exact via les slugs du seed. */
const FEATURED_SLUGS = [
  'veste-legere-premium',
  'tapis-de-yoga-pro',
  'ecouteurs-bluetooth-pro',
  'montre-connectee-sport',
  'halteres-ajustables',
]
const NEW_PRODUCT_SLUGS = [
  'veste-legere-premium',
  'lampe-led-design',
  'tapis-de-yoga-pro',
  'ecouteurs-bluetooth-pro',
]

export default function HomePage() {
  usePageMeta("MignonciteShop — Boutique en ligne de produits de qualité")
  const { navigate } = useShopStore()
  const { products, categories, loading, productsByIds } = useData()
  const { recentlyViewed } = useShopStore()

  const featured = useMemo(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]))
    const fromSlugs = FEATURED_SLUGS.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p && p.isFeatured))
    // Fallback : ordre API (createdAt desc) si un slug du seed manque
    return fromSlugs.length === FEATURED_SLUGS.length ? fromSlugs : products.filter((p) => p.isFeatured).slice(0, 5)
  }, [products])
  const newProducts = useMemo(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]))
    const fromSlugs = NEW_PRODUCT_SLUGS.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p))
    // Fallback : 4 premiers produits (ordre API) si un slug du seed manque
    return fromSlugs.length === NEW_PRODUCT_SLUGS.length ? fromSlugs : products.slice(0, 4)
  }, [products])
  const promos = useMemo(
    () => products.filter((p) => p.oldPrice).sort((a, b) => (b.oldPrice! - b.price) - (a.oldPrice! - a.price)).slice(0, 3),
    [products],
  )
  const viewed = useMemo(() => productsByIds(recentlyViewed).slice(0, 4), [productsByIds, recentlyViewed])

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[560px] md:min-h-[620px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          { }
          <img
            src="/images/products/photo-1441986300917-64674bd600d8.jpg"
            alt="Boutique MignonciteShop"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
          {/* Halo doré décoratif */}
          <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#C9A961]/20 blur-[120px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[320px] h-[320px] rounded-full bg-[#C9A961]/10 blur-[100px] pointer-events-none" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-4 animate-fade-up">
              Nouvelle Collection
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-fade-up">
              Découvrez
              <br />
              Notre
              <br />
              <span className="text-[#C9A961]">Univers</span>
            </h1>
            <p className="text-gray-200 text-lg mt-6 max-w-lg animate-fade-up">
              Des produits exceptionnels pour tous vos besoins. Qualité premium, prix imbattables.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8 animate-fade-up">
              <button
                onClick={() => navigate('shop')}
                className="inline-flex items-center justify-center gap-2 bg-[#C9A961] hover:bg-[#b8994f] text-white px-8 py-4 rounded-full font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-[#C9A961]/25"
              >
                Explorer la Boutique
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('categories')}
                className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-semibold hover:bg-white/20 transition-colors"
              >
                Voir les Catégories
              </button>
            </div>
          </div>
        </div>
        {/* Indicateur de scroll (styling détail) */}
        <button
          onClick={() =>
            document.getElementById('avantages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 hover:text-[#C9A961] transition-colors"
          aria-label="Faire défiler vers le bas"
        >
          <ChevronDown className="w-7 h-7 animate-bounce" />
        </button>
      </section>

      {/* ===== AVANTAGES ===== */}
      <section id="avantages" className="py-12 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Livraison Gratuite', text: 'À partir de 50€' },
              { icon: Shield, title: 'Paiement Sécurisé', text: '100% sécurisé' },
              { icon: RefreshCw, title: 'Retour Facile', text: '30 jours' },
              { icon: Headphones, title: 'Support 24/7', text: 'Assistance dédiée' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4">
                <div className="p-3 bg-[#C9A961]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-[#C9A961]" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CATÉGORIES ===== */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-2">Explorez</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">Nos Catégories</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => navigate('shop', { category: cat.slug })}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 text-left"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  { }
                  <img
                    src={cat.image || '/images/products/photo-1445205170230-053b83016050.jpg'}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#C9A961] transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-gray-300 text-sm mt-1">{cat.productCount ?? 0} produits</p>
                    <span className="inline-flex items-center gap-1 text-[#C9A961] text-sm font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Découvrir <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== PRODUITS VEDETTES ===== */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-2">Sélection</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Produits Vedettes</h2>
            </div>
            <button
              onClick={() => navigate('shop')}
              className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-[#C9A961] transition-colors"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-muted rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted/70" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          <div className="mt-8 text-center sm:hidden">
            <button
              onClick={() => navigate('shop')}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70"
            >
              Voir tous les produits <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ===== BANNIÈRE PROMO ===== */}
      {promos.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-black rounded-3xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-10 md:p-14 flex flex-col justify-center">
                  <span className="inline-block bg-[#C9A961] text-white text-sm font-bold px-4 py-2 rounded-full mb-4">
                    Offre Limitée
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 leading-tight">
                    Jusqu&apos;à -50% sur une sélection
                  </h2>
                  <p className="text-gray-400 mt-4 max-w-md">
                    Profitez de nos meilleures offres avant qu&apos;il ne soit trop tard !
                  </p>
                  <div className="mt-6">
                    <FlashCountdown />
                  </div>
                  <div className="mt-8">
                    <button
                      onClick={() => navigate('promotions')}
                      className="inline-flex items-center gap-2 gold-gradient btn-shine text-black px-8 py-4 rounded-full font-semibold hover:opacity-90 transition-opacity"
                    >
                      <Sparkles className="w-5 h-5" /> En profiter
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 p-6 content-center self-center">
                  {promos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate('product', { id: p.id })}
                      className="group relative aspect-square rounded-xl overflow-hidden"
                    >
                      { }
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <span className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] rounded-full px-2 py-1 truncate">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== NOUVEAUTÉS ===== */}
      {newProducts.length > 0 && (
        <section className="py-16 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-2">Nouveautés</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Arrivages Récents</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {newProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== TÉMOIGNAGES (ajout non répertorié — carrousel autoplay) ===== */}
      <TestimonialsSection />

      {/* ===== VUS RÉCEMMENT (ajout non répertorié) ===== */}
      {viewed.length > 0 && (
        <section className="py-16 bg-card border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-2 flex items-center gap-2">
                  <History className="w-4 h-4" /> Votre historique
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">Vus récemment</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {viewed.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== NEWSLETTER (section d'origine restaurée — Home.jsx ~305-317) ===== */}
      <NewsletterSection />
    </div>
  )
}

const TESTIMONIALS = [
  {
    name: 'Sophie M.',
    text: 'Commande reçue en 48h, emballage soigné et produit conforme. La veste est magnifique, je recommande vivement !',
    rating: 5,
    purchase: 'Veste Légère Premium',
  },
  {
    name: 'Karim B.',
    text: 'Excellent rapport qualité-prix sur les écouteurs. Le service client a répondu à ma question en moins d\'une heure.',
    rating: 5,
    purchase: 'Écouteurs Bluetooth Pro',
  },
  {
    name: 'Léa G.',
    text: 'Ma 3ème commande sur MignonciteShop et toujours aussi satisfaite. Les retours sont simples et gratuits.',
    rating: 4,
    purchase: 'Coussin Décoratif',
  },
  {
    name: 'Antoine R.',
    text: 'La montre connectée tient toutes ses promesses, et le suivi de commande en ligne est très pratique.',
    rating: 5,
    purchase: 'Montre Connectée Sport',
  },
  {
    name: 'Inès B.',
    text: 'La bougie sent divinement bon et le verre ambré est très décoratif. Un vrai moment de détente le soir.',
    rating: 5,
    purchase: 'Bougie Parfumée Artisanale',
  },
]

function TestimonialsSection() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = TESTIMONIALS.length

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count])

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 5000)
    return () => clearInterval(timer)
  }, [paused, count])

  const t = TESTIMONIALS[index]

  return (
    <section
      className="py-16 md:py-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrousel"
      aria-label="Témoignages clients"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase mb-2">Avis clients</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Ils nous font confiance</h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="bg-card rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
            <Quote className="absolute -top-2 -left-2 w-24 h-24 text-[#C9A961]/10" aria-hidden />
            <div key={index} className="animate-fade-up">
              <Stars rating={t.rating} size={18} className="mb-5" />
              <p className="text-foreground/90 text-lg md:text-xl leading-relaxed mb-8">« {t.text} »</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-black font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">Client vérifié · a acheté {t.purchase}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Flèches */}
          <button
            onClick={() => go(index - 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full bg-card shadow-md border border-border hidden sm:flex items-center justify-center text-muted-foreground hover:text-[#C9A961] hover:border-[#C9A961] transition-colors"
            aria-label="Témoignage précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(index + 1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 md:translate-x-1/2 w-10 h-10 rounded-full bg-card shadow-md border border-border hidden sm:flex items-center justify-center text-muted-foreground hover:text-[#C9A961] hover:border-[#C9A961] transition-colors"
            aria-label="Témoignage suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Points */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Aller au témoignage ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'w-8 bg-[#C9A961]' : 'w-2 bg-muted-foreground/25 hover:bg-muted-foreground/45'
                }`
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ===== NEWSLETTER — section d'origine (Home.jsx ~305-317) ===== */
function NewsletterSection() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || subscribing) return
    setSubscribing(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmail('')
        toast({
          title: data.alreadySubscribed ? 'Déjà inscrit' : 'Inscription confirmée',
          description: data.alreadySubscribed
            ? 'Vous êtes déjà abonné à notre newsletter.'
            : 'Bienvenue dans la famille MignonciteShop !',
        })
      } else {
        toast({ title: 'Erreur', description: data.error || 'Inscription impossible', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Rejoignez Notre Newsletter</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Recevez en avant-première nos offres exclusives et nouveautés
        </p>
        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre email"
            aria-label="Votre email"
            className="flex-1 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A961]"
          />
          <button
            type="submit"
            disabled={subscribing}
            className="px-8 py-4 bg-[#C9A961] text-white rounded-full font-semibold hover:bg-[#b8994f] transition-colors disabled:opacity-50"
          >
            S&apos;abonner
          </button>
        </form>
      </div>
    </section>
  )
}

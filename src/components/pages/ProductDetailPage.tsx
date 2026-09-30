'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingBag, Heart, Minus, Plus, Truck, Shield, RefreshCw, Check, ChevronRight, Package, Star, Send, GitCompareArrows, Share2, ThumbsUp, BadgeCheck, MessageCircleQuestion, MessageSquare, Bell, PartyPopper, X, Camera,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ToastAction } from '@/components/ui/toast'
import { useShopStore } from '@/store/useShopStore'
import { useData } from './AppShell'
import { formatPrice, discountPercent, formatDate, parseJsonArray } from '@/lib/format'
import Stars from '@/components/shop/Stars'
import ProductCard from '@/components/shop/ProductCard'
import PriceHistoryChart from '@/components/shop/PriceHistoryChart'
import FrequentlyBoughtTogether from '@/components/shop/FrequentlyBoughtTogether'
import SocialProof from '@/components/shop/SocialProof'
import { useToast } from '@/hooks/use-toast'
import usePageMeta from '@/hooks/usePageMeta'
import type { ProductQuestion, Review } from '@/lib/types'

export default function ProductDetailPage() {
  const { params, navigate, addToCart, wishlist, toggleWishlist, addRecentlyViewed, compare, toggleCompare, votedReviews, addReviewVote, votedQuestions, addQuestionVote, stockAlerts, addStockAlert, dismissStockAlert } = useShopStore()
  const { products, getProduct, loading, productReviews, refreshProducts } = useData()
  const { toast } = useToast()

  // Résolution par id (navigation interne) ou par slug (deep-link partageable / SEO)
  const product = params.id
    ? getProduct(params.id)
    : params.slug
      ? products.find((p) => p.slug === params.slug)
      : undefined
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)
  const [reviews, setReviews] = useState<Review[]>([])
  const [votingReview, setVotingReview] = useState<string | null>(null)
  const [reviewForm, setReviewForm] = useState({ author: '', rating: 5, title: '', content: '' })
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([])
  const [photoInput, setPhotoInput] = useState('')
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [questions, setQuestions] = useState<ProductQuestion[]>([])
  const [questionForm, setQuestionForm] = useState({ author: '', question: '' })
  const [submittingQuestion, setSubmittingQuestion] = useState(false)
  const [votingQuestion, setVotingQuestion] = useState<string | null>(null)

  const isFavorite = product ? wishlist.includes(product.id) : false

  // JSON-LD Product : données structurées pour les rich results Google
  // (prix, disponibilité, note). Injecté/mis à jour à chaque produit affiché.
  useEffect(() => {
    if (!product) return
    const scriptId = 'jsonld-product'
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || undefined,
      image: product.image ? [product.image] : undefined,
      sku: product.id,
      offers: {
        '@type': 'Offer',
        price: product.price.toFixed(2),
        priceCurrency: 'EUR',
        availability:
          product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
      ...(product.reviewCount > 0 && product.rating > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.rating.toFixed(1),
              reviewCount: product.reviewCount,
            },
          }
        : {}),
    }
    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(data)
    return () => {
      document.getElementById(scriptId)?.remove()
    }
  }, [product])

  // SEO dynamique : titre + description dérivés du produit affiché
  usePageMeta(
    product ? `${product.name} — MignonciteShop` : 'Produit — MignonciteShop',
    product ? (product.description || undefined) : undefined,
  )

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product.id)
      setSelectedSize(null)
      setSelectedColor(null)
      setQuantity(1)
      setActiveImage(0)
      productReviews(product.id).then(setReviews)
      fetch(`/api/questions?productId=${product.id}&status=answered`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setQuestions)
        .catch(() => {})
    }
     
  }, [product?.id])

  const gallery = useMemo(() => {
    if (!product) return []
    const g = parseJsonArray(product.gallery)
    return g.length > 0 ? g : [product.image]
  }, [product])

  const sizes = useMemo(() => (product ? parseJsonArray(product.sizes) : []), [product])

  const colors = useMemo(() => (product ? parseJsonArray(product.colors) : []), [product])

  const related = useMemo(() => {
    if (!product) return []
    return products
      .filter((p) => p.id !== product.id && (p.categoryId === product.categoryId || p.isFeatured))
      .slice(0, 4)
  }, [products, product])

  const handleVoteHelpful = async (reviewId: string) => {
    if (votedReviews.includes(reviewId) || votingReview) return
    setVotingReview(reviewId)
    // Optimiste : +1 immédiat
    setReviews((rs) => rs.map((r) => (r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount ?? 0) + 1 } : r)))
    addReviewVote(reviewId)
    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setReviews((rs) => rs.map((r) => (r.id === reviewId ? { ...r, helpfulCount: data.helpfulCount } : r)))
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer votre vote', variant: 'destructive' })
    } finally {
      setVotingReview(null)
    }
  }

  const handleVoteQuestion = async (questionId: string) => {
    if (votedQuestions.includes(questionId) || votingQuestion) return
    setVotingQuestion(questionId)
    // Optimiste : +1 immédiat
    setQuestions((qs) => qs.map((q) => (q.id === questionId ? { ...q, helpfulCount: (q.helpfulCount ?? 0) + 1 } : q)))
    addQuestionVote(questionId)
    try {
      const res = await fetch(`/api/questions/${questionId}/vote`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setQuestions((qs) => qs.map((q) => (q.id === questionId ? { ...q, helpfulCount: data.helpfulCount } : q)))
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible d\'enregistrer votre vote', variant: 'destructive' })
    } finally {
      setVotingQuestion(null)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reviewForm, productId: product.id, photos: reviewPhotos }),
      })
      if (res.ok) {
        toast({
          title: 'Merci pour votre avis !',
          description: reviewPhotos.length > 0
            ? `Votre avis (${reviewPhotos.length} photo${reviewPhotos.length > 1 ? 's' : ''}) sera publié après validation par notre équipe.`
            : 'Votre avis sera publié après validation par notre équipe.',
        })
        setReviewForm({ author: '', rating: 5, title: '', content: '' })
        setReviewPhotos([])
        setPhotoInput('')
      } else {
        toast({ title: 'Erreur', description: 'Impossible d\'envoyer votre avis', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setSubmittingQuestion(true)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...questionForm, productId: product.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast({
          title: 'Question envoyée !',
          description: 'Notre équipe vous répondra dans les plus brefs délais.',
        })
        setQuestionForm({ author: '', question: '' })
      } else {
        toast({ title: 'Erreur', description: data.error || 'Impossible d\'envoyer votre question', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
    } finally {
      setSubmittingQuestion(false)
    }
  }

  // ===== États de chargement / introuvable =====
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C9A961] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-foreground mb-4">Produit non trouvé</h2>
        <button
          onClick={() => navigate('shop')}
          className="text-[#C9A961] hover:underline"
        >
          Retour à la boutique
        </button>
      </div>
    )
  }

  const discount = discountPercent(product.price, product.oldPrice)
  const sizeList = sizes
  const colorList = colors

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Fil d'Ariane */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="Fil d'Ariane">
          <button onClick={() => navigate('home')} className="hover:text-[#C9A961] transition-colors">Accueil</button>
          <ChevronRight className="w-4 h-4" />
          <button onClick={() => navigate('shop')} className="hover:text-[#C9A961] transition-colors">Boutique</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          {/* Galerie */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted shadow-sm">
              { }
              <img
                src={gallery[activeImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount && (
                <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  -{discount}%
                </span>
              )}
              {product.isFeatured && (
                <span className="absolute top-4 right-4 bg-[#C9A961] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  Vedette
                </span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 mt-4">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      activeImage === i ? 'border-[#C9A961]' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    { }
                    <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos */}
          <div>
            <p className="text-xs text-[#C9A961] font-medium uppercase tracking-wider mb-2">
              {product.category?.name || 'Produit'}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{product.name}</h1>
            <div className="flex items-center gap-3 mb-4">
              <Stars rating={product.rating} size={16} />
              <span className="text-sm text-muted-foreground">
                {product.rating}/5 · {reviews.length > 0 ? `${reviews.length} avis vérifié(s)` : `${product.reviewCount} avis`}
              </span>
            </div>

            {/* Preuve sociale dynamique (ajout non répertorié) */}
            <SocialProof productId={product.id} stock={product.stock} />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
              <span className="text-3xl font-bold text-foreground">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="text-xl text-muted-foreground/80 line-through">{formatPrice(product.oldPrice)}</span>
              )}
              {discount && (
                <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  Économisez {formatPrice((product.oldPrice ?? 0) - product.price)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

            {/* Tailles */}
            {sizeList.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Taille {selectedSize && <span className="text-[#C9A961]">: {selectedSize}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizeList.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(selectedSize === s ? null : s)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedSize === s
                          ? 'border-[#C9A961] bg-[#C9A961] text-white'
                          : 'border-border hover:border-[#C9A961] text-foreground/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Couleurs */}
            {colorList.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Couleur {selectedColor && <span className="text-[#C9A961]">: {selectedColor}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colorList.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(selectedColor === c ? null : c)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedColor === c
                          ? 'border-[#C9A961] bg-[#C9A961] text-white'
                          : 'border-border hover:border-[#C9A961] text-foreground/80'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantité + stock */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
              <div className="flex items-center border border-border rounded-full bg-card">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:text-[#C9A961] transition-colors"
                  aria-label="Diminuer la quantité"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                  className="p-3 hover:text-[#C9A961] transition-colors"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {product.stock > 0 ? (
                <span className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-medium">En stock</span>
                  <span className="text-muted-foreground">({product.stock} disponibles)</span>
                </span>
              ) : (
                <span className="text-red-500 font-medium">Rupture de stock</span>
              )}
            </div>

            {/* Alerte retour en stock (ajout non répertorié) */}
            {product.stock === 0 && (
              <div className="mb-6">
                {stockAlerts.includes(product.id) ? (
                  <p className="flex items-center gap-2 text-sm text-[#C9A961] font-medium bg-[#C9A961]/10 rounded-xl px-4 py-3">
                    <Bell className="w-4 h-4 fill-[#C9A961]" />
                    Vous serez averti(e) dès son retour en stock.
                  </p>
                ) : (
                  <button
                    onClick={() => {
                      addStockAlert(product.id)
                      toast({ title: 'Alerte activée', description: 'Nous vous préviendrons dès le retour de ce produit en stock.' })
                    }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-foreground border border-border bg-card rounded-full px-5 py-3 hover:border-[#C9A961] hover:text-[#C9A961] transition-colors active:scale-95"
                  >
                    <Bell className="w-4 h-4" />
                    M&apos;avertir du retour en stock
                  </button>
                )}
              </div>
            )}
            {product.stock > 0 && stockAlerts.includes(product.id) && (
              <div className="mb-6 flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <PartyPopper className="w-4 h-4" />
                  Bonne nouvelle : ce produit est de retour en stock !
                </p>
                <button
                  onClick={() => dismissStockAlert(product.id)}
                  className="text-xs font-semibold text-green-700 hover:underline"
                  aria-label="Masquer l'alerte de retour en stock"
                >
                  Masquer
                </button>
              </div>
            )}

            {/* Boutons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button
                onClick={() => {
                  if (product.stock <= 0) {
                    toast({ title: 'Rupture de stock', variant: 'destructive' })
                    return
                  }
                  addToCart(product, quantity, selectedSize, selectedColor)
                  toast({
                    title: 'Ajouté au panier',
                    description: `${quantity} × ${product.name}`,
                    action: (
                      <ToastAction altText="Voir le panier" onClick={() => navigate('cart')}>
                        Voir le panier
                      </ToastAction>
                    ),
                  })
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 btn-shine bg-[#C9A961] text-black px-8 py-4 rounded-full font-semibold hover:bg-[#b8994f] hover:text-black transition-colors disabled:opacity-40"
                disabled={product.stock <= 0}
              >
                <ShoppingBag className="w-5 h-5" />
                Ajouter au panier
              </button>
              <button
                onClick={() => {
                  toggleWishlist(product.id)
                  toast({ title: isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris' })
                }}
                className={`inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold border transition-colors ${
                  isFavorite
                    ? 'border-[#C9A961] bg-[#C9A961]/10 text-[#C9A961]'
                    : 'border-border text-foreground/80 hover:border-[#C9A961]'
                }`}
                aria-label="Ajouter aux favoris"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-[#C9A961]' : ''}`} />
                {isFavorite ? 'Favori' : 'Favoris'}
              </button>
              <button
                onClick={() => {
                  const isCompared = compare.includes(product.id)
                  if (!isCompared && compare.length >= 3) {
                    toast({ title: 'Comparateur plein', description: 'Retirez un produit avant d\'en ajouter un autre (max 3).' })
                    return
                  }
                  toggleCompare(product.id)
                  toast({ title: isCompared ? 'Retiré du comparateur' : 'Ajouté au comparateur', description: product.name })
                }}
                className={`inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold border transition-colors ${
                  compare.includes(product.id)
                    ? 'border-[#C9A961] bg-[#C9A961] text-white'
                    : 'border-border text-foreground/80 hover:border-[#C9A961]'
                }`}
                aria-label="Comparer ce produit"
                title="Comparer ce produit"
              >
                <GitCompareArrows className="w-5 h-5" />
              </button>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/?page=product&slug=${product.slug}`
                  // Partage natif (mobile) sinon copie du lien
                  if (typeof navigator.share === 'function') {
                    try {
                      await navigator.share({ title: product.name, text: product.description ?? undefined, url })
                      return
                    } catch {
                      // annulé par l'utilisateur → on ne fait rien
                      return
                    }
                  }
                  try {
                    await navigator.clipboard.writeText(url)
                    toast({ title: 'Lien copié !', description: 'Partagez ce produit avec vos proches.' })
                  } catch {
                    toast({ title: 'Impossible de copier le lien', variant: 'destructive' })
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-semibold border border-border text-foreground/80 hover:border-[#C9A961] transition-colors"
                aria-label="Partager ce produit"
                title="Partager ce produit"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Réassurance */}
            <div className="bg-muted rounded-2xl p-6 grid grid-cols-3 gap-4">
              {[
                { icon: Truck, text: 'Livraison rapide' },
                { icon: Shield, text: 'Paiement sécurisé' },
                { icon: RefreshCw, text: 'Retour 30j' },
              ].map((item) => (
                <div key={item.text} className="text-center">
                  <item.icon className="w-6 h-6 mx-auto text-[#C9A961] mb-2" />
                  <span className="text-xs text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <Tabs defaultValue="description" className="mb-16">
          <TabsList className="bg-card rounded-full p-1 h-12 max-w-full overflow-x-auto shop-scrollbar flex-nowrap">
            <TabsTrigger value="description" className="rounded-full px-4 sm:px-6 flex-shrink-0 data-[state=active]:bg-[#C9A961] data-[state=active]:text-white transition-colors">Description</TabsTrigger>
            <TabsTrigger value="details" className="rounded-full px-4 sm:px-6 flex-shrink-0 data-[state=active]:bg-[#C9A961] data-[state=active]:text-white transition-colors">Caractéristiques</TabsTrigger>
            <TabsTrigger value="avis" className="rounded-full px-4 sm:px-6 flex-shrink-0 data-[state=active]:bg-[#C9A961] data-[state=active]:text-white transition-colors">Avis ({reviews.length})</TabsTrigger>
            <TabsTrigger value="questions" className="rounded-full px-4 sm:px-6 flex-shrink-0 data-[state=active]:bg-[#C9A961] data-[state=active]:text-white transition-colors">Questions ({questions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Catégorie', value: product.category?.name || '—' },
                  { label: 'Référence', value: product.id.slice(0, 12).toUpperCase() },
                  { label: 'Stock disponible', value: `${product.stock} unités` },
                  { label: 'Note moyenne', value: `${product.rating}/5 (${product.reviewCount} avis)` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-3 border-b border-border/60 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
              {product.details && (
                <div className="mt-6">
                  <h3 className="font-semibold text-foreground mb-2">Points clés</h3>
                  <ul className="space-y-2">
                    {product.details.split('·').map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Package className="w-4 h-4 text-[#C9A961] mt-0.5 flex-shrink-0" />
                        {d.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="avis" className="mt-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">Avis Clients</h2>
              <button
                type="button"
                onClick={() => setReviewFormOpen(!reviewFormOpen)}
                className="inline-flex items-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-[#C9A961] hover:text-[#C9A961]"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {reviewFormOpen ? 'Annuler' : 'Laisser un avis'}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Liste des avis */}
              <div className={`${reviewFormOpen ? 'lg:col-span-3' : 'lg:col-span-5'} space-y-4`}>
                {reviews.length === 0 ? (
                  <div className="bg-card rounded-2xl p-10 text-center shadow-sm">
                    <Star className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">Aucun avis pour le moment. Soyez le premier à donner votre opinion !</p>
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="bg-card rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center font-bold text-black text-sm">
                            {r.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{r.author}</p>
                            <p className="text-xs text-muted-foreground/80">{formatDate(r.createdAt)}</p>
                          </div>
                        </div>
                        <Stars rating={r.rating} />
                      </div>
                      {r.title && <p className="font-semibold text-foreground text-sm mb-1">{r.title}</p>}
                      <p className="text-muted-foreground text-sm leading-relaxed">{r.content}</p>
                      {/* Photos client (clic pour agrandir) */}
                      {parseJsonArray(r.photos).length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {parseJsonArray(r.photos).map((url, idx) => (
                            <button
                              key={`${url}-${idx}`}
                              type="button"
                              onClick={() => setZoomPhoto(url)}
                              className="w-20 h-20 rounded-xl overflow-hidden border border-border hover:border-[#C9A961] hover:scale-105 transition-all"
                              aria-label={`Agrandir la photo ${idx + 1}`}
                            >
                              <img src={url} alt={`Photo client ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <BadgeCheck className="w-3.5 h-3.5" /> Achat vérifié
                        </span>
                        <button
                          onClick={() => handleVoteHelpful(r.id)}
                          disabled={votedReviews.includes(r.id)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-all active:scale-95 ${
                            votedReviews.includes(r.id)
                              ? 'bg-[#C9A961]/10 text-[#C9A961] cursor-default'
                              : 'bg-muted/50 text-muted-foreground hover:bg-[#C9A961]/10 hover:text-[#C9A961]'
                          }`}
                          aria-label="Cet avis est utile"
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${votedReviews.includes(r.id) ? 'fill-[#C9A961]' : ''}`} />
                          Utile ({r.helpfulCount ?? 0})
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Formulaire d'avis (ouvert via « Laisser un avis ») */}
              {reviewFormOpen && (
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmitReview} className="bg-card rounded-2xl p-6 shadow-sm sticky top-32">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-foreground/80 mb-1 block">Votre note</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                            aria-label={`Note ${s}`}
                          >
                            <Star
                              className={`w-6 h-6 transition-colors ${
                                s <= reviewForm.rating ? 'fill-[#C9A961] text-[#C9A961]' : 'text-muted-foreground/50'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      required
                      placeholder="Votre nom"
                      value={reviewForm.author}
                      onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                    />
                    <input
                      placeholder="Titre (optionnel)"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                    />
                    <textarea
                      required
                      rows={4}
                      placeholder="Partagez votre expérience..."
                      value={reviewForm.content}
                      onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                    />
                    {/* Photos de l'avis (ajout non répertorié : jusqu'à 3 visuels) */}
                    <div>
                      <label className="text-xs font-medium text-foreground/80 mb-1 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#C9A961]" />
                        Ajouter des photos ({reviewPhotos.length}/3)
                      </label>
                      {reviewPhotos.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {reviewPhotos.map((url, idx) => (
                            <div key={`${url}-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group/photo">
                              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setReviewPhotos((list) => list.filter((_, i) => i !== idx))}
                                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                                aria-label={`Retirer la photo ${idx + 1}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={photoInput}
                          onChange={(e) => setPhotoInput(e.target.value)}
                          placeholder="Coller l'URL d'une image…"
                          className="flex-1 h-9 px-3 rounded-md border border-border text-xs focus:outline-none focus:border-[#C9A961]"
                        />
                        <button
                          type="button"
                          disabled={reviewPhotos.length >= 3 || !photoInput.trim()}
                          onClick={() => {
                            const url = photoInput.trim()
                            if (url && !reviewPhotos.includes(url)) {
                              setReviewPhotos((list) => [...list, url])
                              setPhotoInput('')
                            }
                          }}
                          className="h-9 px-3 rounded-md border border-[#C9A961]/50 text-xs font-medium text-[#C9A961] hover:bg-[#C9A961]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Ajouter
                        </button>
                      </div>
                      {/* Raccourcis : images de la galerie produit */}
                      {gallery.length > 1 && (
                        <div className="mt-2">
                          <p className="text-[11px] text-muted-foreground/80 mb-1.5">Galerie du produit :</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {gallery.slice(0, 4).map((g) => (
                              <button
                                key={g}
                                type="button"
                                disabled={reviewPhotos.length >= 3 || reviewPhotos.includes(g)}
                                onClick={() => setReviewPhotos((list) => [...list, g])}
                                className="w-11 h-11 rounded-md overflow-hidden border border-border hover:border-[#C9A961] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Utiliser cette image"
                              >
                                <img src={g} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#C9A961] text-white py-3 rounded-full font-semibold hover:bg-[#b8994f] transition-colors disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Publier mon avis
                    </button>
                    <p className="text-xs text-muted-foreground/80 text-center">
                      Les avis sont modérés avant publication.
                    </p>
                  </div>
                </form>
              </div>
              )}
            </div>
          </TabsContent>

          {/* Questions / Réponses (ajout non répertorié) */}
          <TabsContent value="questions" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 space-y-4">
                {questions.length === 0 ? (
                  <div className="bg-card rounded-2xl p-10 text-center shadow-sm">
                    <MessageCircleQuestion className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">Aucune question pour le moment. Une hésitation ? Posez votre question, notre équipe vous répond rapidement !</p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                          Q
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">
                            <span className="font-semibold">{q.author}</span>
                            <span className="text-muted-foreground/80 text-xs ml-2">{formatDate(q.createdAt)}</span>
                          </p>
                          <p className="text-foreground/80 text-sm leading-relaxed mt-1">{q.question}</p>
                        </div>
                      </div>
                      {q.answer && (
                        <div className="flex items-start gap-3 bg-background rounded-xl p-4 border-l-2 border-[#C9A961]">
                          <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center text-sm font-bold text-black flex-shrink-0">
                            R
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground leading-relaxed">
                              <span className="font-semibold text-[#C9A961]">MignonciteShop</span>
                              {q.answeredAt && <span className="text-muted-foreground/80 text-xs ml-2">{formatDate(q.answeredAt)}</span>}
                            </p>
                            <p className="text-foreground/80 text-sm leading-relaxed mt-1">{q.answer}</p>
                            {/* Vote "Utile" sur la réponse (1 vote par visiteur) */}
                            <button
                              onClick={() => handleVoteQuestion(q.id)}
                              disabled={votedQuestions.includes(q.id) || votingQuestion === q.id}
                              className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                                votedQuestions.includes(q.id)
                                  ? 'border-[#C9A961] bg-[#C9A961]/10 text-[#C9A961]'
                                  : 'border-border text-muted-foreground hover:bg-[#C9A961]/10 hover:text-[#C9A961] hover:border-[#C9A961]/50'
                              }`}
                              aria-label={votedQuestions.includes(q.id) ? 'Réponse jugée utile' : 'Cette réponse m\'a été utile'}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${votedQuestions.includes(q.id) ? 'fill-[#C9A961]' : ''}`} />
                              {votedQuestions.includes(q.id) ? 'Utile' : 'Cette réponse m\'a été utile'} ({q.helpfulCount ?? 0})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Formulaire de question */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmitQuestion} className="bg-card rounded-2xl p-6 shadow-sm sticky top-32">
                  <h3 className="font-bold text-foreground mb-1">Poser une question</h3>
                  <p className="text-xs text-muted-foreground/80 mb-4">Réponse de notre équipe sous 24-48h ouvrées.</p>
                  <div className="space-y-3">
                    <input
                      required
                      placeholder="Votre prénom"
                      value={questionForm.author}
                      onChange={(e) => setQuestionForm({ ...questionForm, author: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                    />
                    <textarea
                      required
                      rows={4}
                      minLength={10}
                      placeholder="Votre question sur ce produit..."
                      value={questionForm.question}
                      onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                    />
                    <button
                      type="submit"
                      disabled={submittingQuestion}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#C9A961] text-black py-3 rounded-full font-semibold hover:bg-[#b8994f] hover:text-black transition-colors disabled:opacity-50"
                    >
                      {submittingQuestion ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MessageCircleQuestion className="w-4 h-4" />
                      )}
                      Envoyer ma question
                    </button>
                    <p className="text-xs text-muted-foreground/80 text-center">
                      Les questions sont validées avant publication.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Historique des prix (courbe si ≥ 2 relevés) — key force le remount entre produits */}
        {product && <PriceHistoryChart key={product.id} productId={product.id} />}

        {/* Fréquemment achetés ensemble : pack de 3 avec remise (ajout non répertorié) */}
        {product && product.stock > 0 && (
          <FrequentlyBoughtTogether key={`fbt-${product.id}`} product={product} />
        )}

        {/* Produits similaires */}
        {related.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Vous aimerez aussi</h2>
              <button
                onClick={() => navigate('shop')}
                className="text-sm font-medium text-[#C9A961] hover:underline"
              >
                Voir tout
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom photo d'avis client */}
      <Dialog open={!!zoomPhoto} onOpenChange={(open) => !open && setZoomPhoto(null)}>
        <DialogContent className="max-w-2xl p-2 bg-card border-border">
          <DialogTitle className="sr-only">Photo client agrandie</DialogTitle>
          {zoomPhoto && (
            <img src={zoomPhoto} alt="Photo client agrandie" className="w-full max-h-[75vh] object-contain rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Banknote, Wallet, Truck, Loader2, ShieldCheck, Zap, Store, MapPin, Gift, Sparkles, ArrowLeft, Tag, CheckCircle2, Smartphone } from 'lucide-react'
import { useShopStore, cartSubtotal, cartCount, promoDiscount, SHIPPING_METHODS, type ShippingMethodId } from '@/store/useShopStore'
import { useAdminAuthStore } from '@/store/useAdminAuthStore'
import { formatPrice } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import usePageMeta from '@/hooks/usePageMeta'
import { useSessionGate } from '@/hooks/useSessionGate'
import AuthGate from '@/components/pages/AuthGate'
import { serverClear } from '@/lib/cartSync'

interface LoyaltyBalance {
  balance: number
  usableBlocks: number
  maxValue: number
}

const POINTS_BLOCK = 100 // 100 pts = 5 €
const BLOCK_VALUE = 5

export default function CheckoutPage() {
  usePageMeta("Paiement — Finaliser la commande | MignonciteShop", "Finalisez votre commande en toute sécurité : adresse de livraison, mode d'expédition et paiement 100 % sécurisé.")
  const { cart, navigate, promo, setPromo, clearCart } = useShopStore()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>('standard')
  const [loyalty, setLoyalty] = useState<LoyaltyBalance | null>(null)
  const [usePoints, setUsePoints] = useState(false)
  const [pointsSlider, setPointsSlider] = useState(0)
  const [promoInput, setPromoInput] = useState('')
  const [promoValidating, setPromoValidating] = useState(false)
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    paymentMethod: 'CinetPay',
    notes: '',
  })

  const subtotal = cartSubtotal(cart)
  const count = cartCount(cart)

  // Auth obligatoire au checkout (original Base44) + pré-remplissage du compte
  const sessionStatus = useSessionGate()
  const sessionUser = useAdminAuthStore((s) => s.user)

  // Pré-remplit nom/email depuis le compte connecté (une seule fois)
  useEffect(() => {
    if (sessionStatus === 'authed' && sessionUser) {
      setForm((f) => ({
        ...f,
        customerName: f.customerName || sessionUser.name,
        customerEmail: sessionUser.email, // email du compte, non modifiable
      }))
    }
  }, [sessionStatus, sessionUser])

  // Solde fidélité (du compte connecté) : chargé une fois au montage
  useEffect(() => {
    if (sessionStatus !== 'authed') return
    fetch('/api/loyalty')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LoyaltyBalance | null) => setLoyalty(d))
      .catch(() => {})
  }, [sessionStatus])

  // Plafond : le solde disponible ET la remise ne peut pas dépasser le sous-total
  const maxPointsUsable = useMemo(() => {
    if (!loyalty || loyalty.usableBlocks <= 0) return 0
    const blocks = Math.min(loyalty.usableBlocks, Math.floor(subtotal / BLOCK_VALUE))
    return blocks * POINTS_BLOCK
  }, [loyalty, subtotal])

  // Ramène le curseur dans la plage valide si le panier change
  useEffect(() => {
    if (pointsSlider > maxPointsUsable) setPointsSlider(maxPointsUsable)
  }, [maxPointsUsable, pointsSlider])

  const pointsUsedNow = usePoints ? Math.floor(pointsSlider / POINTS_BLOCK) * POINTS_BLOCK : 0
  const pointsValue = (pointsUsedNow / POINTS_BLOCK) * BLOCK_VALUE

  const { discount, shipping, total, freeShipping } = useMemo(() => {
    const disc = promoDiscount(promo, subtotal) + pointsValue
    const promoFree = promo?.type === 'shipping'
    const method = SHIPPING_METHODS.find((m) => m.id === shippingMethod) ?? SHIPPING_METHODS[0]
    let ship = method.price
    if (promoFree) ship = 0
    else if (method.freeThreshold !== null && subtotal >= method.freeThreshold) ship = 0
    const tot = Math.max(0, subtotal - disc) + ship
    return { discount: disc, shipping: ship, total: tot, freeShipping: promoFree }
  }, [promo, subtotal, shippingMethod, pointsValue])

  // Points gagnés sur cette commande : 1 € net payé (hors livraison) = 1 pt
  const pointsToEarn = Math.max(0, Math.floor(subtotal - discount))

  const applyPromoCode = async (code: string, subtotalValue = subtotal) => {
    if (!code.trim()) return
    setPromoValidating(true)
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: subtotalValue }),
      })
      const data = await res.json()
      if (data.valid) {
        setPromo({ code: data.code, type: data.type, value: data.value, label: data.label })
        setPromoInput('')
        toast({ title: 'Code promo appliqué', description: data.label })
      } else {
        toast({ title: 'Code invalide', description: data.error || 'Ce code promo n\'est pas valide', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de valider le code', variant: 'destructive' })
    } finally {
      setPromoValidating(false)
    }
  }

  // Murs de session (après TOUS les hooks — Rules of Hooks)
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
        <span className="sr-only">Vérification de la session…</span>
        <Loader2 className="w-8 h-8 animate-spin text-[#C9A961]" aria-hidden="true" />
      </div>
    )
  }
  if (sessionStatus === 'anon') {
    return (
      <AuthGate
        title="Finalisez votre commande"
        message="Connectez-vous pour finaliser votre commande — vos informations et votre fidélité sont rattachées à votre compte."
        returnTo="checkout"
      />
    )
  }

  // Panier vide → fallback (texte exact de l'original)
  if (cart.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-foreground mb-4">Votre panier est vide</h2>
        <button onClick={() => navigate('shop')} className="text-[#C9A961] hover:underline">
          Retour à la boutique
        </button>
      </div>
    )
  }

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    // Comportement de l'original : champs * requis (HTML required) + garde-fou toast
    if (
      !form.customerName.trim() ||
      !form.customerEmail.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.postalCode.trim() ||
      !form.country.trim()
    ) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs marqués d\'un *.', variant: 'destructive' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      toast({ title: 'Email invalide', description: 'Veuillez saisir une adresse email valide.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shippingMethod,
          promoCode: promo?.code ?? null,
          discount,
          pointsUsed: pointsUsedNow,
          items: cart.map((i) => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            image: i.image,
            quantity: i.quantity,
          })),
        }),
      })
      if (res.ok) {
        const order = await res.json()
        if (order.paymentUrl) {
          window.location.assign(order.paymentUrl)
          return
        }
        clearCart()
        // Purge du panier serveur (collection Cart) : sinon les articles
        // réapparaîtraient à la prochaine connexion sur un autre appareil.
        serverClear().catch(() => {})
        navigate('order-confirmation', { orderNumber: order.orderNumber, total: String(order.total) })
      } else {
        const data = await res.json()
        toast({ title: 'Erreur', description: data.error || 'Commande impossible', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full h-11 px-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-[#C9A961] transition-colors'

  const PAYMENTS = [
    { id: 'CinetPay', label: 'Mobile Money — CinetPay', desc: 'Orange Money, MTN MoMo, Moov Money, Wave', icon: Smartphone },
    { id: 'Paiement à la livraison', label: 'Paiement à la livraison', desc: 'Espèces à la réception', icon: Banknote },
  ]

  const SHIPPING_ICONS: Record<ShippingMethodId, typeof Truck> = {
    standard: Truck,
    express: Zap,
    relais: Store,
  }

  const shippingMethodLabel =
    SHIPPING_METHODS.find((m) => m.id === shippingMethod)?.label ?? 'Livraison Standard'

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau titre (structure de l'original : lien retour + titre aligné à gauche) */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('cart')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#C9A961] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Retour au panier
          </button>
          <h1 className="text-3xl font-bold text-foreground">Finaliser la commande</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Formulaire UNIQUE (structure de l'original) */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contenu principal */}
            <div className="lg:col-span-2 space-y-8">
              {/* Adresse de livraison (champs exacts de l'original, sans placeholder) */}
              <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C9A961]" /> Adresse de livraison
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="customerName" className="text-sm font-medium text-foreground/80 mb-1.5 block">Nom complet *</label>
                    <input id="customerName" name="customerName" className={inputClass} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
                  </div>
                  {/* Champ Email : ajout documenté (programme de fidélité /api/loyalty agrégé par customerEmail) */}
                  <div className="sm:col-span-2">
                    <label htmlFor="customerEmail" className="text-sm font-medium text-foreground/80 mb-1.5 block">Email *</label>
                    <input id="customerEmail" name="customerEmail" type="email" className={inputClass} value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className="text-sm font-medium text-foreground/80 mb-1.5 block">Adresse *</label>
                    <input id="address" name="address" className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="city" className="text-sm font-medium text-foreground/80 mb-1.5 block">Ville *</label>
                    <input id="city" name="city" className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="text-sm font-medium text-foreground/80 mb-1.5 block">Code postal *</label>
                    <input id="postalCode" name="postalCode" className={inputClass} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="country" className="text-sm font-medium text-foreground/80 mb-1.5 block">Pays *</label>
                    <input id="country" name="country" className={inputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="phone" className="text-sm font-medium text-foreground/80 mb-1.5 block">Téléphone *</label>
                    <input id="phone" name="phone" type="tel" className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                  </div>
                </div>
              </div>

              {/* Mode de livraison (ajout compact, au-dessus du paiement) */}
              <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#C9A961]" /> Mode de livraison
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SHIPPING_METHODS.map((m) => {
                    const Icon = SHIPPING_ICONS[m.id as ShippingMethodId]
                    const isFree = promo?.type === 'shipping' || (m.freeThreshold !== null && subtotal >= m.freeThreshold)
                    const active = shippingMethod === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setShippingMethod(m.id as ShippingMethodId)}
                        className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                          active ? 'border-[#C9A961] bg-[#C9A961]/5 shadow-sm' : 'border-border hover:border-border'
                        }`}
                      >
                        {isFree && (
                          <span className="absolute -top-2.5 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Gratuite
                          </span>
                        )}
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center ${active ? 'bg-[#C9A961] text-white' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-semibold text-foreground">{m.label}</span>
                        <span className="text-[11px] text-muted-foreground leading-snug">{m.desc}</span>
                        <span className="text-sm font-bold text-[#C9A961] mt-auto">{isFree ? 'Gratuit' : formatPrice(m.price)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Mode de paiement (identique à l'original) */}
              <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#C9A961]" /> Mode de paiement
                </h2>
                <div className="space-y-3">
                  {PAYMENTS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: pm.id })}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors ${
                        form.paymentMethod === pm.id
                          ? 'border-[#C9A961] bg-[#C9A961]/5'
                          : 'border-border hover:border-border'
                      }`}
                    >
                      <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                        form.paymentMethod === pm.id ? 'bg-[#C9A961] text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        <pm.icon className="w-5 h-5" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold text-foreground">{pm.label}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{pm.desc}</span>
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        form.paymentMethod === pm.id ? 'border-[#C9A961] bg-[#C9A961]' : 'border-border'
                      }`}>
                        {form.paymentMethod === pm.id && <Check className="w-3 h-3 text-white" />}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex items-start gap-3 bg-muted/50 rounded-xl p-4">
                  <ShieldCheck className="w-5 h-5 text-[#C9A961] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Vos transactions sont protégées par un cryptage SSL 256 bits. C&apos;est une boutique de démonstration :
                    aucun paiement réel n&apos;est effectué.
                  </p>
                </div>
              </div>

              {/* Notes (optionnel) — texte et placeholder exacts de l'original */}
              <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-6">Notes (optionnel)</h2>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Instructions spéciales pour la livraison..."
                />
              </div>
            </div>

            {/* Récapitulatif latéral */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 shadow-sm sticky top-32">
                <h2 className="text-lg font-bold text-foreground mb-6">Récapitulatif</h2>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.size ?? ''}-${item.color ?? ''}`} className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        { }
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <p className="flex-1 text-sm text-foreground/80 truncate">{item.name}</p>
                      <p className="text-sm font-semibold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                {/* Code promo (ajout : même logique que le panier) */}
                {promo ? (
                  <div className="mb-4 flex items-center justify-between bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-xl px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#C9A961]">
                      <CheckCircle2 className="w-4 h-4" /> Code {promo.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPromo(null)}
                      className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label htmlFor="checkout-promo" className="text-xs font-medium text-muted-foreground mb-2 block">
                      Code promo
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                        <input
                          id="checkout-promo"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="Ex : BIENVENUE10"
                          className="w-full h-10 pl-9 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => applyPromoCode(promoInput)}
                        disabled={promoValidating || !promoInput.trim()}
                        className="h-10 px-4 rounded-lg bg-[#C9A961] text-black text-sm font-medium hover:bg-[#b8994f] hover:text-black transition-colors disabled:opacity-40"
                      >
                        {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-semibold">{formatPrice(subtotal)}</span>
                  </div>

                  {/* Conversion des points fidélité (ajout non répertorié : 100 pts = 5 €) */}
                  {loyalty && loyalty.usableBlocks > 0 && (
                    <div className="bg-muted/50 rounded-xl p-3 space-y-2.5">
                      <label className="flex items-center justify-between cursor-pointer select-none">
                        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <Gift className="w-4 h-4 text-[#C9A961]" />
                          Utiliser mes points
                          <span className="font-normal text-muted-foreground">
                            ({loyalty.balance.toLocaleString('fr-FR')} dispo.)
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={usePoints}
                          disabled={maxPointsUsable < POINTS_BLOCK}
                          onChange={(e) => {
                            setUsePoints(e.target.checked)
                            setPointsSlider(e.target.checked ? maxPointsUsable : 0)
                          }}
                          className="w-4 h-4 accent-[#C9A961]"
                          aria-label="Convertir mes points fidélité en remise"
                        />
                      </label>
                      {usePoints && maxPointsUsable >= POINTS_BLOCK && (
                        <div>
                          <input
                            type="range"
                            min={POINTS_BLOCK}
                            max={maxPointsUsable}
                            step={POINTS_BLOCK}
                            value={Math.min(pointsSlider, maxPointsUsable)}
                            onChange={(e) => setPointsSlider(parseInt(e.target.value))}
                            className="w-full accent-[#C9A961]"
                            aria-label="Montant de points à utiliser"
                          />
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{pointsUsedNow.toLocaleString('fr-FR')} pts</span>
                            <span className="font-bold text-green-600">-{formatPrice(pointsValue)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {promoDiscount(promo, subtotal) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Réduction ({promo?.code})</span>
                      <span className="font-semibold">-{formatPrice(promoDiscount(promo, subtotal))}</span>
                    </div>
                  )}
                  {pointsValue > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="inline-flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Points fidélité</span>
                      <span className="font-semibold">-{formatPrice(pointsValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison ({shippingMethodLabel.replace('Livraison ', '')})</span>
                    <span className={`font-semibold ${shipping === 0 ? 'text-green-600' : ''}`}>
                      {shipping === 0 ? 'Gratuite' : formatPrice(shipping)}
                    </span>
                  </div>
                  {freeShipping && promoDiscount(promo, subtotal) === 0 && (
                    <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                      Livraison offerte avec le code {promo?.code}
                    </p>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-bold text-[#C9A961] text-lg">{formatPrice(total)}</span>
                  </div>
                  {/* Aperçu des points gagnés */}
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-[#C9A961]/5 rounded-lg px-3 py-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#C9A961]" />
                    Vous gagnerez <span className="font-bold text-[#C9A961]">{pointsToEarn.toLocaleString('fr-FR')} points</span> avec cette commande
                  </p>
                </div>

                {/* Bouton de commande (position et style de l'original : dans le résumé, sous le Total) */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-6 h-14 btn-shine bg-[#C9A961] hover:bg-[#b8994f] text-white rounded-full text-lg font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  Payer {formatPrice(total)}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

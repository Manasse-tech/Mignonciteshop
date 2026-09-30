'use client'

import { useState } from 'react'
import { MapPin, Mail, Phone, Send, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useShopStore } from '@/store/useShopStore'
import { reopenCookiePreferences } from '@/lib/consent'

export default function Footer() {
  const { navigate } = useShopStore()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubscribing(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubscribed(true)
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

  const navLinks: { label: string; page: Parameters<typeof navigate>[0] }[] = [
    { label: 'Accueil', page: 'home' },
    { label: 'Boutique', page: 'shop' },
    { label: 'Catégories', page: 'categories' },
    { label: 'Promotions', page: 'promotions' },
    { label: 'À propos', page: 'about' },
    { label: 'Contact', page: 'contact' },
  ]

  const serviceLinks: { label: string; page: Parameters<typeof navigate>[0] }[] = [
    { label: 'Suivi de commande', page: 'tracking' },
    { label: 'Programme de fidélité', page: 'fidelite' },
    { label: 'FAQ', page: 'faq' },
    { label: 'Guide des tailles', page: 'guide-tailles' },
    { label: 'CGV', page: 'terms' },
    { label: 'Confidentialité', page: 'privacy' },
  ]

  return (
    <footer className="bg-black text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 min-w-0">
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-white">MIGNONCITE</span>
              <span className="text-[#C9A961]">SHOP</span>
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Votre destination shopping pour tous vos besoins. Des produits de qualité, des prix
              imbattables et un service client exceptionnel.
            </p>

            {/* Newsletter (ajout non répertorié dans le ZIP) */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-[#C9A961] uppercase tracking-wider mb-3">Newsletter</p>
              {subscribed ? (
                <p className="inline-flex items-center gap-2 text-sm text-[#C9A961]">
                  <CheckCircle2 className="w-4 h-4" /> Merci ! Vous êtes bien inscrit(e).
                </p>
              ) : (
                <form onSubmit={handleNewsletter} className="flex max-w-sm">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    className="flex-1 h-11 px-4 rounded-l-full bg-gray-900 border border-gray-800 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A961]"
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="h-11 px-4 rounded-r-full bg-[#C9A961] hover:bg-[#b8994f] text-white transition-colors disabled:opacity-50"
                    aria-label="S'inscrire à la newsletter"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h4 className="font-semibold text-[#C9A961] mb-4 uppercase text-sm tracking-wider">Navigation</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="group inline-flex items-center gap-0 text-gray-400 hover:text-[#C9A961] transition-all text-sm"
                  >
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-300 text-[#C9A961]">—</span>
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="font-semibold text-[#C9A961] mb-4 uppercase text-sm tracking-wider">Aide &amp; Services</h4>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.page}>
                  <button
                    onClick={() => navigate(link.page)}
                    className="group inline-flex items-center gap-0 text-gray-400 hover:text-[#C9A961] transition-all text-sm"
                  >
                    <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-300 text-[#C9A961]">—</span>
                    <span className="group-hover:translate-x-1 transition-transform duration-300">{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <h4 className="font-semibold text-[#C9A961] mb-4 uppercase text-sm tracking-wider">Contact</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C9A961] flex-shrink-0" />
                <a href="mailto:contact@mignonciteshop.com" className="hover:text-white transition-colors break-all">
                  contact@mignonciteshop.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C9A961] flex-shrink-0" />
                +33 1 23 45 67 89
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C9A961] flex-shrink-0" />
                Paris, France
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-500 text-sm">
          <p>© 2026 MignonciteShop. Tous droits réservés.</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5">
            {/* RGPD : ré-ouverture du panneau de consentement (jamais dans le menu public) */}
            <button
              onClick={reopenCookiePreferences}
              className="hover:text-[#C9A961] transition-colors cursor-pointer underline-offset-2 hover:underline"
            >
              Gestion des cookies
            </button>
            <p className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden />
              Paiement sécurisé · SSL 256 bits
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
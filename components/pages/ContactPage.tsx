'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, MessageCircle, Send } from 'lucide-react'
import SectionHero from '@/components/shop/SectionHero'
import { useToast } from '@/hooks/use-toast'
import usePageMeta from '@/hooks/usePageMeta'

export default function ContactPage() {
  usePageMeta("Contact — MignonciteShop", "Une question ? Contactez l'équipe MignonciteShop par email, téléphone ou via notre formulaire. Réponse sous 24 h ouvrées.")
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: 'Message envoyé', description: 'Notre équipe vous répondra sous 24h ouvrées.' })
        setForm({ name: '', email: '', subject: '', message: '' })
      } else {
        const data = await res.json()
        toast({ title: 'Erreur', description: data.error || 'Envoi impossible', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    'flex h-10 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:border-[#C9A961]'

  return (
    <div className="min-h-screen bg-background">
      <SectionHero
        eyebrow="Contact"
        title="Nous sommes à votre écoute"
        subtitle="Une question, une demande ou besoin d'aide ? Notre équipe vous répond rapidement."
        py="py-24"
      />

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Coordonnées */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-8">Coordonnées</h2>
              <div className="space-y-6">
                {[
                  { icon: Mail, title: 'Email', value: 'contact@mignonciteshop.com', href: 'mailto:contact@mignonciteshop.com' },
                  { icon: Phone, title: 'Téléphone', value: '+33 1 23 45 67 89', href: 'tel:+33123456789' },
                  { icon: MapPin, title: 'Adresse', value: 'Paris, France' },
                  { icon: MessageCircle, title: 'Horaires', value: 'Lun — Ven : 9h à 18h' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#C9A961]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-[#C9A961]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      {item.href ? (
                        <a href={item.href} className="text-muted-foreground hover:text-[#C9A961] transition-colors">
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-muted-foreground">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Réponse rapide garantie</h3>
                    <p className="text-sm text-muted-foreground">
                      Nous répondons à toutes les demandes en moins de 24h ouvrées. Pour les questions sur une
                      commande en cours, consultez d&apos;abord notre page de suivi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <div className="bg-card rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-foreground mb-6">Écrivez-nous</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="contact-name" className="text-sm font-medium">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-email" className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-subject" className="text-sm font-medium">Sujet</label>
                  <input
                    id="contact-subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-message" className="text-sm font-medium">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="flex min-h-[60px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:border-[#C9A961]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-[#C9A961] hover:bg-[#b8994f] text-white text-sm font-medium shadow transition-colors disabled:opacity-50"
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Envoyer le message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

'use client'

import { Award, Truck, Shield, Heart } from 'lucide-react'
import SectionHero from '@/components/shop/SectionHero'
import usePageMeta from '@/hooks/usePageMeta'

export default function AboutPage() {
  usePageMeta("À propos — MignonciteShop", "Découvrez l'univers MignonciteShop : notre histoire, nos engagements qualité, une livraison rapide et un service client à votre écoute.")
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-black text-white py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase">À propos de nous</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-4">L&apos;histoire de MignonciteShop</h1>
        </div>
      </section>

      {/* Histoire */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none space-y-6">
            <p className="text-lg text-foreground leading-relaxed">
              MignonciteShop est une boutique en ligne premium dédiée à offrir une expérience d&apos;achat
              exceptionnelle à chaque client. Née de la passion pour les produits de qualité et le service
              irréprochable, notre plateforme rassemble une sélection soignée d&apos;articles destinés à simplifier
              et embellir votre quotidien.
            </p>
            <p className="text-lg text-foreground leading-relaxed">
              Nous nous adressons aux clients exigeants qui recherchent des produits fiables, esthétiques et
              utiles, sans compromis sur la qualité. Que vous cherchiez un cadeau, un objet de décoration ou un
              accessoire pratique, notre catalogue est pensé pour répondre à vos besoins avec élégance.
            </p>
            <p className="text-lg text-foreground leading-relaxed">
              MignonciteShop est construit et géré par une équipe passionnée basée à Paris, en France. Notre
              engagement envers la satisfaction client guide chacune de nos décisions, du choix des produits à la
              livraison finale. Nous croyons qu&apos;un commerce en ligne doit être à la fois simple, transparent
              et humain.
            </p>
            <p className="text-lg text-foreground leading-relaxed">
              Chaque commande passée sur MignonciteShop est traitée avec le plus grand soin, et nous restons à
              votre disposition pour vous accompagner avant, pendant et après votre achat. Merci de votre
              confiance — elle est au cœur de tout ce que nous entreprenons.
            </p>
          </div>
        </div>
      </section>

      {/* Nos engagements */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Nos engagements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Award, title: 'Qualité', text: 'Une sélection rigoureuse de produits pour vous garantir le meilleur.' },
              { icon: Truck, title: 'Livraison rapide', text: 'Expédition soignée et rapide partout en France.' },
              { icon: Shield, title: 'Paiement sécurisé', text: 'Vos transactions sont protégées à chaque étape.' },
              { icon: Heart, title: 'Service client', text: 'Une équipe à votre écoute pour vous accompagner.' },
            ].map((item) => (
              <div key={item.title} className="bg-card rounded-2xl p-8 text-center shadow-sm">
                <div className="w-14 h-14 bg-[#C9A961]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-[#C9A961]" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

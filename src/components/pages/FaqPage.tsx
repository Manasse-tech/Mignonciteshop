'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import SectionHero from '@/components/shop/SectionHero'
import { ChevronRight } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'
import usePageMeta from '@/hooks/usePageMeta'

const FAQ_DATA: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Livraison",
    items: [
      {
        q: "Quels sont les délais de livraison ?",
        a: "La livraison standard prend 3 à 5 jours ouvrés en France métropolitaine. Pour l'Europe, comptez 5 à 10 jours ouvrés. Vous recevrez un email de confirmation avec un numéro de suivi dès l'expédition de votre commande.",
      },
      {
        q: "Combien coûte la livraison ?",
        a: "La livraison est offerte pour toute commande supérieure à 50 € en France métropolitaine. En dessous de ce montant, des frais de 5,90 € s'appliquent. Pour les livraisons internationales, le coût varie selon le pays de destination.",
      },
      {
        q: "Livrez-vous à l'international ?",
        a: "Oui, nous livrons dans toute l'Union européenne ainsi que dans de nombreux autres pays. Les frais et délais sont calculés automatiquement lors du passage de votre commande selon votre adresse de livraison.",
      },
      {
        q: "Comment suivre ma commande ?",
        a: "Dès l'expédition de votre commande, vous recevez un email contenant votre numéro de suivi. Vous pouvez également consulter le statut de votre commande à tout moment via notre page Suivi de livraison en saisissant votre numéro de commande.",
      },
    ],
  },
  {
    category: "Retours & Échanges",
    items: [
      {
        q: "Quelle est votre politique de retour ?",
        a: "Vous disposez de 30 jours à compter de la réception de votre commande pour retourner un article non porté et dans son emballage d'origine. Le remboursement est effectué sous 5 à 7 jours ouvrés après réception et vérification du produit.",
      },
      {
        q: "Comment effectuer un retour ?",
        a: "Connectez-vous à votre compte, allez dans votre historique de commandes, sélectionnez la commande concernée et cliquez sur « Demander un retour ». Vous recevrez une étiquette de retour prépayée par email.",
      },
      {
        q: "Puis-je échanger un article ?",
        a: "Oui, les échanges sont possibles sous 30 jours si le produit est disponible en stock. Si la nouvelle taille ou couleur n'est pas disponible, nous procéderons à un remboursement complet.",
      },
      {
        q: "Les frais de retour sont-ils gratuits ?",
        a: "Les frais de retour sont à la charge du client, sauf en cas de produit défectueux ou d'erreur de notre part. Dans ces cas, une étiquette prépayée vous est fournie gratuitement.",
      },
    ],
  },
  {
    category: "Paiement",
    items: [
      {
        q: "Quels modes de paiement acceptez-vous ?",
        a: "Nous acceptons les cartes bancaires (Visa, Mastercard, American Express), PayPal, et le paiement à la livraison pour les commandes en France métropolitaine. Tous les paiements en ligne sont sécurisés via cryptage SSL.",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Absolument. Toutes les transactions sont cryptées via le protocole SSL 256 bits. Vos données bancaires ne sont jamais stockées sur nos serveurs ; elles sont traitées directement par nos prestataires de paiement certifiés PCI-DSS.",
      },
      {
        q: "Puis-je payer en plusieurs fois ?",
        a: "Le paiement en 3 ou 4 fois sans frais est disponible pour toute commande supérieure à 100 € via notre partenaire de paiement. Cette option vous est proposée au moment du choix du mode de paiement.",
      },
      {
        q: "Le paiement à la livraison est-il disponible ?",
        a: "Oui, le paiement à la livraison est disponible en France métropolitaine pour les commandes inférieures à 500 €. Un supplément de 2 € s'applique pour ce service.",
      },
    ],
  },
  {
    category: "Produits & Stock",
    items: [
      {
        q: "Un produit est en rupture de stock, quand sera-t-il disponible ?",
        a: "Vous pouvez vous inscrire à la newsletter produit pour être informé dès le réapprovisionnement. En général, les produits indisponibles reviennent en stock sous 1 à 2 semaines.",
      },
      {
        q: "Vos produits sont-ils garantis ?",
        a: "Tous nos produits bénéficient d'une garantie de 2 ans contre les défauts de fabrication. Pour toute réclamation, contactez notre service client avec votre numéro de commande.",
      },
      {
        q: "Comment connaître ma taille ?",
        a: "Consultez notre Guide des Tailles disponible dans le menu pour trouver la correspondance parfaite. Si vous hésitez entre deux tailles, nous vous conseillons de choisir la plus grande pour plus de confort.",
      },
    ],
  },
  {
    category: "Compte & Commandes",
    items: [
      {
        q: "Comment créer un compte ?",
        a: "Cliquez sur l'icône utilisateur en haut de la page pour vous inscrire. Vous aurez besoin d'une adresse email valide. La création de compte est gratuite et vous permet de suivre vos commandes et de bénéficier d'offres exclusives.",
      },
      {
        q: "Comment modifier mes informations personnelles ?",
        a: "Connectez-vous à votre compte, puis accédez à « Mon Compte » pour modifier votre nom, email et autres informations. Vos modifications sont enregistrées immédiatement.",
      },
      {
        q: "Puis-je annuler ma commande ?",
        a: "Une commande peut être annulée tant qu'elle n'a pas encore été expédiée. Contactez rapidement notre service client par email ou téléphone pour demander l'annulation.",
      },
    ],
  },
]

export default function FaqPage() {
  usePageMeta("FAQ — Questions fréquentes — MignonciteShop", "Trouvez les réponses aux questions les plus fréquentes sur la livraison, les retours, les paiements et les produits MignonciteShop.")
  const { navigate } = useShopStore()

  return (
    <div className="min-h-screen bg-background">
      <SectionHero
        eyebrow="Aide & Support"
        title="Foire Aux Questions"
        subtitle="Trouvez rapidement les réponses à vos questions sur la livraison, les retours et les paiements."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {FAQ_DATA.map((group) => (
          <div key={group.category} className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#C9A961] rounded-full" />
              {group.category}
            </h2>
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                {group.items.map((item, i) => (
                  <AccordionItem key={i} value={`item-${group.category}-${i}`} className="border-b last:border-b-0">
                    <AccordionTrigger className="text-left px-6 py-4 hover:bg-muted/50 hover:no-underline font-medium text-foreground text-sm md:text-base [&[data-state=open]>svg]:rotate-180">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        ))}

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Vous n&apos;avez pas trouvé la réponse à votre question ?</p>
          <button
            onClick={() => navigate('contact')}
            className="inline-flex items-center gap-2 bg-[#C9A961] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
          >
            Contactez notre équipe <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

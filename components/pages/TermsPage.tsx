'use client'

import { FileText, CreditCard, Truck, RotateCcw, ShieldCheck, Scale } from 'lucide-react'
import SectionHero from '@/components/shop/SectionHero'
import { useShopStore } from '@/store/useShopStore'
import usePageMeta from '@/hooks/usePageMeta'

const SECTIONS = [
  {
    icon: FileText,
    title: '1. Objet',
    content:
      "Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre MinonciteShop (ci-après \"le Vendeur\") et toute personne physique ou morale (ci-après \"l'Acheteur\") souhaitant effectuer un achat sur le site minonciteshop.com. Toute commande implique l'acceptation pleine et entière des présentes CGV par l'Acheteur.",
  },
  {
    icon: CreditCard,
    title: '2. Prix et paiement',
    content:
      "Les prix affichés sur le site sont indiqués en euros toutes taxes comprises (TVA incluse). Le Vendeur se réserve le droit de modifier ses prix à tout moment, étant entendu que le prix figurant au panier le jour de la commande sera le seul applicable. Le paiement est exigible à la commande. Les modes de paiement acceptés sont : carte bancaire (Visa, Mastercard, American Express), PayPal, et paiement à la livraison (France métropolitaine uniquement, supplément de 2 €). Toutes les transactions en ligne sont sécurisées par cryptage SSL 256 bits.",
  },
  {
    icon: Truck,
    title: '3. Livraison',
    content:
      "Les commandes sont expédiées sous 24 à 48 heures ouvrées (hors week-ends et jours fériés). Les délais de livraison sont de 3 à 5 jours ouvrés en France métropolitaine et de 5 à 10 jours pour l'Europe. La livraison est offerte pour toute commande supérieure à 50 € en France métropolitaine ; en dessous, des frais de 5,90 € s'appliquent. Le Vendeur ne peut être tenu responsable des retards de livraison imputables au transporteur ou à des cas de force majeure. Si le colis n'est pas retiré dans les 14 jours par l'Acheteur, la commande sera retournée au Vendeur.",
  },
  {
    icon: RotateCcw,
    title: '4. Droit de rétractation et retours',
    content:
      "Conformément à l'article L221-18 du Code de la consommation, l'Acheteur dispose d'un délai de 30 jours à compter de la réception de ses produits pour exercer son droit de rétractation. Les articles doivent être retournés neufs, non utilisés et dans leur emballage d'origine. Le remboursement est effectué sous 5 à 7 jours ouvrés après réception et vérification du retour. Les frais de retour sont à la charge de l'Acheteur, sauf en cas de produit défectueux ou d'erreur du Vendeur. Pour initier un retour, connectez-vous à votre compte et sélectionnez la commande concernée.",
  },
  {
    icon: ShieldCheck,
    title: '5. Garantie',
    content:
      "Tous nos produits bénéficient d'une garantie légale de conformité de 2 ans contre les défauts de fabrication, conformément aux articles L217-4 et suivants du Code de la consommation. Cette garantie couvre les vices cachés et les défauts de conception. Elle ne couvre pas les dommages résultant d'une mauvaise utilisation, d'une usure normale ou d'une négligence de l'Acheteur. Pour toute réclamation au titre de la garantie, contactez le service client avec votre numéro de commande et une description du défaut.",
  },
  {
    icon: Scale,
    title: '6. Responsabilité et droit applicable',
    content:
      "Le Vendeur s'efforce de fournir des informations exactes et à jour sur les produits. Les photos et descriptions sont fournies à titre indicatif et ne sauraient engager la responsabilité du Vendeur. Le Vendeur ne sera pas responsable des dommages indirects résultant de l'utilisation des produits. Les présentes CGV sont soumises au droit français. En cas de litige, l'Acheteur est invité à contacter d'abord le service client pour une résolution amiable. À défaut, les tribunaux français seront compétents.",
  },
]

export default function TermsPage() {
  usePageMeta("Conditions générales de vente — MignonciteShop", "Consultez les conditions générales de vente de MignonciteShop : prix, paiement, livraison, rétractation et garanties.")
  const { navigate } = useShopStore()

  return (
    <div className="min-h-screen bg-background">
      <SectionHero
        icon={FileText}
        title="Conditions Générales de Vente"
        subtitle="Dernière mise à jour : 6 août 2026"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-2xl p-6 mb-10">
          <p className="text-foreground text-sm leading-relaxed">
            Les présentes conditions s&apos;appliquent à toutes les ventes de produits effectuées via le site
            MinonciteShop. Nous vous invitons à les lire attentivement avant de passer commande.
          </p>
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title} className="bg-card rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2.5 bg-[#C9A961]/10 rounded-xl">
                  <section.icon className="w-5 h-5 text-[#C9A961]" />
                </span>
                <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Une question sur nos conditions de vente ?</p>
          <button
            onClick={() => navigate('contact')}
            className="inline-flex items-center bg-[#C9A961] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#b8994f] transition-colors"
          >
            Contactez-nous
          </button>
        </div>
      </div>
    </div>
  )
}

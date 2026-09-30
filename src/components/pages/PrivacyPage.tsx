'use client'

import { Shield, Eye, Database, Lock, UserCheck, Mail } from 'lucide-react'
import SectionHero from '@/components/shop/SectionHero'
import usePageMeta from '@/hooks/usePageMeta'

export default function PrivacyPage() {
  usePageMeta("Politique de confidentialité — MignonciteShop", "Consultez la politique de confidentialité de MignonciteShop : données collectées, utilisation, protection et vos droits RGPD.")
  return (
    <div className="min-h-screen bg-background">
      <SectionHero icon={Shield} title="Politique de confidentialité" subtitle="Dernière mise à jour : 6 août 2026" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        {/* 1. Données collectées */}
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2.5 bg-[#C9A961]/10 rounded-xl">
              <Eye className="w-5 h-5 text-[#C9A961]" />
            </span>
            <h2 className="text-xl font-bold text-foreground">1. Données collectées</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Nous collectons les informations suivantes lorsque vous créez un compte ou passez une commande :
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li>Nom, prénom et adresse email (pour la création de compte et la communication)</li>
            <li>Adresse de livraison et numéro de téléphone (pour l&apos;expédition des commandes)</li>
            <li>Informations de paiement (traitées de manière sécurisée par nos prestataires, jamais stockées sur nos serveurs)</li>
            <li>Historique des commandes et préférences d&apos;achat</li>
            <li>Données de navigation (cookies, adresse IP) pour améliorer l&apos;expérience utilisateur</li>
          </ul>
        </div>

        {/* 2. Utilisation */}
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2.5 bg-[#C9A961]/10 rounded-xl">
              <Database className="w-5 h-5 text-[#C9A961]" />
            </span>
            <h2 className="text-xl font-bold text-foreground">2. Utilisation des données</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Vos données personnelles sont utilisées exclusivement pour :
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li>Traiter et expédier vos commandes</li>
            <li>Vous informer du statut de vos commandes et de votre livraison</li>
            <li>Vous proposer des offres personnalisées (avec votre consentement)</li>
            <li>Assurer le service client et le traitement des retours</li>
            <li>Respecter nos obligations légales et comptables</li>
          </ul>
        </div>

        {/* 3. Protection */}
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2.5 bg-[#C9A961]/10 rounded-xl">
              <Lock className="w-5 h-5 text-[#C9A961]" />
            </span>
            <h2 className="text-xl font-bold text-foreground">3. Protection des données</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos
            données contre tout accès non autorisé, altération, divulgation ou destruction. Toutes les transactions
            sont cryptées via le protocole SSL 256 bits. Vos données de paiement ne sont jamais stockées sur nos
            serveurs ; elles sont traitées directement par nos prestataires de paiement certifiés PCI-DSS.
          </p>
        </div>

        {/* 4. Vos droits */}
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2.5 bg-[#C9A961]/10 rounded-xl">
              <UserCheck className="w-5 h-5 text-[#C9A961]" />
            </span>
            <h2 className="text-xl font-bold text-foreground">4. Vos droits</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits
            suivants :
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
            <li><strong>Droit d&apos;accès</strong> : consulter les données que nous détenons sur vous</li>
            <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
            <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
            <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
            <li><strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
            <li><strong>Droit de retrait du consentement</strong> : à tout moment, sans effet rétroactif</li>
          </ul>
        </div>

        {/* 5. Contact */}
        <div className="bg-card rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="p-2.5 bg-[#C9A961]/10 rounded-xl">
              <Mail className="w-5 h-5 text-[#C9A961]" />
            </span>
            <h2 className="text-xl font-bold text-foreground">5. Contact & réclamations</h2>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Pour exercer vos droits ou pour toute question concernant le traitement de vos données, vous pouvez
            nous contacter à l&apos;adresse : <strong>contact@minonciteshop.com</strong>. Vous avez également le
            droit d&apos;introduire une réclamation auprès de la CNIL (Commission Nationale de l&apos;Informatique
            et des Libertés) si vous estimez que le traitement de vos données porte atteinte à vos droits.
          </p>
        </div>
      </div>
    </div>
  )
}

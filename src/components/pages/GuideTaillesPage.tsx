'use client'

import { Ruler, Shirt, Footprints, Watch } from 'lucide-react'
import SectionHero from '@/components/shop/SectionHero'
import usePageMeta from '@/hooks/usePageMeta'

const MEASURE_TIPS = [
  {
    title: 'Tour de poitrine',
    text: 'Mesurez autour de la partie la plus forte de votre poitrine, en gardant le mètre ruban horizontal et bien à plat.',
  },
  {
    title: 'Tour de taille',
    text: "Mesurez autour de votre taille naturelle, à l'endroit le plus étroit, sans serrer le mètre.",
  },
  {
    title: 'Tour de hanches',
    text: 'Mesurez autour de la partie la plus large de vos hanches, en gardant les pieds joints.',
  },
]

const CLOTHING_ROWS = [
  ['XS', '80-84', '60-64', '88-92'],
  ['S', '84-88', '64-68', '92-96'],
  ['M', '88-92', '68-72', '96-100'],
  ['L', '92-96', '72-76', '100-104'],
  ['XL', '96-100', '76-80', '104-108'],
  ['XXL', '100-104', '80-84', '108-112'],
]

const SHOES_ROWS = [
  ['38', '5.5', '5', '23.5'],
  ['39', '6.5', '6', '24.5'],
  ['40', '7', '6.5', '25'],
  ['41', '8', '7', '26'],
  ['42', '9', '8', '26.5'],
  ['43', '10', '9', '27.5'],
  ['44', '11', '10', '28'],
  ['45', '12', '11', '29'],
]

const ACCESSORY_TIPS = [
  { label: 'Ceinture', text: 'Ajoutez 10 cm à votre tour de taille pour obtenir la taille de ceinture idéale.' },
  { label: 'Chapeau', text: 'Mesurez la circonférence de votre tête à 1 cm au-dessus des sourcils.' },
  { label: 'Gants', text: "Mesurez la largeur de votre main dominante à l'exclusion du pouce." },
  { label: 'Montre', text: 'Mesurez la circonférence de votre poignet avec un mètre ruban souple.' },
]

function Th({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`py-3 px-4 font-semibold text-foreground text-left ${center ? '' : ''}`}>{children}</th>
  )
}

export default function GuideTaillesPage() {
  usePageMeta("Guide des tailles — MignonciteShop", "Consultez notre guide des tailles : vêtements, chaussures et accessoires. Trouvez la taille idéale avant de commander sur MignonciteShop.")
  return (
    <div className="min-h-screen bg-background">
      <SectionHero
        icon={Ruler}
        title="Guide des tailles"
        subtitle="Trouvez la taille qui vous convient parfaitement grâce à nos guides détaillés."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Comment se mesurer */}
        <div className="bg-card rounded-2xl p-8 shadow-sm mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Shirt className="w-6 h-6 text-[#C9A961]" />
            Comment se mesurer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MEASURE_TIPS.map((tip) => (
              <div key={tip.title}>
                <h3 className="font-semibold text-foreground mb-2">{tip.title}</h3>
                <p className="text-muted-foreground text-sm">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vêtements */}
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm mb-10 overflow-x-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Shirt className="w-6 h-6 text-[#C9A961]" />
            Vêtements
          </h2>
          <table className="w-full min-w-[520px]">
            <thead className="border-b-2 border-border">
              <tr>
                <Th>Taille</Th>
                <Th>Tour de poitrine (cm)</Th>
                <Th>Tour de taille (cm)</Th>
                <Th>Tour de hanches (cm)</Th>
              </tr>
            </thead>
            <tbody>
              {CLOTHING_ROWS.map((row, i) => (
                <tr key={row[0]} className={`border-b ${i % 2 === 0 ? 'bg-muted/50' : ''}`}>
                  {row.map((cell, j) => (
                    <td key={j} className={`py-3 px-4 text-sm ${j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chaussures */}
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm mb-10 overflow-x-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Footprints className="w-6 h-6 text-[#C9A961]" />
            Chaussures
          </h2>
          <table className="w-full min-w-[480px]">
            <thead className="border-b-2 border-border">
              <tr>
                <Th>EU</Th>
                <Th>US</Th>
                <Th>UK</Th>
                <Th>Longueur du pied (cm)</Th>
              </tr>
            </thead>
            <tbody>
              {SHOES_ROWS.map((row, i) => (
                <tr key={row[0]} className={`border-b ${i % 2 === 0 ? 'bg-muted/50' : ''}`}>
                  {row.map((cell, j) => (
                    <td key={j} className={`py-3 px-4 text-sm ${j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Accessoires */}
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Watch className="w-6 h-6 text-[#C9A961]" />
            Accessoires
          </h2>
          <div className="space-y-4">
            {ACCESSORY_TIPS.map((tip) => (
              <div key={tip.label} className="flex gap-4 p-4 bg-muted/50 rounded-xl">
                <span className="font-semibold text-foreground min-w-[100px]">{tip.label}</span>
                <span className="text-muted-foreground text-sm flex-1">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conseil */}
        <div className="bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-2xl p-6">
          <p className="text-foreground text-sm leading-relaxed">
            <strong>Conseil :</strong> Si vous hésitez entre deux tailles, nous vous recommandons de choisir la
            taille supérieure pour plus de confort. Chaque produit peut avoir une coupe spécifique ; consultez les
            recommandations présentes sur la fiche produit.
          </p>
        </div>
      </div>
    </div>
  )
}

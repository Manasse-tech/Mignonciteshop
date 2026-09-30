'use client'

import type { LucideIcon } from 'lucide-react'

interface SectionHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
  icon?: LucideIcon
  py?: 'py-20' | 'py-24' | 'py-16'
}

export default function SectionHero({ eyebrow, title, subtitle, icon: Icon, py = 'py-20' }: SectionHeroProps) {
  return (
    <section className={`bg-black text-white ${py}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {Icon && <Icon className="w-12 h-12 text-[#C9A961] mx-auto mb-4" />}
        {eyebrow && (
          <p className="text-[#C9A961] text-sm font-semibold tracking-widest uppercase">{eyebrow}</p>
        )}
        <h1 className={`text-4xl md:text-5xl font-bold ${eyebrow ? 'mt-4' : ''}`}>{title}</h1>
        {subtitle && <p className="text-gray-400 mt-4 max-w-xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  )
}

'use client'

import { useMemo } from 'react'
import { Eye, Flame } from 'lucide-react'

/**
 * Preuve sociale dynamique sur la fiche produit : nombre de visiteurs en
 * cours + ventes sur 7 jours. Les valeurs sont déterministes (hash de
 * l'id produit + date du jour) pour rester stables entre rendus et éviter
 * tout flash ou mismatch — tout en semblant « vivantes » au fil des jours.
 */
export default function SocialProof({ productId, stock }: { productId: string; stock: number }) {
  const { viewers, soldWeek } = useMemo(() => {
    const seed = Array.from(productId).reduce((acc, c) => acc + c.charCodeAt(0) * 7, 0)
    const day = Math.floor(Date.now() / 86_400_000)
    const h1 = (seed * 31 + day) % 97
    const h2 = (seed * 17 + day * 13) % 89
    return {
      viewers: 4 + (h1 % 18), // 4–21 personnes
      soldWeek: 6 + (h2 % 34), // 6–39 ventes
    }
  }, [productId])

  const urgency = stock > 0 && stock < 12

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-5" aria-live="polite">
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex w-2 h-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
        </span>
        <Eye className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-foreground">{viewers}</strong>{' '}
          {viewers > 1 ? 'personnes regardent' : 'personne regarde'} ce produit en ce moment
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Flame className="w-3.5 h-3.5 text-[#C9A961]" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-foreground">{soldWeek}</strong> vendu(s) ces 7 derniers jours
        </span>
      </span>
      {urgency && (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500">
          Stock limité — vite !
        </span>
      )}
    </div>
  )
}

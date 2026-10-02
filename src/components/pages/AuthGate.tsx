'use client'

import { Lock } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'

/**
 * Mur de connexion (comportement original Base44 restauré) : le panier, le
 * checkout, les commandes et la fidélité exigent un compte. Affiché à la place
 * du contenu tant que l'utilisateur n'est pas connecté.
 */
export default function AuthGate({
  title,
  message,
  returnTo,
}: {
  title: string
  message: string
  returnTo?: string
}) {
  const navigate = useShopStore((s) => s.navigate)

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C9A961]/15 mb-6">
          <Lock className="w-8 h-8 text-[#C9A961]" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-muted-foreground mb-8">{message}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('login', returnTo ? { returnTo } : {})}
            className="w-full sm:w-auto h-12 px-8 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white font-semibold transition-colors"
          >
            Se connecter
          </button>
          <button
            onClick={() => navigate('login', { ...(returnTo ? { returnTo } : {}), mode: 'register' })}
            className="w-full sm:w-auto h-12 px-8 rounded-full border border-[#C9A961] text-[#C9A961] hover:bg-[#C9A961]/10 font-semibold transition-colors"
          >
            Créer un compte
          </button>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-6">
          Connexion gratuite — vos données sont protégées (RGPD)
        </p>
      </div>
    </div>
  )
}

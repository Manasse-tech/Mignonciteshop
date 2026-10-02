'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useShopStore } from '@/store/useShopStore'

/**
 * Détails de scroll : barre de progression dorée en haut de page
 * + bouton flottant "retour en haut" apparaissant après 600px de défilement.
 */
export default function ScrollExtras() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const compare = useShopStore((s) => s.compare)

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const p = scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0
      setProgress(p)
      setVisible(window.scrollY > 600)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* Barre de progression (sous le header fixe) */}
      <div className="fixed top-0 inset-x-0 h-[3px] z-[60] pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#C9A961] to-[#E8D5A3] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Bouton retour en haut */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Retour en haut de page"
        className={`fixed right-4 sm:right-6 z-40 w-11 h-11 rounded-full bg-black text-[#C9A961] shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-[#C9A961] hover:text-white active:scale-90 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ bottom: compare.length > 0 ? '7.5rem' : '1.5rem' }}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  )
}

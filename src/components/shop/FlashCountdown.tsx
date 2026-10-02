'use client'

import { useEffect, useMemo, useState } from 'react'
import { Zap } from 'lucide-react'

interface TimeLeft {
  hours: string
  minutes: string
  seconds: string
}

/**
 * Compte à rebours « Ventes Flash » : les offres se terminent ce soir à minuit.
 * Déterministe côté client (cible = prochaine minuit locale), rendu hydraté en
 * deux temps pour éviter tout mismatch serveur/client.
 */
export default function FlashCountdown({ className = '' }: { className?: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    const compute = (): TimeLeft => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      let diff = Math.max(0, midnight.getTime() - now.getTime())
      const hours = Math.floor(diff / 3_600_000)
      diff -= hours * 3_600_000
      const minutes = Math.floor(diff / 60_000)
      diff -= minutes * 60_000
      const seconds = Math.floor(diff / 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      return { hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) }
    }

    // Premier rendu différé (macro-task → conforme règle set-state-in-effect)
    const first = setTimeout(() => setTimeLeft(compute()), 0)
    const timer = setInterval(() => setTimeLeft(compute()), 1000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])

  const cells = useMemo(
    () => [
      { value: timeLeft?.hours ?? '--', label: 'Heures' },
      { value: timeLeft?.minutes ?? '--', label: 'Min' },
      { value: timeLeft?.seconds ?? '--', label: 'Sec' },
    ],
    [timeLeft],
  )

  return (
    <div
      className={`inline-flex items-center gap-3 bg-white/5 border border-[#C9A961]/30 rounded-2xl px-4 py-3 backdrop-blur-sm ${className}`}
      role="timer"
      aria-label="Les offres se terminent ce soir à minuit"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#C9A961] sm:text-xs">
        <Zap className="w-3.5 h-3.5 fill-[#C9A961]" />
        <span className="hidden sm:inline">Fin des offres</span>
        <span className="sm:hidden">Fin</span>
      </span>
      <div className="flex items-center gap-1.5">
        {cells.map((c, i) => (
          <span key={c.label} className="flex items-center gap-1.5">
            <span className="flex flex-col items-center">
              <span className="countdown-digit inline-flex min-w-[2.6rem] justify-center bg-black text-[#C9A961] font-bold text-lg rounded-lg px-1.5 py-1 tabular-nums shadow-[0_0_12px_rgba(201,169,97,0.25)] sm:text-xl">
                {c.value}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-gray-400 mt-1">{c.label}</span>
            </span>
            {i < cells.length - 1 && (
              <span className="text-[#C9A961] font-bold text-lg -mt-4" aria-hidden="true">
                :
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

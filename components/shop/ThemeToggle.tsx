'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

const emptySubscribe = () => () => {}

export function useMounted() {
  // Hydration-safe : false côté serveur/hydratation, true une fois monté côté client
  // (pattern useSyncExternalStore — évite le setState dans un effet, interdit par lint)
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`p-2 hover:bg-muted rounded-full transition-colors ${className}`}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      {mounted ? (
        isDark ? (
          <Sun className="w-5 h-5 text-[#C9A961]" />
        ) : (
          <Moon className="w-5 h-5 text-foreground/70" />
        )
      ) : (
        <Moon className="w-5 h-5 opacity-0" />
      )}
    </button>
  )
}

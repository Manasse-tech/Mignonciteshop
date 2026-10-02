'use client'

import { useSyncExternalStore } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getBrowserNotifyPermission,
  isBrowserNotifyEnabled,
  isBrowserNotifySupported,
  requestBrowserNotifyPermission,
  setBrowserNotifyEnabled,
} from '@/lib/browserNotify'

const emptySubscribe = () => () => {}

/**
 * Bouton toggle "Notifications navigateur" pour la sidebar admin.
 * Active les notifications système (Notification API) : l'admin est prévenu
 * des nouvelles commandes/messages/avis même quand l'onglet est en arrière-plan.
 */
export default function NotifToggle({ className = '' }: { className?: string }) {
  const { toast } = useToast()
  // Hydration-safe : état lu uniquement côté client une fois monté
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const supported = mounted && isBrowserNotifySupported()
  const enabled = mounted && isBrowserNotifyEnabled()

  const handleToggle = async () => {
    if (!isBrowserNotifySupported()) {
      toast({
        title: 'Notifications non disponibles',
        description: "Votre navigateur ne prend pas en charge les notifications système.",
      })
      return
    }
    if (enabled) {
      setBrowserNotifyEnabled(false)
      toast({ title: 'Notifications navigateur désactivées', description: 'Vous ne recevrez plus d’alertes système de l’administration.' })
      // Force le re-render via un événement storage-like : on rerendre via setState local
      window.dispatchEvent(new Event('mcs-notif-change'))
      return
    }
    let permission = getBrowserNotifyPermission()
    if (permission === 'default') {
      permission = await requestBrowserNotifyPermission()
    }
    if (permission === 'granted') {
      setBrowserNotifyEnabled(true)
      toast({
        title: 'Notifications navigateur activées',
        description: 'Vous serez alerté même lorsque cet onglet est en arrière-plan.',
      })
      try {
        new Notification('MignonciteShop — Notifications activées', {
          body: 'Vous recevrez les nouvelles commandes, messages et avis en temps réel.',
          icon: '/icons/icon-192.png',
          lang: 'fr',
        })
      } catch {}
    } else {
      toast({
        title: 'Permission refusée',
        description: 'Autorisez les notifications pour ce site dans les réglages de votre navigateur.',
        variant: 'destructive',
      })
    }
    window.dispatchEvent(new Event('mcs-notif-change'))
  }

  // Re-render sur changement externe (autre instance du bouton)
  const subscribe = (cb: () => void) => {
    window.addEventListener('mcs-notif-change', cb)
    return () => window.removeEventListener('mcs-notif-change', cb)
  }
  useSyncExternalStore(
    subscribe,
    () => (mounted ? String(isBrowserNotifyEnabled()) : 'x'),
    () => 'x',
  )

  const label = !supported
    ? 'Notifications navigateur non prises en charge'
    : enabled
      ? 'Notifications navigateur activées — cliquer pour désactiver'
      : 'Activer les notifications navigateur'

  return (
    <button
      onClick={handleToggle}
      className={`p-2 hover:bg-gray-800 rounded-full transition-colors relative ${className}`}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
    >
      {!supported ? (
        <BellOff className="w-5 h-5 text-gray-600" />
      ) : enabled ? (
        <>
          <BellRing className="w-5 h-5 text-[#C9A961]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </>
      ) : (
        <Bell className="w-5 h-5 text-gray-400" />
      )}
    </button>
  )
}

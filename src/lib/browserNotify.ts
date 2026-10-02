'use client'

/**
 * Notifications navigateur (Notification API) pour l'espace administrateur.
 * Complète les toasts temps réel : permet d'être prévenu même lorsque
 * l'onglet admin est en arrière-plan ou minimisé.
 */

export type NotifPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export function isBrowserNotifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getBrowserNotifyPermission(): NotifPermissionState {
  if (!isBrowserNotifySupported()) return 'unsupported'
  return Notification.permission as NotifPermissionState
}

/** Demande la permission ; résout vers l'état obtenu. */
export async function requestBrowserNotifyPermission(): Promise<NotifPermissionState> {
  if (!isBrowserNotifySupported()) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result as NotifPermissionState
  } catch {
    return 'denied'
  }
}

const STORAGE_KEY = 'mcs-admin-browser-notifications'

export function isBrowserNotifyEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1' && getBrowserNotifyPermission() === 'granted'
  } catch {
    return false
  }
}

export function setBrowserNotifyEnabled(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, '1')
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

/**
 * Affiche une notification système si l'utilisateur l'a activée.
 * Silencieux en cas d'échec (permission retirée, API absente…).
 */
export function showBrowserNotification(title: string, body: string, tag?: string) {
  if (!isBrowserNotifyEnabled() || !isBrowserNotifySupported()) return
  try {
    const notif = new Notification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'fr',
    })
    // Clic => ramène l'onglet admin au premier plan
    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch {}
}

'use client'

import { io } from 'socket.io-client'

/**
 * Événements métier poussés en temps réel vers l'admin via le mini-service
 * notify-service (port 3003, joint à travers la gateway via XTransformPort).
 */
export type AdminRealtimeEvent =
  | { type: 'order'; orderNumber: string; total: number; customerName: string }
  | { type: 'message'; name: string; subject: string }
  | { type: 'review'; product: string; rating: number; author: string }
  | { type: 'question'; product: string; author: string }

/**
 * Connecte le client admin au mini-service de notifications temps réel.
 * Retourne une fonction de nettoyage (à appeler dans le cleanup de useEffect).
 */
export function connectAdminRealtime(
  onEvent: (e: AdminRealtimeEvent) => void,
  onStatus?: (connected: boolean) => void,
): () => void {
  const socket = io('/?XTransformPort=3003', {
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000,
  })

  socket.on('connect', () => onStatus?.(true))
  socket.on('disconnect', () => onStatus?.(false))
  socket.on('connect_error', () => onStatus?.(false))
  socket.on('admin:event', (e: AdminRealtimeEvent) => {
    if (e && e.type) onEvent(e)
  })

  return () => socket.disconnect()
}

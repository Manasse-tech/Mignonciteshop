'use client'

import { useShopStore, type CartItem } from '@/store/useShopStore'
import { useAdminAuthStore } from '@/store/useAdminAuthStore'

/**
 * Synchronisation du panier avec la collection Cart côté serveur (5ᵉ collection
 * de l'original Base44). Quand aucun compte n'est connecté, le panier reste
 * local (localStorage persist) — comportement invité. Dès qu'une session existe,
 * le serveur fait foi : le panier local est fusionné puis chaque mutation est
 * répliquée (fire-and-forget : une erreur réseau ne bloque jamais l'UI).
 */

export const isAuthed = () => useAdminAuthStore.getState().status === 'authed'

export async function serverAdd(productId: string, quantity: number, size?: string | null, color?: string | null) {
  await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity, size: size ?? null, color: color ?? null }),
  })
}

export async function serverSet(productId: string, quantity: number, size?: string | null, color?: string | null) {
  await fetch('/api/cart', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity, size: size ?? null, color: color ?? null }),
  })
}

export async function serverRemove(productId: string, size?: string | null, color?: string | null) {
  const params = new URLSearchParams({ productId, size: size ?? '', color: color ?? '' })
  await fetch(`/api/cart?${params.toString()}`, { method: 'DELETE' })
}

export async function serverClear() {
  await fetch('/api/cart', { method: 'DELETE' })
}

/** Remplace le panier local par l'état serveur (prix relus de la base). */
export async function pullServerCart(): Promise<void> {
  try {
    const res = await fetch('/api/cart', { cache: 'no-store' })
    if (!res.ok) return
    const items = (await res.json()) as CartItem[]
    if (Array.isArray(items)) useShopStore.setState({ cart: items })
  } catch {
    // Hors ligne : on garde le panier local
  }
}

/**
 * Fusionne le panier invité local dans le panier serveur (upsert par variant,
 * quantités additionnées côté serveur), puis remplace le local par l'état serveur.
 * Appelé à la connexion et au boot quand une session existe déjà.
 */
export async function mergeLocalCartIntoServer(): Promise<void> {
  const local = useShopStore.getState().cart
  for (const item of local) {
    try {
      await serverAdd(item.productId, item.quantity, item.size, item.color)
    } catch {
      // Stock insuffisant ou réseau : on continue avec les lignes suivantes
    }
  }
  await pullServerCart()
}

/** À monter une fois dans AppShell : session de boot + fusion du panier. */
export async function bootstrapCartSync(): Promise<void> {
  const { fetchSession } = useAdminAuthStore.getState()
  await fetchSession()
  if (useAdminAuthStore.getState().status === 'authed') {
    await mergeLocalCartIntoServer()
  }
}

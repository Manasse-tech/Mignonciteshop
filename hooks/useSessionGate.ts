'use client'

import { useEffect } from 'react'
import { useAdminAuthStore } from '@/store/useAdminAuthStore'

/**
 * Gate de session pour les pages protégées (panier, checkout, commandes,
 * fidélité — auth obligatoire de l'original Base44). Appeler AVANT tout retour
 * anticipé : le hook respecte l'ordre d'appel inconditionnel des hooks React.
 * Retourne le statut : 'loading' (skeleton) | 'anon' (mur de connexion) | 'authed'.
 */
export function useSessionGate() {
  const { status, fetchSession } = useAdminAuthStore()
  useEffect(() => {
    if (status === 'loading') fetchSession()
  }, [status, fetchSession])
  return status
}

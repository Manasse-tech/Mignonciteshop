'use client'

import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'

export const DEFAULT_TITLE = 'MignonciteShop — Boutique en ligne de produits de qualité'
export const DEFAULT_DESCRIPTION =
  'MignonciteShop, votre boutique en ligne premium. Découvrez une sélection de produits de qualité, livraison rapide et paiement sécurisé.'

interface MetaState {
  title: string
  description: string
}

// ===== Mini-store de métadonnées (SPA) =====
// Le <title> est rendu par React via <TitleBroker /> : c'est l'unique façon fiable
// de contrôler le titre dans un App Router (Next.js re-committe sinon le <title>
// issu de metadata après hydratation). Les pages déclarent leur titre/description
// via usePageMeta(), le broker souscrit au store et met à jour le DOM.

let metaState: MetaState = { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }
const listeners = new Set<() => void>()

function setMeta(title: string, description?: string) {
  const desc = description === undefined ? DEFAULT_DESCRIPTION : description
  if (metaState.title === title && metaState.description === desc) return
  metaState = { title: title || DEFAULT_TITLE, description: desc }
  listeners.forEach((l) => l())
}

function subscribeMeta(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getMetaSnapshot(): MetaState {
  return metaState
}

const SERVER_META_STATE: MetaState = { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }

function getServerMetaSnapshot(): MetaState {
  return SERVER_META_STATE
}

/** Met à jour dynamiquement le titre + la description de la page courante (SPA). */
export default function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    setMeta(title, description)
  }, [title, description])
}

/** Rendu du <title> + de la meta description. À monter une seule fois (layout). */
export function TitleBroker() {
  const meta = useSyncExternalStore(subscribeMeta, getMetaSnapshot, getServerMetaSnapshot)

  // La meta description est modifiée par effet (React ne gère pas ce nœud).
  // Même approche pour les balises OpenGraph dynamiques (partage réseaux sociaux).
  useEffect(() => {
    let el = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', 'description')
      document.head.appendChild(el)
    }
    if (el.getAttribute('content') !== meta.description) {
      el.setAttribute('content', meta.description)
    }

    // OpenGraph dynamique (og:title / og:description / og:url)
    const upsert = (attr: string, key: string, content: string) => {
      let og = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      if (!og) {
        og = document.createElement('meta')
        og.setAttribute(attr, key)
        document.head.appendChild(og)
      }
      if (og.getAttribute('content') !== content) {
        og.setAttribute('content', content)
      }
    }
    upsert('property', 'og:title', meta.title)
    upsert('property', 'og:description', meta.description)
    upsert('property', 'og:url', typeof window !== 'undefined' ? window.location.href : '')
    upsert('property', 'og:type', 'website')
    upsert('property', 'og:site_name', 'MignonciteShop')

    // Lien canonical dynamique (SPA) : évite le contenu dupliqué aux yeux de
    // Google quand la même page est servie avec des paramètres variant.
    if (typeof window !== 'undefined') {
      const canonicalUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      if (link.getAttribute('href') !== canonicalUrl) {
        link.setAttribute('href', canonicalUrl)
      }
    }
  }, [meta.description, meta.title])

  return <title>{meta.title}</title>
}

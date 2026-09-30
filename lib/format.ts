export function formatPrice(value: number): string {
  const [int, dec] = value.toFixed(2).split('.')
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${intFmt}.${dec} €`
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const dateHourFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const shortDateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDate(value: string | Date): string {
  return dateFmt.format(new Date(value))
}

export function formatDateHour(value: string | Date): string {
  const d = new Date(value)
  return `${dateFmt.format(d)} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

export function formatShortDate(value: string | Date): string {
  return shortDateFmt.format(new Date(value))
}

export function generateOrderNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `MCS-${suffix}`
}

export function discountPercent(price: number, oldPrice?: number | null): number | null {
  if (!oldPrice || oldPrice <= price) return null
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}

/** Nettoie un item résiduel d'un double encodage : '["S"' → 'S' */
function cleanArrayItem(s: string): string {
  return s.replace(/^[\s["']+/, '').replace(/[\s\]"']+$/, '').trim()
}

/**
 * Parse défensif d'un champ JSON de type liste (sizes, colors, gallery…).
 * Tolère : un vrai tableau JSON, un tableau double-encodé (issue historique du
 * formulaire admin), une string simple "S,M,L" ou une valeur vide.
 */
export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  let current: unknown = value
  // Max 2 décodages : un triple encodage ne doit jamais arriver
  for (let i = 0; i < 2; i++) {
    if (typeof current !== 'string') break
    const trimmed = current.trim()
    if (!trimmed) return []
    try {
      current = JSON.parse(trimmed)
    } catch {
      break
    }
  }
  if (Array.isArray(current)) {
    return current
      .filter((v): v is string => typeof v === 'string')
      .map(cleanArrayItem)
      .filter(Boolean)
  }
  if (typeof current === 'string' && current.trim()) {
    return current.split(',').map(cleanArrayItem).filter(Boolean)
  }
  return []
}

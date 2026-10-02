'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, Search, RefreshCw, Loader2, Eye, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDateHour } from '@/lib/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface EmailLogRow {
  id: string
  to: string
  subject: string
  template: string
  status: string // sent | outbox | failed | pending
  provider: string
  error?: string | null
  orderId?: string | null
  createdAt: string
  sentAt?: string | null
}

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  outbox: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  pending: 'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Envoyé',
  outbox: 'Boîte d’attente',
  failed: 'Échec',
  pending: 'En cours',
}

const TEMPLATE_LABEL: Record<string, string> = {
  'order-confirmation': 'Confirmation commande',
  'password-reset': 'Réinitialisation mdp',
}

export default function EmailsAdmin() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<EmailLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<{ id: string; html: string; subject: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/emails')
      if (res.ok) setLogs(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(
      (l) => l.to.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q) || l.template.includes(q),
    )
  }, [logs, search])

  const openPreview = async (id: string, subject: string) => {
    setPreviewLoading(true)
    setPreview({ id, html: '', subject })
    try {
      const res = await fetch(`/api/admin/emails?id=${id}`)
      if (res.ok) {
        const full = await res.json()
        setPreview({ id, html: full.html ?? '', subject })
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  const retry = async (row: EmailLogRow) => {
    setRetrying(row.id)
    try {
      const res = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Email traité', description: data.status === 'sent' ? 'Renvoyé avec succès.' : 'Re-consigné dans la boîte d’attente.' })
        await load()
      } else {
        toast({ title: 'Échec', description: data.error || 'Ré-expédition impossible', variant: 'destructive' })
      }
    } finally {
      setRetrying(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Emails transactionnels</h1>
      <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>Journal des emails envoyés aux clients (confirmations, réinitialisations)</span>
      </p>

      {/* Mode d'envoi courant — transparence pour l'administrateur */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3.5 text-sm max-w-2xl">
        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>Mode boîte d’attente</strong> — aucune clé RESEND_API_KEY n’est configurée : les emails
          sont rendus et journalisés ici au lieu d’être expédiés. Ajoutez la clé dans les variables
          d’environnement pour activer l’envoi réel via Resend.
        </p>
      </div>

      <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (destinataire, sujet)…"
              className="h-9 pl-9 pr-4 rounded-md border border-border text-sm w-full focus:outline-none focus:border-[#C9A961]"
              aria-label="Rechercher un email"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="h-9 self-start sm:self-auto" aria-label="Rafraîchir la liste">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Actualiser
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Mail className="w-10 h-10 mb-3 opacity-40" aria-hidden="true" />
            <p className="font-medium">Aucun email pour le moment</p>
            <p className="text-sm mt-1">Les confirmations de commande apparaîtront ici automatiquement.</p>
          </div>
        ) : (
          <div className="max-h-[540px] overflow-y-auto -mx-1 px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2.5 pr-3 font-semibold">Date</th>
                  <th className="py-2.5 pr-3 font-semibold">Destinataire</th>
                  <th className="py-2.5 pr-3 font-semibold hidden md:table-cell">Sujet</th>
                  <th className="py-2.5 pr-3 font-semibold hidden lg:table-cell">Type</th>
                  <th className="py-2.5 pr-3 font-semibold">Statut</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-3 whitespace-nowrap text-muted-foreground text-xs">{formatDateHour(l.createdAt)}</td>
                    <td className="py-3 pr-3 max-w-[140px] sm:max-w-[200px] truncate" title={l.to}>{l.to}</td>
                    <td className="py-3 pr-3 hidden md:table-cell max-w-[220px] truncate" title={l.subject}>{l.subject}</td>
                    <td className="py-3 pr-3 hidden lg:table-cell whitespace-nowrap text-muted-foreground">{TEMPLATE_LABEL[l.template] ?? l.template}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[l.status] ?? STATUS_STYLE.pending}`}>
                        {STATUS_LABEL[l.status] ?? l.status}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openPreview(l.id, l.subject)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors"
                        aria-label={`Aperçu de l'email à ${l.to}`}
                        title="Aperçu"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {(l.status === 'outbox' || l.status === 'failed') && (
                        <button
                          onClick={() => retry(l)}
                          disabled={retrying === l.id}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                          aria-label={`Renvoyer l'email à ${l.to}`}
                          title="Renvoyer"
                        >
                          {retrying === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aperçu du rendu HTML de l'email (iframe sandbox, scripts désactivés) */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3">
            <DialogTitle className="text-base pr-6">{preview?.subject}</DialogTitle>
            <DialogDescription>Aperçu du rendu tel que reçu par le client.</DialogDescription>
          </DialogHeader>
          <div className="h-[60vh] bg-white border-t border-border">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement de l’aperçu…
              </div>
            ) : (
              <iframe
                title={`Aperçu email — ${preview?.subject ?? ''}`}
                srcDoc={preview?.html ?? ''}
                sandbox=""
                className="w-full h-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, MailOpen, Trash2, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDateHour } from '@/lib/format'
import type { ContactMessage } from '@/lib/types'

export default function MessagesAdmin() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contact')
      setMessages(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return messages
    const q = search.toLowerCase()
    return messages.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.message.toLowerCase().includes(q),
    )
  }, [messages, search])

  const unread = messages.filter((m) => !m.isRead).length

  const markRead = async (m: ContactMessage) => {
    if (m.isRead) return
    const res = await fetch(`/api/messages/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    })
    if (res.ok) await load()
  }

  const remove = async (m: ContactMessage) => {
    if (!confirm('Supprimer ce message ?')) return
    const res = await fetch(`/api/messages/${m.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Message supprimé' })
      await load()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Messages</h1>
      <p className="text-muted-foreground mt-1">
        Messages reçus via le formulaire de contact{unread > 0 ? ` · ${unread} non lu(s)` : ''}
      </p>

      <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un message…"
            className="h-9 pl-9 pr-4 rounded-md border border-border text-sm w-full focus:outline-none focus:border-[#C9A961]"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Aucun message.</div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((m) => (
              <div
                key={m.id}
                className={`border rounded-2xl p-5 transition-colors ${
                  m.isRead ? 'border-border/60' : 'border-[#C9A961]/40 bg-[#C9A961]/5'
                }`}
                onClick={() => markRead(m)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    {m.isRead ? (
                      <MailOpen className="w-5 h-5 text-muted-foreground/80" />
                    ) : (
                      <Mail className="w-5 h-5 text-[#C9A961]" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {m.name}
                        {!m.isRead && (
                          <span className="ml-2 bg-[#C9A961] text-white text-[10px] font-bold rounded-full px-2 py-0.5 align-middle">
                            Nouveau
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {m.email} · {formatDateHour(m.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(m) }}
                    className="p-2 text-muted-foreground/80 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {m.subject && <p className="text-sm font-medium text-foreground mb-1">{m.subject}</p>}
                <p className="text-sm text-muted-foreground leading-relaxed">{m.message}</p>
                <a
                  href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || 'Votre message')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex mt-3 text-xs font-medium text-[#C9A961] hover:underline"
                >
                  Répondre par email →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

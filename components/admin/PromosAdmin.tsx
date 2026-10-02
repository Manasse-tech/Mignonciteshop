'use client'

import { useEffect, useState } from 'react'
import { Ticket, Plus, Trash2, Power, Loader2, Percent, Euro, Truck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatPrice } from '@/lib/format'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { PromoCode } from '@/lib/types'

const TYPE_LABELS: Record<string, { label: string; badge: string; icon: typeof Percent }> = {
  percent: { label: 'Pourcentage', badge: 'bg-[#C9A961]/10 text-[#C9A961]', icon: Percent },
  fixed: { label: 'Montant fixe', badge: 'bg-green-100 text-green-700', icon: Euro },
  shipping: { label: 'Livraison offerte', badge: 'bg-blue-100 text-blue-700', icon: Truck },
}

export default function PromosAdmin() {
  const { toast } = useToast()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code: '', type: 'percent', value: '10', label: '' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/promo-codes')
      if (res.ok) setPromos(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeCount = promos.filter((p) => p.active).length
  const totalUses = promos.reduce((s, p) => s + p.usageCount, 0)

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value: Number(form.value) }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: 'Code promo créé', description: `${data.code} · ${data.label}` })
        setDialogOpen(false)
        setForm({ code: '', type: 'percent', value: '10', label: '' })
        await load()
      } else {
        toast({ title: 'Erreur', description: data.error || 'Création impossible', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (promo: PromoCode) => {
    const res = await fetch(`/api/promo-codes/${promo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !promo.active }),
    })
    if (res.ok) {
      toast({ title: promo.active ? 'Code désactivé' : 'Code activé', description: promo.code })
      await load()
    }
  }

  const remove = async (promo: PromoCode) => {
    if (!confirm(`Supprimer le code ${promo.code} définitivement ?`)) return
    const res = await fetch(`/api/promo-codes/${promo.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Code supprimé', description: promo.code })
      await load()
    }
  }

  const formatValue = (p: PromoCode) => {
    if (p.type === 'percent') return `-${p.value}%`
    if (p.type === 'fixed') return `-${p.value % 1 === 0 ? p.value : formatPrice(p.value)} €`
    return 'Port offert'
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Codes promo</h1>
          <p className="text-muted-foreground mt-1">Créez et gérez vos codes de réduction</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 bg-[#C9A961] text-black px-5 h-11 rounded-full text-sm font-semibold hover:bg-[#b8994f] hover:text-black transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Nouveau code
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Codes créés</p>
          <p className="text-2xl font-bold text-foreground mt-1">{promos.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Codes actifs</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Utilisations cumulées</p>
          <p className="text-2xl font-bold text-[#C9A961] mt-1">{totalUses}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-12 h-12 text-muted-foreground/80 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun code promo. Créez votre premier code !</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground/80 border-b">
                  <th className="pb-3 pr-4 font-medium">Code</th>
                  <th className="pb-3 pr-4 font-medium">Avantage</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Utilisations</th>
                  <th className="pb-3 pr-4 font-medium">Créé le</th>
                  <th className="pb-3 pr-4 font-medium">Statut</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => {
                  const meta = TYPE_LABELS[p.type] ?? TYPE_LABELS.percent
                  const Icon = meta.icon
                  return (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center gap-2 font-mono font-bold text-foreground bg-muted/50 border border-border rounded-lg px-3 py-1.5">
                          <Icon className="w-3.5 h-3.5 text-[#C9A961]" /> {p.code}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-xs font-bold rounded-md px-2 py-1 ${meta.badge}`}>{formatValue(p)}</span>
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">{meta.label}</td>
                      <td className="py-4 pr-4 text-muted-foreground">{p.usageCount}×</td>
                      <td className="py-4 pr-4 text-muted-foreground text-xs">{formatDate(p.createdAt)}</td>
                      <td className="py-4 pr-4">
                        <span className={`text-xs font-semibold rounded-md px-2 py-1 ${p.active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
                          {p.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => toggleActive(p)}
                            className={`h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors ${
                              p.active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-muted text-muted-foreground/80 hover:bg-accent'
                            }`}
                            title={p.active ? 'Désactiver' : 'Activer'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => remove(p)}
                            className="h-8 w-8 rounded-md bg-muted/50 text-muted-foreground/80 inline-flex items-center justify-center hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog création */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau code promo</DialogTitle>
            <DialogDescription>Le code sera immédiatement utilisable au panier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="ETE2026"
                className="w-full h-11 px-3 rounded-lg border border-border font-mono uppercase text-sm focus:outline-none focus:border-[#C9A961]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Type d&apos;avantage</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Pourcentage (-%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe (-€)</SelectItem>
                  <SelectItem value="shipping">Livraison offerte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type !== 'shipping' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Valeur {form.type === 'percent' ? '(%)' : '(€)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  max={form.type === 'percent' ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description *</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Ex : -20% pour l'été"
                className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="h-11 px-5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.code.trim() || !form.label.trim()}
                className="h-11 px-6 rounded-full bg-[#C9A961] text-white text-sm font-semibold hover:bg-[#b8994f] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Créer le code
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

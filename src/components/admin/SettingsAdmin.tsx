'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, MessageCircle, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function SettingsAdmin() {
  const { toast } = useToast()
  const [form, setForm] = useState({ storeName: 'MignonciteShop', whatsapp: '+2250700000000', welcome: 'Mode, beauté et accessoires sélectionnés avec soin.' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.ok ? r.json() : null).then((data) => {
      if (data) setForm(data)
    }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    toast(res.ok ? { title: 'Boutique mise à jour', description: 'Les informations sont enregistrées.' } : { title: 'Erreur', description: 'Impossible d’enregistrer.', variant: 'destructive' })
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" /> Chargement…</div>
  return <section className="max-w-2xl space-y-6">
    <div><h1 className="text-2xl font-bold text-foreground">Boutique & WhatsApp</h1><p className="mt-1 text-sm text-muted-foreground">Modifiez les informations visibles par vos clients sans toucher au code.</p></div>
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
      <label className="block text-sm font-medium">Nom de la boutique<input className="mt-2 h-11 w-full rounded-lg border bg-background px-3" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} /></label>
      <label className="block text-sm font-medium">Numéro WhatsApp<input className="mt-2 h-11 w-full rounded-lg border bg-background px-3" placeholder="+2250700000000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /><span className="mt-1 block text-xs text-muted-foreground">Format international, sans espaces ni caractères spéciaux.</span></label>
      <label className="block text-sm font-medium">Phrase d’accueil<textarea className="mt-2 min-h-24 w-full rounded-lg border bg-background px-3 py-2" value={form.welcome} onChange={(e) => setForm({ ...form, welcome: e.target.value })} /></label>
      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#C9A961] px-5 py-3 font-semibold text-black disabled:opacity-50"><Save className="size-4" />{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    </div>
    <div className="flex items-center gap-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 p-4 text-sm"><MessageCircle className="text-[#25D366]" />Le bouton WhatsApp permet aux clients de poser une question ou de commander directement.</div>
  </section>
}

'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useData } from '@/components/pages/AppShell'
import type { Category } from '@/lib/types'

export default function CategoriesAdmin() {
  const { toast } = useToast()
  const { refreshCategories } = useData()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '', image: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      setCategories(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Nom requis', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/categories/${editing.id}` : '/api/categories', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: editing ? 'Catégorie modifiée' : 'Catégorie créée', description: form.name })
        setDialogOpen(false)
        await load()
        await refreshCategories()
      } else {
        toast({ title: 'Erreur', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Category) => {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ? Les produits associés seront sans catégorie.`)) return
    const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Catégorie supprimée', description: c.name })
      await load()
      await refreshCategories()
    }
  }

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]'

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catégories</h1>
          <p className="text-muted-foreground mt-1">Organisez vos produits par catégorie</p>
        </div>
        <button
          onClick={() => {
            setEditing(null)
            setForm({ name: '', description: '', image: '' })
            setDialogOpen(true)
          }}
          className="h-9 px-4 rounded-md bg-[#C9A961] hover:bg-[#b8994f] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Ajouter une catégorie
        </button>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-foreground mb-6">Toutes les catégories ({categories.length})</h3>
        {loading ? (
          <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="border border-border/60 rounded-2xl overflow-hidden group">
                <div className="relative h-32 bg-muted">
                  { }
                  <img
                    src={c.image || '/images/products/photo-1445205170230-053b83016050.jpg'}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(c)
                        setForm({ name: c.name, description: c.description || '', image: c.image || '' })
                        setDialogOpen(true)
                      }}
                      className="p-2 bg-card/90 rounded-full text-muted-foreground hover:text-[#C9A961] transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-2 bg-card/90 rounded-full text-muted-foreground hover:text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-foreground">{c.name}</p>
                  {/* Slug (affichage original, style mono/gris) */}
                  <p className="font-mono text-xs text-muted-foreground mt-0.5 truncate">{c.slug}</p>
                  {/* Badge statut original */}
                  <span className="inline-flex items-center rounded-md bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold mt-1">
                    Active
                  </span>
                  <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{c.description || 'Aucune description'}</p>
                  <p className="inline-flex items-center gap-1.5 text-xs text-[#C9A961] font-medium mt-2">
                    <Package className="w-3.5 h-3.5" /> {c.productCount ?? 0} produits
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Modifiez le nom ou la description de la catégorie.' : 'Ajoutez une catégorie pour organiser vos produits.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nom *</label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <textarea rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Image</label>
              <select className={inputClass} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}>
                <option value="">Par défaut</option>
                {[
                  '/images/products/photo-1445205170230-053b83016050.jpg',
                  '/images/products/photo-1498049794561-7780e7231661.jpg',
                  '/images/products/photo-1616486338812-3dadae4b4ace.jpg',
                  '/images/products/photo-1571902943202-507ec2618e8f.jpg',
                  '/images/products/photo-1441986300917-64674bd600d8.jpg',
                  '/images/products/photo-1607082348824-0a96f2a4b9da.jpg',
                ].map((src) => (
                  <option key={src} value={src}>{src.replace('/images/products/', '')}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setDialogOpen(false)} className="px-5 py-2.5 rounded-full border text-sm font-medium text-muted-foreground">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

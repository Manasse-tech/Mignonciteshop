'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, Star, Images, ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatPrice, parseJsonArray } from '@/lib/format'
import type { Category, Product } from '@/lib/types'

const EMPTY_FORM = {
  name: '', description: '', details: '', price: '', oldPrice: '',
  image: '/images/products/photo-1445205170230-053b83016050.jpg', categoryId: '', stock: '10',
  isFeatured: false, isNew: false, isActive: true, sizes: '', colors: '',
  gallery: [] as string[],
  imageUrl: '',
}

// Banque d'images disponibles pour les produits (public/images/products)
const IMAGE_LIBRARY = [
  '/images/products/photo-1591047139829-d91aecb6caea.jpg',
  '/images/products/photo-1507473885765-e6ed057f782c.jpg',
  '/images/products/photo-1601925260368-ae2f83cf8b7f.jpg',
  '/images/products/photo-1505740420928-5e560c06d30e.jpg',
  '/images/products/photo-1523275335684-37898b6baf30.jpg',
  '/images/products/photo-1534438327276-14e5300c3a48.jpg',
  '/images/products/photo-1579656381226-5fc0f0100c3b.jpg',
  '/images/products/photo-1553062407-98eeb64c6a62.jpg',
  '/images/products/photo-1445205170230-053b83016050.jpg',
  '/images/products/photo-1498049794561-7780e7231661.jpg',
  '/images/products/photo-1616486338812-3dadae4b4ace.jpg',
  '/images/products/photo-1571902943202-507ec2618e8f.jpg',
  '/images/products/photo-1607082348824-0a96f2a4b9da.jpg',
  '/images/products/photo-1441986300917-64674bd600d8.jpg',
]

export default function ProductsAdmin() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        fetch('/api/products?includeInactive=true').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
      ])
      setProducts(Array.isArray(p) ? p : [])
      setCategories(Array.isArray(c) ? c : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? '', gallery: [EMPTY_FORM.image] })
    setDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      description: p.description || '',
      details: p.details || '',
      price: String(p.price),
      oldPrice: p.oldPrice ? String(p.oldPrice) : '',
      image: p.image,
      categoryId: p.categoryId || '',
      stock: String(p.stock),
      isFeatured: p.isFeatured,
      isNew: p.isNew,
      isActive: p.isActive,
      sizes: parseJsonArray(p.sizes).join(', '),
      colors: parseJsonArray(p.colors).join(', '),
      gallery: parseJsonArray(p.gallery).length > 0 ? parseJsonArray(p.gallery) : [p.image],
      imageUrl: '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      toast({ title: 'Champs requis', description: 'Le nom et le prix sont obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/products/${editing.id}` : '/api/products'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // La galerie contient toujours l'image principale en premier
          gallery: JSON.stringify(form.gallery.length > 0 ? form.gallery : [form.image]),
          sizes: JSON.stringify(form.sizes ? form.sizes.split(',').map((s) => s.trim()).filter(Boolean) : []),
          colors: JSON.stringify(form.colors ? form.colors.split(',').map((s) => s.trim()).filter(Boolean) : []),
        }),
      })
      if (res.ok) {
        toast({ title: editing ? 'Produit modifié' : 'Produit créé', description: form.name })
        setDialogOpen(false)
        await load()
      } else {
        toast({ title: 'Erreur', description: 'Enregistrement impossible', variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Supprimer définitivement « ${p.name} » ?`)) return
    const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Produit supprimé', description: p.name })
      await load()
    }
  }

  const toggleField = async (p: Product, field: 'isActive' | 'isFeatured' | 'isNew') => {
    const res = await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !p[field] }),
    })
    if (res.ok) await load()
  }

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]'

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Produits</h1>
      <p className="text-muted-foreground mt-1">Gérez votre catalogue de produits</p>

      <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-foreground">Catalogue ({filtered.length})</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit…"
                className="h-9 pl-9 pr-4 rounded-md border border-border text-sm w-full sm:w-64 focus:outline-none focus:border-[#C9A961]"
              />
            </div>
            <button
              onClick={openCreate}
              className="h-9 px-4 rounded-md bg-[#C9A961] hover:bg-[#b8994f] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter un produit
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Produit</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Prix</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Stock</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Statut</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          { }
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground/80">{p.category?.name || 'Sans catégorie'}</p>
                          <div className="flex gap-1.5 mt-1">
                            {p.isFeatured && (
                              <span className="inline-flex items-center gap-1 bg-[#C9A961]/10 text-[#C9A961] text-xs rounded-md px-1.5 py-0.5">
                                <Star className="w-3 h-3" /> Vedette
                              </span>
                            )}
                            {p.isNew && (
                              <span className="bg-muted text-muted-foreground text-xs rounded-md px-1.5 py-0.5">Nouveau</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="font-medium">{formatPrice(p.price)}</span>
                      {p.oldPrice && (
                        <span className="text-muted-foreground/80 line-through text-xs ml-2">{formatPrice(p.oldPrice)}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`font-medium ${p.stock <= 10 ? 'text-orange-500' : 'text-foreground'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => toggleField(p, 'isActive')}
                        className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          p.isActive ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                        }`}
                        title={p.isActive ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                      >
                        {p.isActive ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleField(p, 'isFeatured')}
                          className={`h-9 w-9 rounded-md inline-flex items-center justify-center transition-colors ${
                            p.isFeatured ? 'text-[#C9A961] bg-[#C9A961]/10' : 'text-muted-foreground/80 hover:bg-muted'
                          }`}
                          title="Vedette"
                        >
                          <Star className={`w-4 h-4 ${p.isFeatured ? 'fill-[#C9A961]' : ''}`} />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="h-9 w-9 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="h-9 w-9 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Mettez à jour les informations du produit puis enregistrez.' : 'Renseignez les informations du nouveau produit puis enregistrez.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nom *</label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
              <textarea rows={3} className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-[#C9A961]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Prix (€) *</label>
              <input type="number" step="0.01" className={inputClass} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Ancien prix (€)</label>
              <input type="number" step="0.01" className={inputClass} value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Stock</label>
              <input type="number" className={inputClass} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Catégorie</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="h-10 rounded-lg border-border">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Image principale</label>
              <div className="flex gap-3">
                <select
                  className={`${inputClass} flex-1`}
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                >
                  {IMAGE_LIBRARY.map((src) => (
                    <option key={src} value={src}>{src.replace('/images/products/', '')}</option>
                  ))}
                </select>
                <div className="w-16 h-16 rounded-lg overflow-hidden border shrink-0">
                  <img src={form.image} alt="Aperçu" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Gestionnaire de galerie multi-images */}
              <div className="mt-4 rounded-xl border border-border/60 p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                    <Images className="w-4 h-4 text-[#C9A961]" />
                    Galerie ({form.gallery.length} image{form.gallery.length > 1 ? 's' : ''})
                  </label>
                  <span className="text-xs text-muted-foreground/80">La 1<sup>re</sup> image est affichée en principal</span>
                </div>

                {form.gallery.length > 0 && (
                  <div className="flex gap-3 flex-wrap mb-3">
                    {form.gallery.map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className={`relative group w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          i === 0 ? 'border-[#C9A961]' : 'border-border'
                        }`}
                      >
                        <img src={src} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 bg-[#C9A961] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Principal
                          </span>
                        )}
                        {/* Déplacement gauche/droite */}
                        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            aria-label="Déplacer à gauche"
                            disabled={i === 0}
                            onClick={() => {
                              const g = [...form.gallery]
                              ;[g[i - 1], g[i]] = [g[i], g[i - 1]]
                              setForm({ ...form, gallery: g })
                            }}
                            className="p-0.5 rounded text-white disabled:opacity-30 hover:text-[#C9A961]"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Déplacer à droite"
                            disabled={i === form.gallery.length - 1}
                            onClick={() => {
                              const g = [...form.gallery]
                              ;[g[i + 1], g[i]] = [g[i], g[i + 1]]
                              setForm({ ...form, gallery: g })
                            }}
                            className="p-0.5 rounded text-white disabled:opacity-30 hover:text-[#C9A961]"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label="Retirer cette image"
                          onClick={() => setForm({ ...form, gallery: form.gallery.filter((_, j) => j !== i) })}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className={`${inputClass} flex-1`}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return
                      const next = e.target.value
                      if (!form.gallery.includes(next)) {
                        setForm({ ...form, gallery: [...form.gallery, next] })
                      }
                    }}
                  >
                    <option value="">+ Ajouter depuis la banque d&apos;images…</option>
                    {IMAGE_LIBRARY.filter((src) => !form.gallery.includes(src)).map((src) => (
                      <option key={src} value={src}>{src.replace('/images/products/', '')}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="…ou coller une URL"
                      className={`${inputClass} sm:w-44`}
                      value={form.imageUrl ?? ''}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    />
                    <button
                      type="button"
                      aria-label="Ajouter l'URL"
                      onClick={() => {
                        const url = (form.imageUrl ?? '').trim()
                        if (!url) return
                        if (form.gallery.includes(url)) {
                          toast({ title: 'Image déjà présente', variant: 'destructive' })
                          return
                        }
                        setForm({ ...form, gallery: [...form.gallery, url], imageUrl: '' })
                      }}
                      className="h-10 px-3 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-[#C9A961] hover:text-white transition-colors inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Link2 className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tailles (séparées par virgule)</label>
              <input className={inputClass} value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S,M,L,XL" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Couleurs (séparées par virgule)</label>
              <input className={inputClass} value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} placeholder="Noir,Blanc" />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-6">
              {([
                ['isFeatured', 'Produit vedette'],
                ['isNew', 'Nouveauté'],
                ['isActive', 'Actif (visible en boutique)'],
              ] as const).map(([field, label]) => (
                <label key={field} className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.checked })}
                    className="w-4 h-4 accent-[#C9A961]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setDialogOpen(false)} className="px-5 py-2.5 rounded-full border text-sm font-medium text-muted-foreground hover:bg-muted/50">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-full bg-[#C9A961] hover:bg-[#b8994f] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le produit'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, X, Trash2, Star, Send, EyeOff, RotateCcw, MessageCircleQuestion, Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDate, parseJsonArray } from '@/lib/format'
import Stars from '@/components/shop/Stars'
import type { ProductQuestion, Review } from '@/lib/types'

export default function ReviewsAdmin() {
  const { toast } = useToast()
  const [tab, setTab] = useState<'reviews' | 'questions'>('reviews')

  // ===== Avis =====
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')

  // ===== Questions =====
  const [questions, setQuestions] = useState<ProductQuestion[]>([])
  const [loadingQ, setLoadingQ] = useState(true)
  const [filterQ, setFilterQ] = useState<'pending' | 'answered' | 'all'>('pending')
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reviews')
      setReviews(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const loadQuestions = async () => {
    setLoadingQ(true)
    try {
      const res = await fetch('/api/questions?status=all')
      setQuestions(await res.json())
    } finally {
      setLoadingQ(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadQuestions() }, [])

  const counts = {
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    all: reviews.length,
  }

  const countsQ = {
    pending: questions.filter((q) => q.status === 'pending').length,
    answered: questions.filter((q) => q.status === 'answered').length,
    all: questions.length,
  }

  const filtered = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter((r) => r.status === filter)),
    [reviews, filter],
  )

  const filteredQ = useMemo(
    () => (filterQ === 'all' ? questions : questions.filter((q) => q.status === filterQ)),
    [questions, filterQ],
  )

  const setStatus = async (review: Review, status: string) => {
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast({ title: status === 'approved' ? 'Avis approuvé' : 'Avis rejeté', description: review.product?.name })
      await load()
    }
  }

  const remove = async (review: Review) => {
    if (!confirm('Supprimer cet avis définitivement ?')) return
    const res = await fetch(`/api/reviews/${review.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Avis supprimé' })
      await load()
    }
  }

  // ===== Actions questions =====
  const answerQuestion = async (q: ProductQuestion) => {
    const answer = (answerDrafts[q.id] || '').trim()
    if (!answer) {
      toast({ title: 'Réponse vide', description: 'Écrivez une réponse avant de l\'envoyer.', variant: 'destructive' })
      return
    }
    const res = await fetch(`/api/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    })
    if (res.ok) {
      toast({ title: 'Question répondue', description: 'Elle est désormais visible sur la fiche produit.' })
      setAnswerDrafts((d) => ({ ...d, [q.id]: '' }))
      await loadQuestions()
    }
  }

  const setQuestionStatus = async (q: ProductQuestion, status: string) => {
    const res = await fetch(`/api/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast({ title: status === 'pending' ? 'Question remise en attente' : 'Question masquée' })
      await loadQuestions()
    }
  }

  const removeQuestion = async (q: ProductQuestion) => {
    if (!confirm('Supprimer cette question définitivement ?')) return
    const res = await fetch(`/api/questions/${q.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Question supprimée' })
      await loadQuestions()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Avis clients</h1>
      <p className="text-muted-foreground mt-1">Validez, rejetez ou supprimez les avis de vos clients</p>

      {/* Onglets Avis / Questions */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={() => setTab('reviews')}
          className={`inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold transition-colors ${
            tab === 'reviews' ? 'bg-[#C9A961] text-white' : 'bg-card border border-border text-muted-foreground hover:border-[#C9A961]'
          }`}
        >
          <Star className="w-4 h-4" /> Avis
          {counts.pending > 0 && (
            <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold leading-5 ${tab === 'reviews' ? 'bg-card text-[#C9A961]' : 'bg-[#C9A961] text-white'}`}>
              {counts.pending}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('questions')}
          className={`inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold transition-colors ${
            tab === 'questions' ? 'bg-[#C9A961] text-white' : 'bg-card border border-border text-muted-foreground hover:border-[#C9A961]'
          }`}
        >
          <MessageCircleQuestion className="w-4 h-4" /> Questions
          {countsQ.pending > 0 && (
            <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold leading-5 ${tab === 'questions' ? 'bg-card text-[#C9A961]' : 'bg-[#C9A961] text-white'}`}>
              {countsQ.pending}
            </span>
          )}
        </button>
      </div>

      {tab === 'reviews' && (
        <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">Avis clients</h3>
            <div className="flex gap-2">
              {([
                ['pending', `En attente (${counts.pending})`],
                ['approved', `Approuvés (${counts.approved})`],
                ['all', `Tous (${counts.all})`],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${
                    filter === id
                      ? 'bg-[#C9A961] text-white'
                      : 'border border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Aucun avis dans cette catégorie.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((r) => (
                <div key={r.id} className="border border-border/60 rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center font-bold text-black text-sm">
                        {r.author.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{r.author}</p>
                        <p className="text-xs text-muted-foreground/80">
                          {r.product?.name || 'Produit supprimé'} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'pending' && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-semibold rounded-md px-2 py-1">
                          En attente
                        </span>
                      )}
                      {r.status === 'approved' && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold rounded-md px-2 py-1">
                          Approuvé
                        </span>
                      )}
                    </div>
                  </div>

                  <Stars rating={r.rating} size={14} className="mb-2" />
                  {r.title && <p className="font-semibold text-foreground text-sm mb-1">{r.title}</p>}
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{r.content}</p>
                  {/* Photos client jointes */}
                  {parseJsonArray(r.photos).length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      {parseJsonArray(r.photos).map((url, idx) => (
                        <div key={`${url}-${idx}`} className="w-14 h-14 rounded-lg overflow-hidden border border-border">
                          <img src={url} alt={`Photo avis ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Camera className="w-3.5 h-3.5 text-[#C9A961]" />
                        {parseJsonArray(r.photos).length} photo(s) jointe(s)
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {r.status !== 'approved' && (
                      <button
                        onClick={() => setStatus(r, 'approved')}
                        className="h-8 px-3 rounded-md bg-green-100 text-green-800 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-green-200 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approuver
                      </button>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        onClick={() => setStatus(r, 'pending')}
                        className="h-8 px-3 rounded-md bg-orange-100 text-orange-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-orange-200 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Remettre en attente
                      </button>
                    )}
                    <button
                      onClick={() => remove(r)}
                      className="h-8 px-3 rounded-md bg-muted text-muted-foreground text-xs font-medium inline-flex items-center gap-1.5 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                    <button
                      onClick={() => setStatus(r, 'rejected')}
                      className="h-8 px-3 rounded-md bg-red-50 text-red-600 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'questions' && (
        <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground">Questions produits</h3>
            <div className="flex gap-2">
              {([
                ['pending', `À répondre (${countsQ.pending})`],
                ['answered', `Répondues (${countsQ.answered})`],
                ['all', `Toutes (${countsQ.all})`],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilterQ(id)}
                  className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${
                    filterQ === id
                      ? 'bg-[#C9A961] text-white'
                      : 'border border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loadingQ ? (
            <div className="py-16 text-center text-muted-foreground/80">Chargement…</div>
          ) : filteredQ.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Aucune question dans cette catégorie.</div>
          ) : (
            <div className="space-y-4">
              {filteredQ.map((q) => (
                <div key={q.id} className="border border-border/60 rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
                        Q
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{q.author}</p>
                        <p className="text-xs text-muted-foreground/80">
                          {q.product?.name || 'Produit supprimé'} · {formatDate(q.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.status === 'pending' && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-semibold rounded-md px-2 py-1">
                          À répondre
                        </span>
                      )}
                      {q.status === 'answered' && (
                        <span className="bg-green-100 text-green-800 text-xs font-semibold rounded-md px-2 py-1">
                          Répondue
                        </span>
                      )}
                      {q.status === 'hidden' && (
                        <span className="bg-muted text-muted-foreground text-xs font-semibold rounded-md px-2 py-1">
                          Masquée
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-foreground text-sm leading-relaxed mb-3">{q.question}</p>

                  {q.answer ? (
                    <div className="bg-background rounded-xl p-4 border-l-2 border-[#C9A961] mb-3">
                      <p className="text-xs font-semibold text-[#C9A961] mb-1">Réponse actuelle</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{q.answer}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={answerDrafts[q.id] ?? ''}
                      onChange={(e) => setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                      placeholder={q.answer ? 'Modifier la réponse…' : 'Votre réponse…'}
                      className="flex-1 h-10 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-[#C9A961]"
                    />
                    <button
                      onClick={() => answerQuestion(q)}
                      className="h-10 px-4 rounded-md bg-[#C9A961] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#b8994f] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> {q.answer ? 'Mettre à jour' : 'Répondre'}
                    </button>
                    {q.status === 'answered' && (
                      <button
                        onClick={() => setQuestionStatus(q, 'pending')}
                        className="h-10 px-4 rounded-md bg-orange-100 text-orange-700 text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-orange-200 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retirer
                      </button>
                    )}
                    {q.status === 'pending' && (
                      <button
                        onClick={() => setQuestionStatus(q, 'hidden')}
                        className="h-10 px-4 rounded-md bg-muted text-muted-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-accent transition-colors"
                      >
                        <EyeOff className="w-3.5 h-3.5" /> Masquer
                      </button>
                    )}
                    <button
                      onClick={() => removeQuestion(q)}
                      className="h-10 px-4 rounded-md bg-muted text-muted-foreground text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

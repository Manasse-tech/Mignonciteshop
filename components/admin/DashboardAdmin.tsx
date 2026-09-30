'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Euro, ShoppingCart, Package, Star, Tags, TrendingUp, AlertTriangle, Mail, Users, Download, Activity,
  MessageCircleQuestion, MessageSquare, Star as StarIcon, Radio, FileSpreadsheet,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import { formatPrice } from '@/lib/format'
import { STATUS_LABELS } from '@/lib/types'
import type { ActivityEvent, Stats } from '@/lib/types'
import { useShopStore } from '@/store/useShopStore'
import IntegrationsCard from '@/components/admin/IntegrationsCard'

const STATUS_COLORS: Record<string, string> = {
  confirmee: '#60a5fa',
  expediee: '#818cf8',
  livree: '#4ade80',
  annulee: '#f87171',
}

const PIE_COLORS = ['#C9A961', '#E8D5A3', '#8a7440', '#3a3122']

const ACTIVITY_META: Record<ActivityEvent['type'], { icon: typeof ShoppingCart; classes: string }> = {
  order: { icon: ShoppingCart, classes: 'bg-blue-100 text-blue-600' },
  message: { icon: MessageSquare, classes: 'bg-[#C9A961]/10 text-[#C9A961]' },
  review: { icon: StarIcon, classes: 'bg-orange-100 text-orange-600' },
  question: { icon: MessageCircleQuestion, classes: 'bg-purple-100 text-purple-600' },
}

// Temps relatif en français ("il y a 3 min")
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'à l\'instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function DashboardAdmin() {
  const { navigate } = useShopStore()
  const { toast } = useToast()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const lastOrderId = useRef<string | null>(null)

  const loadActivity = useCallback(() => {
    fetch('/api/activity')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('http'))))
      .then((events: ActivityEvent[]) => {
        // Notification quand une nouvelle commande apparaît (polling quasi temps réel)
        const newestOrder = events.find((e) => e.type === 'order')
        if (newestOrder && lastOrderId.current && newestOrder.id !== lastOrderId.current) {
          toast({
            title: '🛒 Nouvelle commande reçue !',
            description: `${newestOrder.title} — ${newestOrder.detail}`,
            action: (
              <ToastAction altText="Voir les commandes" onClick={() => navigate('admin-orders')}>
                Voir
              </ToastAction>
            ),
          })
        }
        if (newestOrder) lastOrderId.current = newestOrder.id
        setActivity(events)
      })
      .catch(() => {
        /* silencieux */
      })
  }, [toast, navigate])

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
    loadActivity()
    // Rafraîchit l'activité toutes les 20 s (flux quasi temps réel)
    const timer = setInterval(loadActivity, 20000)
    return () => clearInterval(timer)
  }, [loadActivity])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return <p className="text-muted-foreground">Impossible de charger les statistiques.</p>
  }

  // Libellés KPI originaux (bundle : Revenus / Commandes / Produits / Catégories)
  const kpis = [
    { label: 'Revenus', value: formatPrice(stats.totalRevenue), icon: Euro, color: 'bg-green-100 text-green-600' },
    { label: 'Commandes', value: String(stats.ordersCount), icon: ShoppingCart, color: 'bg-blue-100 text-blue-600' },
    { label: 'Produits', value: String(stats.productsCount), icon: Package, color: 'bg-purple-100 text-purple-600' },
    { label: 'Catégories', value: String(stats.categoriesCount), icon: Tags, color: 'bg-orange-100 text-orange-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
      <p className="text-muted-foreground mt-1">Vue d&apos;ensemble de votre boutique</p>

      {/* Alertes */}
      {(stats.lowStock > 0 || stats.unreadMessages > 0 || (stats.pendingQuestions ?? 0) > 0) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {stats.lowStock > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <p className="text-sm text-orange-700">
                <strong>{stats.lowStock}</strong> produit(s) en stock faible (≤ 10)
              </p>
            </div>
          )}
          {stats.unreadMessages > 0 && (
            <div className="flex items-center gap-3 bg-[#C9A961]/10 border border-[#C9A961]/20 rounded-xl px-4 py-3">
              <Mail className="w-5 h-5 text-[#C9A961]" />
              <p className="text-sm text-foreground">
                <strong>{stats.unreadMessages}</strong> message(s) non lu(s)
              </p>
            </div>
          )}
          {(stats.pendingQuestions ?? 0) > 0 && (
            <button
              onClick={() => navigate('admin-reviews')}
              className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 hover:bg-purple-100 transition-colors"
            >
              <MessageCircleQuestion className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-purple-700">
                <strong>{stats.pendingQuestions}</strong> question(s) à répondre
              </p>
            </button>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-foreground mt-1 whitespace-nowrap">{kpi.value}</p>
              </div>
              <span className={`w-10 h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
                <kpi.icon className="w-5 h-5 2xl:w-6 2xl:h-6" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ventes par catégorie (graphique original du bundle) */}
      <div className="bg-card rounded-2xl p-6 shadow-sm mt-6">
        <h2 className="text-lg font-bold text-foreground mb-1">Ventes par catégorie</h2>
        <p className="text-sm text-muted-foreground mb-6">Nombre d&apos;articles vendus par catégorie de produit</p>
        {stats.salesByCategory.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">Aucune vente à afficher pour le moment.</p>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.salesByCategory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => [`${value} article(s)`, 'Ventes']}
                  contentStyle={{ borderRadius: '12px', backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
                />
                <Bar dataKey="ventes" name="Ventes" fill="#C9A961" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C9A961]" /> Revenus (14 derniers jours)
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByDay}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A961" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C9A961" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  formatter={(value) => [formatPrice(Number(value)), 'Revenus']}
                  contentStyle={{ borderRadius: '12px', backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#C9A961" strokeWidth={2} fill="url(#goldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-6">Statuts des commandes</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.ordersByStatus.map((s) => ({ ...s, name: STATUS_LABELS[s.status] || s.status }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {stats.ordersByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#ddd'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--foreground)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Top produits */}
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-6">Top produits vendus</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground/80 py-8 text-center">Aucune vente enregistrée.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }} />
                  <Bar dataKey="quantity" name="Unités vendues" fill="#C9A961" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Répartition catégories */}
        <div className="bg-card rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-6">Répartition par catégorie</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.categoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {stats.categoryDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', backgroundColor: 'var(--popover)', borderColor: 'var(--border)', color: 'var(--popover-foreground)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--foreground)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Infobar + exports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Messages non lus</p>
            <p className="text-xl font-bold text-foreground">{stats.unreadMessages}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-[#C9A961]/10 text-[#C9A961] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Abonnés newsletter</p>
            <p className="text-xl font-bold text-foreground">{stats.subscribers}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Stock faible</p>
            <p className="text-xl font-bold text-foreground">{stats.lowStock}</p>
          </div>
        </div>
        {/* KPI « Avis en attente » déplacé ici (l'original n'a que 4 KPIs) */}
        <div className="bg-card rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <Star className="w-6 h-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Avis en attente</p>
            <p className="text-xl font-bold text-foreground">{stats.pendingReviews}</p>
          </div>
        </div>
      </div>

      {/* Exports CSV (ajout non répertorié) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <a
          href="/api/export?type=clients"
          className="group bg-card rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Download className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground text-sm">Exporter les clients</p>
              <p className="text-xs text-muted-foreground/80">CSV · emails, villes, dépenses</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-muted-foreground/80 group-hover:text-blue-500 transition-colors" />
        </a>
        <a
          href="/api/export?type=newsletter"
          className="group bg-card rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#C9A961]/10 text-[#C9A961] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Download className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground text-sm">Exporter la newsletter</p>
              <p className="text-xs text-muted-foreground/80">CSV · {stats.subscribers} abonné(s)</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-muted-foreground/80 group-hover:text-[#C9A961] transition-colors" />
        </a>
        <a
          href="/api/export?type=commandes"
          className="group bg-card rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-foreground text-sm">Export comptable</p>
              <p className="text-xs text-muted-foreground/80">CSV · commandes + TVA estimée</p>
            </div>
          </div>
          <Download className="w-4 h-4 text-muted-foreground/80 group-hover:text-green-600 transition-colors" />
        </a>
      </div>

      {/* Intégrations externes (Firebase + emails) — état réel, aucun secret */}
      <div className="mt-6">
        <IntegrationsCard />
      </div>

      {/* Activité récente (ajout non répertorié — rafraîchi toutes les 20 s) */}
      <div className="bg-card rounded-2xl p-6 shadow-sm mt-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C9A961]" /> Activité récente
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Temps réel · 20 s
          </span>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground/80 py-6 text-center">Aucune activité pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((ev) => {
              const meta = ACTIVITY_META[ev.type]
              return (
                <li key={ev.id}>
                  <button
                    onClick={() => navigate(ev.href as Parameters<typeof navigate>[0])}
                    className="w-full flex items-center gap-3 py-3 text-left hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.classes}`}>
                      <meta.icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">{ev.title}</span>
                      <span className="block text-xs text-muted-foreground/80 truncate">{ev.detail}</span>
                    </span>
                    <span className="text-xs text-muted-foreground/80 whitespace-nowrap">{relativeTime(String(ev.createdAt))}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

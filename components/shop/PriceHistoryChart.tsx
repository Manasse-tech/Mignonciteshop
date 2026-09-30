'use client'

import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, Minus, LineChart as LineChartIcon } from 'lucide-react'
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatPrice, formatShortDate } from '@/lib/format'

interface PricePoint {
  price: number
  oldPrice: number | null
  createdAt: string
}

/**
 * Courbe d'historique des prix d'un produit (fiche produit).
 * Affichée uniquement si au moins 2 points existent ; sinon badge "prix stable".
 */
export default function PriceHistoryChart({ productId }: { productId: string }) {
  const [points, setPoints] = useState<PricePoint[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/products/${productId}/price-history`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PricePoint[]) => {
        if (!cancelled) setPoints(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setPoints([])
      })
    return () => {
      cancelled = true
    }
  }, [productId])

  if (points === null) return null // chargement discret : rien
  if (points.length < 2) return null // pas assez de données : rien

  const data = points.map((p) => ({
    ...p,
    label: formatShortDate(p.createdAt),
    priceRounded: Math.round(p.price * 100) / 100,
  }))

  const first = points[0].price
  const last = points[points.length - 1].price
  const min = Math.min(...points.map((p) => p.price))
  const max = Math.max(...points.map((p) => p.price))
  const delta = last - first
  const TrendIcon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus
  const trendLabel =
    delta === 0
      ? 'Prix stable'
      : delta < 0
        ? `Baissé de ${formatPrice(Math.abs(delta))}`
        : `Augmenté de ${formatPrice(delta)}`
  const trendColor = delta < 0 ? 'text-green-600 dark:text-green-400' : delta > 0 ? 'text-red-500' : 'text-muted-foreground'

  return (
    <section
      aria-label="Historique des prix"
      className="mt-10 bg-card rounded-2xl border border-border/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-foreground inline-flex items-center gap-2">
          <LineChartIcon className="w-5 h-5 text-[#C9A961]" />
          Historique du prix
        </h3>
        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          {trendLabel} · {formatPrice(min)} – {formatPrice(max)}
        </span>
      </div>

      <div className="h-52 -ml-2" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              domain={[Math.floor(min * 0.95), Math.ceil(max * 1.05)]}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v} €`}
              width={52}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--popover-foreground)',
                fontSize: 13,
              }}
              formatter={(value) => [formatPrice(Number(value)), 'Prix']}
              labelFormatter={(label) => String(label)}
            />
            <Line
              type="monotone"
              dataKey="priceRounded"
              stroke="#C9A961"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#C9A961', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#b8994f', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground/80 mt-3">
        Suivi du prix de vente public depuis le {formatShortDate(points[0].createdAt)}. Le prix actuel est de{' '}
        <strong className="text-foreground">{formatPrice(last)}</strong>.
      </p>
    </section>
  )
}

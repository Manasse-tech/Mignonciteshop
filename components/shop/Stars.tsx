'use client'

import { Star } from 'lucide-react'

interface StarsProps {
  rating: number
  size?: number
  showCount?: boolean
  count?: number
  className?: string
}

export default function Stars({ rating, size = 12, showCount = false, count, className = '' }: StarsProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            i <= Math.round(rating)
              ? 'fill-[#C9A961] text-[#C9A961]'
              : 'text-muted-foreground/40'
          }
        />
      ))}
      {showCount && count !== undefined && (
        <span className="text-xs text-muted-foreground ml-1">({count})</span>
      )}
    </span>
  )
}

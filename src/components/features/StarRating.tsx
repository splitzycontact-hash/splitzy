import { useState } from 'react'
import { m } from 'framer-motion'
import { starStagger, starItem } from '../../utils/animations'

interface StarRatingProps {
  value: number
  onChange: (stars: number) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  return (
    <m.div
      className="flex items-center justify-center gap-2"
      variants={starStagger}
      initial="initial"
      animate="animate"
    >
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= (hovered || value)
        return (
          <m.button
            key={star}
            type="button"
            variants={starItem}
            whileTap={{ scale: 1.3 }}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            <svg
              width="42"
              height="42"
              viewBox="0 0 42 42"
              fill={filled ? '#E8920A' : 'none'}
              stroke={filled ? '#E8920A' : '#D1D5DB'}
              strokeWidth="1.5"
            >
              <path d="M21 3l4.9 10.1 11.1 1.6-8 7.8 1.9 11-9.9-5.2-9.9 5.2 1.9-11-8-7.8 11.1-1.6z" />
            </svg>
          </m.button>
        )
      })}
    </m.div>
  )
}

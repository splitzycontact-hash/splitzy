import { useRef, type ReactNode } from 'react'
import { m, useInView } from 'framer-motion'

interface AnimatedCircularProgressProps {
  value: number // 0–100
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  children?: ReactNode
}

/**
 * Cercle SVG (arc 270°) animé via Framer Motion sur strokeDashoffset.
 * Le gap est positionné en bas (rotate -225deg). Design uniquement.
 */
export function AnimatedCircularProgress({
  value,
  size = 72,
  strokeWidth = 6,
  color = '#E8920A',
  trackColor = 'var(--ds-bg-subtle)',
  children,
}: AnimatedCircularProgressProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75 // 270°
  const p = Math.max(0, Math.min(100, value)) / 100
  const arcFilled = arc * p

  return (
    <div
      ref={ref}
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-225deg)', overflow: 'visible' }}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
        />
        {/* Fill (animé) */}
        <m.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
          initial={{ strokeDashoffset: arc }}
          animate={isInView ? { strokeDashoffset: arc - arcFilled } : { strokeDashoffset: arc }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

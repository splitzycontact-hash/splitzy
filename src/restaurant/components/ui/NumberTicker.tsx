import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

interface NumberTickerProps {
  value: number
  decimalPlaces?: number
  prefix?: string
  suffix?: string
  delay?: number
  duration?: number
  className?: string
}

/**
 * Anime un nombre de 0 → value en ~1.4s (easeOutQuart) à l'entrée en vue.
 * Design uniquement — n'altère aucune donnée.
 */
export function NumberTicker({
  value,
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
  delay = 0,
  duration = 1400,
  className = '',
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (!isInView) return

    let raf = 0
    let start = 0
    let cancelled = false

    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (cancelled) return
        if (!start) start = ts
        const elapsed = ts - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 4)
        setDisplayed(value * eased)
        if (progress < 1) raf = requestAnimationFrame(step)
        else setDisplayed(value)
      }
      raf = requestAnimationFrame(step)
    }, delay * 1000)

    return () => {
      cancelled = true
      clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [isInView, value, duration, delay])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {displayed.toFixed(decimalPlaces)}
      {suffix}
    </span>
  )
}

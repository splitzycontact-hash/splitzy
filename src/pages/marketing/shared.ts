import { useRef, useState, useEffect } from 'react'

export const fadeInUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

export function useFadeInView(options: { rootMargin?: string; threshold?: number } = {}) {
  const { rootMargin = '0px 0px -10% 0px', threshold = 0.15 } = options
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            obs.disconnect()
            break
          }
        }
      },
      { rootMargin, threshold }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [rootMargin, threshold])

  return { ref, inView }
}

export function useCountUp(
  target: number,
  { duration = 1500, decimals = 0, inView = false } = {}
) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, inView])
  return Number(val).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

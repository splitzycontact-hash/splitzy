import { useRef, type ReactNode } from 'react'
import { m, useInView } from 'framer-motion'

interface BlurFadeProps {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  inViewOnce?: boolean
}

/**
 * Wrapper d'animation d'entrée — fade + blur + slide up.
 * Déclenché à l'entrée en vue (useInView). Design uniquement.
 */
export function BlurFade({
  children,
  delay = 0,
  duration = 0.35,
  className = '',
  inViewOnce = true,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: inViewOnce,
    margin: '0px 0px -20px 0px',
  })

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: 'blur(5px)', y: 8 }}
      animate={
        isInView
          ? { opacity: 1, filter: 'blur(0px)', y: 0 }
          : { opacity: 0, filter: 'blur(5px)', y: 8 }
      }
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </m.div>
  )
}

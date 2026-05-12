import type { Variants, Transition } from 'framer-motion'

export const pageVariants: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: 0.18 },
  },
}

export const springPop: Transition = { type: 'spring', stiffness: 400, damping: 17 }

export const slideDown: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.22 } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.18 } },
}

export const checkAnimation: Variants = {
  initial: { scale: 0.6, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
  },
}

export const slideUp: Variants = {
  initial: { y: 60, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
}

export const starStagger: Variants = {
  animate: { transition: { staggerChildren: 0.03 } },
}

export const starItem: Variants = {
  initial: { scale: 0.8, opacity: 0.4 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.15 } },
}

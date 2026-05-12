import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type ButtonVariant = 'brand' | 'dark' | 'ghost'

interface ButtonProps {
  variant?: ButtonVariant
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles: Record<ButtonVariant, string> = {
  brand:
    'bg-brand text-white font-extrabold shadow-md hover:bg-brand-dark active:bg-brand-dark',
  dark:
    'bg-dark-charcoal text-white font-extrabold hover:bg-dark active:bg-dark',
  ghost:
    'bg-transparent border border-border text-dark font-semibold hover:bg-gray-50 active:bg-gray-100',
}

export function Button({
  variant = 'brand',
  disabled = false,
  onClick,
  children,
  className = '',
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full rounded-[18px] py-4 text-base leading-none
        min-h-[52px] flex items-center justify-center
        transition-colors duration-150
        ${variantStyles[variant]}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}

import { m } from 'framer-motion'

interface PillProps {
  label: string
  active?: boolean
  onClick?: () => void
  className?: string
}

export function Pill({ label, active = false, onClick, className = '' }: PillProps) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap
        transition-colors duration-150 min-h-[36px]
        ${active
          ? 'bg-brand text-white'
          : 'bg-white text-dark border border-border'
        }
        ${className}
      `}
    >
      {label}
    </m.button>
  )
}

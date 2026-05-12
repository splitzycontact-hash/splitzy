import { motion } from 'framer-motion'

interface FeedbackTagProps {
  label: string
  selected: boolean
  onToggle: () => void
}

export function FeedbackTag({ label, selected, onToggle }: FeedbackTagProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`
        px-4 py-2 rounded-full text-sm font-medium border min-h-[40px]
        transition-colors duration-150 whitespace-nowrap
        ${selected
          ? 'bg-brand/10 border-brand text-brand'
          : 'bg-white border-border text-mid'
        }
      `}
    >
      {label}
    </motion.button>
  )
}

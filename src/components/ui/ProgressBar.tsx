import { m } from 'framer-motion'

interface ProgressBarProps {
  value: number // 0-100
  className?: string
  color?: string
}

export function ProgressBar({ value, className = '', color = '#E8920A' }: ProgressBarProps) {
  return (
    <div className={`w-full h-1 bg-white/20 rounded-full overflow-hidden ${className}`}>
      <m.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}

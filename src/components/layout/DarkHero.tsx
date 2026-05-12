import type { ReactNode } from 'react'

interface DarkHeroProps {
  children: ReactNode
  className?: string
  minHeight?: string
}

export function DarkHero({ children, className = '', minHeight = '220px' }: DarkHeroProps) {
  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center ${className}`}
      style={{ background: '#18181B', minHeight }}
    >
      {/* Decorative ticket stubs top-right */}
      <div
        className="absolute top-4 right-4 opacity-[0.16] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="w-12 h-5 rounded-sm border border-white rotate-12 mb-1"
          style={{ background: 'transparent' }}
        />
        <div
          className="w-8 h-3 rounded-sm border border-white rotate-6 ml-2"
          style={{ background: 'transparent' }}
        />
      </div>
      {children}
    </div>
  )
}

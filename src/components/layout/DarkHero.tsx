import type { ReactNode } from 'react'

interface DarkHeroProps {
  children: ReactNode
  className?: string
  minHeight?: string
  tall?: boolean
}

export function DarkHero({ children, className = '', tall = false }: DarkHeroProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: '#0A0A0A',
        padding: tall ? '60px 24px 36px' : '50px 24px 28px',
        color: '#fff',
      }}
    >
      {/* Diagonal stripes */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 14px)',
      }} />
      {/* Radial orange glow top-right */}
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 280, height: 280,
        background: 'radial-gradient(circle, rgba(232,146,10,0.22) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

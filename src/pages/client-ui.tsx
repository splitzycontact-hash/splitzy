// Shared design tokens, helpers and UI primitives for the client payment flow.
import { useState } from 'react'
import { motion } from 'framer-motion'

// ── Design tokens ──────────────────────────────────────────────────
export const C = {
  bg: '#FAFAFA',
  white: '#FFFFFF',
  ink: '#0A0A0A',
  ink2: '#18181B',
  mute: '#52525B',
  mute2: '#A1A1AA',
  border: '#E4E4E7',
  borderSoft: '#F1F1F2',
  orange: '#E8920A',
  orangeSoft: '#FFF4E5',
  green: '#10B981',
} as const

export const AVATAR_COLORS = [
  { id: 'sunset', hex: '#E8920A' },
  { id: 'forest', hex: '#10B981' },
  { id: 'ocean',  hex: '#3B82F6' },
  { id: 'berry',  hex: '#8B5CF6' },
  { id: 'rose',   hex: '#F43F5E' },
  { id: 'mint',   hex: '#14B8A6' },
] as const

export const FEEDBACK_CHIPS = [
  { id: 'amb',  label: 'Super ambiance',       dot: '#F59E0B' },
  { id: 'top',  label: 'Serveur top',          dot: '#10B981' },
  { id: 'qpr',  label: 'Rapport qualité-prix', dot: '#14B8A6' },
  { id: 'back', label: 'On reviendra',         dot: '#E8920A' },
  { id: 'cold', label: 'Plat froid',           dot: '#3B82F6' },
  { id: 'slow', label: 'Service lent',         dot: '#A855F7' },
  { id: 'wine', label: 'Carte des vins',       dot: '#EC4899' },
  { id: 'loud', label: 'Trop bruyant',         dot: '#EF4444' },
]

// Formats euros (not cents) to French locale string
export const eur = (euros: number) =>
  euros.toFixed(2).replace('.', ',') + ' €'

// Formats cents to euros French locale string
export const centsToEur = (cents: number) => eur(cents / 100)

// ── Icons ──────────────────────────────────────────────────────────
type IconProps = React.SVGProps<SVGSVGElement>

export const Icon = {
  Back: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  Lock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
  ChevronRight: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevronDown: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Sparkle: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/>
      <path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z" opacity=".6"/>
    </svg>
  ),
  Star: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Minus: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Receipt: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2H4z"/>
      <line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/>
    </svg>
  ),
}

// ── Primitives ─────────────────────────────────────────────────────

interface AvatarProps {
  color?: string
  initial?: string
  size?: number
  faded?: boolean
  ringed?: boolean
  dashed?: boolean
  label?: string
}

export function CAvatar({ color = '#E4E4E7', initial = '?', size = 36, faded = false, ringed = false, dashed = false, label }: AvatarProps) {
  const hasColor = color !== '#E4E4E7' && !dashed
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: dashed ? 'transparent' : hasColor ? color : '#F1F1F2',
        color: hasColor ? '#fff' : C.mute,
        border: dashed ? `1.5px dashed ${C.border}` : ringed ? `2px solid ${C.orange}` : '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.42, letterSpacing: '-0.02em',
        opacity: faded ? 0.4 : 1,
        boxShadow: hasColor ? 'inset 0 0 0 0.5px rgba(255,255,255,0.18)' : 'none',
        flexShrink: 0,
      }}>
        {dashed ? '+' : initial}
      </div>
      {label && (
        <div style={{ fontSize: 10.5, color: C.mute, fontWeight: 500, letterSpacing: '-0.01em' }}>{label}</div>
      )}
    </div>
  )
}

export function DarkHero({ children, tall = false }: { children: React.ReactNode; tall?: boolean }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: '#0A0A0A',
      padding: tall ? '60px 24px 36px' : '50px 24px 28px',
      color: '#fff',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 14px)',
      }} />
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 280, height: 280,
        background: 'radial-gradient(circle, rgba(232,146,10,0.22) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

export function StepBar({ current = 1, total = 3 }: { current?: number; total?: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: 28, height: 4, borderRadius: 2,
          background: i < current ? C.orange : '#E4E4E7',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  )
}

export function LiveDot({ color = C.green }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        boxShadow: `0 0 0 0 ${color}55`,
        animation: 'livePulse 1.6s infinite',
      }} />
      <style>{`@keyframes livePulse {
        0% { box-shadow: 0 0 0 0 ${color}66; }
        70% { box-shadow: 0 0 0 8px transparent; }
        100% { box-shadow: 0 0 0 0 transparent; }
      }`}</style>
    </span>
  )
}

export function PageHeader({ title, onBack, right }: { title?: string | null; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 6px' }}>
      {onBack ? (
        <button type="button" onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 11, border: `1px solid ${C.border}`,
          background: C.white, color: C.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon.Back style={{ width: 15, height: 15 }} />
        </button>
      ) : <div style={{ width: 34 }} />}
      <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
        {title}
      </div>
      <div style={{ width: 34, display: 'flex', justifyContent: 'flex-end' }}>{right ?? null}</div>
    </div>
  )
}

export function SplitzyMark({ on = 'light' }: { on?: 'light' | 'dark' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 16, height: 16, borderRadius: 4, background: on === 'light' ? C.ink : '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 1, padding: 3,
      }}>
        <span style={{ flex: 1, height: '100%', background: '#fff', borderRadius: 1 }} />
        <span style={{ flex: 1, height: '100%', background: C.orange, borderRadius: 1 }} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: on === 'light' ? C.mute : '#A1A1AA', letterSpacing: '-0.01em' }}>
        Split<span style={{ color: C.orange }}>zy</span>
      </span>
    </span>
  )
}

export function StarRating({ value, onChange, size = 44 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= (hover || value)
        return (
          <motion.button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            whileTap={{ scale: 0.82 }}
            animate={active ? { scale: 1 } : { scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            style={{
              border: 0, background: 'transparent', padding: 4, cursor: 'pointer',
              color: active ? C.orange : '#E4E4E7',
              transition: 'color 0.15s',
            }}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          >
            <Icon.Star style={{ width: size, height: size, filter: active ? 'drop-shadow(0 2px 8px rgba(232,146,10,0.35))' : 'none' }} />
          </motion.button>
        )
      })}
    </div>
  )
}

export function Spin({ color = '#fff' }: { color?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${color}33`, borderTopColor: color,
      }}
    />
  )
}

export function OrangeBtn({ onClick, disabled, children, height = 56 }: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  height?: number
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', height, borderRadius: 16, border: 0,
        background: disabled ? C.border : C.orange,
        color: disabled ? C.mute2 : '#fff',
        fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: disabled ? 'none' : '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </motion.button>
  )
}

export function GhostBtn({ onClick, children, height = 48 }: {
  onClick?: () => void
  children: React.ReactNode
  height?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', height, borderRadius: 14,
        border: `1px solid ${C.border}`, background: C.white, color: C.mute,
        fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

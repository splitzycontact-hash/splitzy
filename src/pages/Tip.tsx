import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'

const TIP_OPTIONS = [
  { value: 0, label: 'Aucun' },
  { value: 10, label: '10 %' },
  { value: 15, label: '15 %' },
  { value: 20, label: '20 %' },
]

export function Tip() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal, tipAmount, total } = useSessionCalcs()

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#F4F4F5' }}
    >
      {/* Dark header */}
      <div style={{
        background: '#18181B', padding: '18px 20px 14px', color: '#fff', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.08)', border: 'none', padding: '7px 12px',
              borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', minHeight: 44, minWidth: 44,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Retour
          </button>
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            Pourboire
          </div>
          {/* Progress bar */}
          <div style={{ width: 48, height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '66%', height: '100%', background: '#E8920A', borderRadius: 2, boxShadow: '0 0 8px rgba(232,146,10,0.5)' }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0 20px 140px', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ fontSize: 14, fontWeight: 800, margin: '18px 0 12px', color: '#111827' }}>
          Laisser un pourboire
        </div>

        {/* 4 tip buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
          {TIP_OPTIONS.map(opt => {
            const active = state.tipPercent === opt.value
            const tipEur = opt.value > 0 && subtotal > 0
              ? formatEur(Math.round(subtotal * opt.value / 100))
              : null
            return (
              <m.button
                key={opt.value}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => dispatch({ type: 'SET_TIP_PERCENT', payload: opt.value })}
                style={{
                  padding: '16px 6px', background: active ? '#fff' : '#F4F4F5',
                  border: `2px solid ${active ? '#E8920A' : '#E5E7EB'}`,
                  borderRadius: 16, textAlign: 'center' as const, cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: active ? '0 4px 16px rgba(232,146,10,0.22), 0 0 0 3px rgba(232,146,10,0.1)' : 'none',
                  transform: active ? 'translateY(-2px)' : 'none',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: active ? '#B45309' : '#111827' }}>
                  {opt.label}
                </div>
                {tipEur && (
                  <div style={{ fontSize: 11, color: active ? '#E8920A' : '#9CA3AF', marginTop: 3, fontWeight: active ? 700 : 500 }}>
                    {tipEur}
                  </div>
                )}
              </m.button>
            )
          })}
        </div>

        {/* Recap card */}
        <div style={{
          background: '#FAFAFA', borderRadius: 18, padding: '14px 16px',
          margin: '16px 0', border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: '#374151' }}>
            <span>Ma part</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{subtotal > 0 ? formatEur(subtotal) : '—'}</span>
          </div>
          {state.tipPercent > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: '#B45309', fontWeight: 600 }}>
              <span>+ Pourboire ({state.tipPercent} %)</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>+{formatEur(tipAmount)}</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            borderTop: '2px solid #111827', marginTop: 8, paddingTop: 10, fontSize: 15, fontWeight: 900,
          }}>
            <span>Total</span>
            <span style={{ fontSize: 22, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {total > 0 ? formatEur(total) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        background: '#F4F4F5',
        padding: '14px 20px',
        paddingBottom: 'max(28px, calc(16px + env(safe-area-inset-bottom)))',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}>
        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/payment')}
          style={{
            width: '100%', height: 56, borderRadius: 18, border: 0, background: '#E8920A', color: '#fff',
            fontSize: 16, fontWeight: 800, letterSpacing: '0.01em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 18px rgba(232,146,10,0.32), 0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          {total > 0 ? `Payer ${formatEur(total)}` : 'Continuer'}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </m.button>
      </div>
    </m.div>
  )
}

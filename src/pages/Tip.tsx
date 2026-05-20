import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'

function getTipMessage(pct: number): string {
  if (pct === 0) return 'Aucun pourboire'
  if (pct <= 5) return 'Un petit geste'
  if (pct <= 12) return "C'est généreux"
  if (pct <= 20) return 'Très généreux'
  return 'Super généreux 🌟'
}

export function Tip() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal, tipAmount, total } = useSessionCalcs()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 6px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 34, height: 34, borderRadius: 11, border: '1px solid #E4E4E7',
            background: '#fff', color: '#0A0A0A', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
          Pourboire
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Big amount */}
      <div style={{ padding: '24px 24px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Tu ajoutes
        </div>
        <motion.div
          key={state.tipPercent}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            fontSize: 54, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em', marginTop: 4,
            fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2,
          }}
        >
          <span>{formatEur(tipAmount).replace('€', '')}</span>
          <span style={{ color: '#E8920A' }}>€</span>
        </motion.div>
        <div style={{ fontSize: 13.5, color: '#52525B', marginTop: 4 }}>
          {state.tipPercent}% · {getTipMessage(state.tipPercent)}
        </div>
      </div>

      {/* Slider */}
      <div style={{ padding: '0 24px' }}>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={state.tipPercent}
          onChange={e => dispatch({ type: 'SET_TIP_PERCENT', payload: parseInt(e.target.value, 10) })}
          style={{ width: '100%', accentColor: '#E8920A', height: 32, cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#52525B', fontWeight: 600 }}>
          <span>0 %</span>
          <span style={{ color: '#E8920A' }}>{state.tipPercent} %</span>
          <span>30 %</span>
        </div>
      </div>

      {/* Quick chips */}
      <div style={{ padding: '18px 20px 0', display: 'flex', gap: 8 }}>
        {[0, 10, 15, 20].map(v => {
          const active = state.tipPercent === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => dispatch({ type: 'SET_TIP_PERCENT', payload: v })}
              style={{
                flex: 1, height: 40, borderRadius: 12,
                border: `1.5px solid ${active ? '#E8920A' : '#E4E4E7'}`,
                background: active ? '#E8920A' : '#fff',
                color: active ? '#fff' : '#0A0A0A',
                fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {v === 0 ? 'Aucun' : `${v} %`}
            </button>
          )
        })}
      </div>

      {/* Breakdown card */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: '4px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', gap: 10 }}>
            <span style={{ fontSize: 13.5, color: '#52525B' }}>Ma part</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatEur(subtotal)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px dashed #E4E4E7', gap: 10 }}>
            <span style={{ fontSize: 13.5, color: '#52525B' }}>+ Pourboire</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: tipAmount > 0 ? '#E8920A' : '#A1A1AA', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {tipAmount > 0 ? `+${formatEur(tipAmount)}` : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #E4E4E7', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em' }}>À payer</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatEur(total)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 16 }} />

      {/* CTA */}
      <div style={{ padding: '14px 20px 28px' }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/payment')}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0, background: '#E8920A', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          Payer {formatEur(total)}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'

export function Confirmation() {
  const { state } = useSession()
  const navigate = useNavigate()
  const { subtotal, tipAmount, splitzyFee, total } = useSessionCalcs()
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/feedback')
      return
    }
    const t = setTimeout(() => setCountdown(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, navigate])

  const selectedMenuItems = state.selectedItems.map(sel => {
    const item = state.orderItems.find(o => o.id === sel.menuItemId)
    return { sel, item }
  }).filter(({ item }) => !!item)

  const totalStr = formatEur(total).replace('€', '')

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
    >
      {/* Dark hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: '#0A0A0A', padding: '36px 24px 20px', color: '#fff', flexShrink: 0,
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
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <m.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.05 }}
            style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 18px',
              background: '#10B981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 36px -8px rgba(16,185,129,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <path d="M6 17L13.5 24L28 9" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </m.div>
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em' }}
          >
            Paiement reçu !
          </m.div>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ fontSize: 13.5, color: '#A1A1AA', marginTop: 6 }}
          >
            Merci pour cette soirée chez<br />
            <strong style={{ color: '#fff', fontWeight: 600 }}>{state.restaurantName}</strong>
          </m.div>
        </div>
      </div>

      {/* Receipt */}
      <div style={{ padding: '16px 20px 0' }}>
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ background: '#fff', borderRadius: 16, border: '1px solid #E4E4E7', padding: '6px 18px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 10px', borderBottom: '1px dashed #E4E4E7', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A0A0A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {state.restaurantName}
              </div>
              <div style={{ fontSize: 11.5, color: '#52525B' }}>
                Table {state.tableNumber} · {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A0A0A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatEur(subtotal)}
            </div>
          </div>

          {/* Items (item mode only) */}
          {state.splitMode === 'item' && selectedMenuItems.map(({ sel, item }) => {
            if (!item) return null
            const linePrice = Math.round((item.qty * item.unitCents) / sel.splitFactor)
            return (
              <div key={sel.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', gap: 8 }}>
                <span style={{ fontSize: 13.5, color: '#52525B', fontWeight: 500 }}>
                  {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                  {sel.splitFactor > 1 && <span style={{ fontSize: 11, color: '#A1A1AA', marginLeft: 4 }}>÷{sel.splitFactor}</span>}
                </span>
                <span style={{ fontSize: 13.5, color: '#52525B', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatEur(linePrice)}
                </span>
              </div>
            )
          })}

          {/* Totals */}
          {[
            { l: 'Sous-total', v: formatEur(subtotal), c: '#52525B' },
            ...(tipAmount > 0 ? [{ l: `Pourboire (${state.tipPercent} %)`, v: `+${formatEur(tipAmount)}`, c: '#E8920A' }] : []),
            { l: 'Commission Splitzy (1,5 %)', v: formatEur(splitzyFee), c: '#A1A1AA', note: 'payée par le restaurant' },
          ].map((row, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 13.5, color: row.c, fontWeight: 500 }}>{row.l}</span>
                {row.note && (
                  <div style={{ fontSize: 10, color: '#A1A1AA', fontStyle: 'italic', marginTop: 1 }}>{row.note}</div>
                )}
              </div>
              <span style={{ fontSize: 13.5, color: row.c, fontWeight: row.l.startsWith('Pourboire') ? 700 : 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {row.v}
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 14px', borderTop: '1px solid #E4E4E7', marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0A0A0A' }}>Total payé</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalStr}€
            </span>
          </div>
        </m.div>

      </div>

      <div style={{ height: 140 }} />

      {/* Fixed CTA */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        background: '#FAFAFA',
        borderTop: '1px solid #E4E4E7',
        padding: '12px 20px',
        paddingBottom: 'max(28px, calc(16px + env(safe-area-inset-bottom)))',
        zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}>
        <button
          type="button"
          onClick={() => navigate('/feedback')}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16,
            border: '1px solid rgba(232,146,10,0.2)', background: '#FFF4E5',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 11, background: '#E8920A',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L10.9 6.5L16 7.3L12.5 10.7L13.4 15.8L9 13.4L4.6 15.8L5.5 10.7L2 7.3L7.1 6.5L9 2Z" fill="white" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.005em' }}>
              Comment s'est passée la soirée ?
            </div>
            <div style={{ fontSize: 11.5, color: '#52525B', marginTop: 2 }}>
              Ton avis est <strong style={{ color: '#0A0A0A', fontWeight: 700 }}>100 % privé</strong> · 30 secondes
            </div>
            <div style={{
              height: 4, borderRadius: 2, background: 'rgba(232,146,10,0.18)',
              marginTop: 10, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: '#E8920A', borderRadius: 2,
                width: `${((8 - countdown) / 8) * 100}%`,
                transition: 'width 1s linear',
              }} />
            </div>
            <div style={{ fontSize: 10.5, color: '#A1A1AA', marginTop: 4, fontStyle: 'italic' }}>
              Redirection dans {countdown} seconde{countdown > 1 ? 's' : ''}…
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M6 3L10 8L6 13" stroke="#E8920A" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </m.div>
  )
}

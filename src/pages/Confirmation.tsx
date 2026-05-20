import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { MENU_ITEMS } from '../data/menu'
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
    const item = MENU_ITEMS.find(m => m.id === sel.menuItemId)
    return { sel, item }
  }).filter(({ item }) => !!item)

  const totalStr = formatEur(total).replace('€', '')

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
    >
      {/* Dark hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: '#0A0A0A', padding: '60px 24px 36px', color: '#fff', flexShrink: 0,
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
          <motion.div
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
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em' }}
          >
            Paiement reçu !
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ fontSize: 13.5, color: '#A1A1AA', marginTop: 6 }}
          >
            Merci pour cette soirée chez<br />
            <strong style={{ color: '#fff', fontWeight: 600 }}>{state.restaurantName}</strong>
          </motion.div>
        </div>
      </div>

      {/* Receipt */}
      <div style={{ padding: '16px 20px 0' }}>
        <motion.div
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
            const linePrice = Math.round(item.price / sel.splitFactor)
            return (
              <div key={sel.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', gap: 8 }}>
                <span style={{ fontSize: 13.5, color: '#52525B', fontWeight: 500 }}>
                  {item.emoji ? `${item.emoji} ` : ''}{item.name}
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
        </motion.div>

        {/* Receipt actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={async () => {
              const { generateInvoicePDF } = await import('../utils/generateInvoice')
              generateInvoicePDF(state)
            }}
            style={{
              flex: 1, height: 40, borderRadius: 11, border: '1px solid #E4E4E7',
              background: '#fff', color: '#0A0A0A', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v8M7 9L4.5 6.5M7 9L9.5 6.5M2 12h10" stroke="#374151" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reçu PDF
          </button>
          <button
            type="button"
            style={{
              flex: 1, height: 40, borderRadius: 11, border: '1px solid #E4E4E7',
              background: '#fff', color: '#0A0A0A', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Par e-mail
          </button>
        </div>
      </div>

      {/* Feedback teaser */}
      <div style={{ padding: '14px 20px 0' }}>
        <button
          type="button"
          onClick={() => navigate('/feedback')}
          style={{
            width: '100%', padding: 16, borderRadius: 16,
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
            {/* Progress bar */}
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

      <div style={{ flex: 1 }} />

      <div style={{ padding: '14px 20px', paddingBottom: 'max(24px, calc(12px + env(safe-area-inset-bottom)))', textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 16, height: 16, borderRadius: 4, background: '#0A0A0A',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 3, gap: 1,
          }}>
            <span style={{ flex: 1, height: '100%', background: '#fff', borderRadius: 1 }} />
            <span style={{ flex: 1, height: '100%', background: '#E8920A', borderRadius: 1 }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#52525B', letterSpacing: '-0.01em' }}>
            Split<span style={{ color: '#E8920A' }}>zy</span>
          </span>
        </span>
      </div>
    </motion.div>
  )
}

import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { MENU_ITEMS } from '../data/menu'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'

export function Recap() {
  const { state } = useSession()
  const navigate = useNavigate()
  const { subtotal, splitzyFee } = useSessionCalcs()

  const selectedMenuItems = state.selectedItems.map(sel => {
    const item = MENU_ITEMS.find(m => m.id === sel.menuItemId)
    return { sel, item }
  }).filter(({ item }) => !!item)

  const amountStr = formatEur(subtotal)
  const amountNum = amountStr.replace('€', '')

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
        background: '#0A0A0A', padding: '50px 24px 28px', color: '#fff', flexShrink: 0,
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
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              background: 'rgba(255,255,255,0.06)', border: 0, borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 18,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2.5L4.5 7L9 11.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Retour
          </button>
          <div style={{ fontSize: 12, color: '#A1A1AA', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Tu paies
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 4, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline' }}>
            <span>{amountNum}</span>
            <span style={{ color: '#E8920A' }}>€</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ padding: '20px 20px 0', flex: 1 }}>
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E4E4E7', padding: '8px 18px' }}>
          {/* Top line */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 14px', borderBottom: '1px dashed #E4E4E7', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>
              {state.splitMode === 'equal' && `Part égale (1/${state.equalSplitCount})`}
              {state.splitMode === 'item' && (selectedMenuItems.length > 0 ? `${selectedMenuItems.length} article${selectedMenuItems.length > 1 ? 's' : ''}` : 'Mes articles')}
              {state.splitMode === 'custom' && 'Montant libre'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {formatEur(subtotal)}
            </span>
          </div>

          {/* Items detail (item mode only) */}
          {state.splitMode === 'item' && selectedMenuItems.map(({ sel, item }) => {
            if (!item) return null
            const linePrice = Math.round(item.price / sel.splitFactor)
            return (
              <div key={sel.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 13.5, color: '#52525B', fontWeight: 500 }}>
                    {item.emoji ? `${item.emoji} ` : ''}{item.name}
                  </span>
                  {sel.splitFactor > 1 && (
                    <span style={{ fontSize: 11, color: '#A1A1AA', marginLeft: 6 }}>÷{sel.splitFactor}</span>
                  )}
                </div>
                <span style={{ fontSize: 13.5, color: '#52525B', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatEur(linePrice)}
                </span>
              </div>
            )
          })}

          {/* Sub-rows */}
          {[
            { l: 'Sous-total', v: formatEur(subtotal), muted: true },
            { l: 'Service inclus', v: '—', muted: true },
            { l: 'Commission Splitzy (1,5 %)', v: formatEur(splitzyFee), muted: true, small: true },
          ].map((row, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', gap: 10 }}>
              <span style={{ fontSize: row.small ? 12 : 13.5, color: '#52525B', fontWeight: 500 }}>{row.l}</span>
              <span style={{ fontSize: row.small ? 12 : 13.5, color: row.small ? '#A1A1AA' : '#52525B', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{row.v}</span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 14px', borderTop: '1px solid #E4E4E7', marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0A0A0A' }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
              {formatEur(subtotal)}
            </span>
          </div>
        </div>

        {/* Commission helper */}
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 12,
          background: '#FFF4E5', display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
            <path d="M7 1L8.9 5.2L13.5 5.8L10.25 8.97L11.09 13.5L7 11.27L2.91 13.5L3.75 8.97L0.5 5.8L5.1 5.2L7 1Z" fill="#E8920A" />
          </svg>
          <div style={{ fontSize: 11.5, color: '#0A0A0A', lineHeight: 1.45 }}>
            <strong style={{ fontWeight: 700 }}>Aucune surcharge pour toi.</strong>
            {' '}La commission est <strong style={{ fontWeight: 700 }}>prise en charge par le restaurant</strong>. Tu paies exactement ce que tu as choisi.
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 16 }} />

      {/* CTAs */}
      <div style={{ padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/tip')}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0, background: '#E8920A', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          Ajouter un pourboire
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </m.button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent', border: 0, color: '#52525B',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 8,
          }}
        >
          Modifier ma sélection
        </button>
      </div>
    </m.div>
  )
}

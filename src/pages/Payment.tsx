import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'
import { MOCK_CARDS } from '../data/session'
import type { Id } from '../../convex/_generated/dataModel'

export function Payment() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal, tipAmount, splitzyFee, total, remainingCents } = useSessionCalcs()
  const [loading, setLoading] = useState<string | null>(null)

  const createPayment = useMutation(api.payments.create)

  const selectedCard = MOCK_CARDS.find(c => c.id === state.selectedCardId) ?? MOCK_CARDS[0]

  const totalStr = formatEur(total).replace('€', '')

  // En mode "par article", liste des noms d'articles à marquer paid dans Convex.
  // Seuls les articles payés à 100% (splitFactor === 1) sont marqués paid —
  // les articles partagés restent visibles pour les autres convives.
  const paidItemNames: string[] | undefined = state.splitMode === 'item'
    ? state.selectedItems.filter(i => i.splitFactor === 1).map(i => i.name)
    : undefined

  // Fire-and-forget : on ne await pas la mutation Convex.
  // Sur iOS Safari, le WS peut être suspendu (background, écran verrouillé) et
  // setTimeout est throttlé → Promise.race hang indéfiniment → boutons bloqués.
  // Convex queue la mutation et l'envoie dès la reconnexion du socket.
  const handlePay = useCallback((method: string) => {
    if (loading) return
    setLoading(method)

    if (state.convexRestaurantId && state.convexTableId) {
      void createPayment({
        restaurantId: state.convexRestaurantId as Id<'restaurants'>,
        tableId: state.convexTableId as Id<'tables'>,
        tableNumber: state.tableNumber,
        guests: state.equalSplitCount ?? 1,
        subtotalCents: subtotal,
        tipCents: tipAmount,
        commissionCents: splitzyFee,
        totalCents: total,
        paymentMethod: method,
        paidItemNames: paidItemNames && paidItemNames.length > 0 ? paidItemNames : undefined,
      }).catch(() => {})
    }

    dispatch({ type: 'CONFIRM_PAYMENT' })
    dispatch({ type: 'ADD_CACHED_PAID_CENTS', payload: subtotal })
    if (subtotal >= remainingCents && remainingCents > 0) {
      dispatch({ type: 'MARK_CACHED_ITEMS_PAID' })
    } else if (paidItemNames && paidItemNames.length > 0) {
      dispatch({ type: 'MARK_SPECIFIC_ITEMS_PAID', payload: paidItemNames })
    }
    navigate('/confirmation')
  }, [loading, state, createPayment, subtotal, tipAmount, splitzyFee, total, dispatch, navigate, remainingCents, paidItemNames])

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
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px',
              background: 'rgba(255,255,255,0.08)', border: 0, borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14, minHeight: 44,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2.5L4.5 7L9 11.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Retour
          </button>
          <div style={{ fontSize: 12, color: '#A1A1AA', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            À régler
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 4, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline' }}>
            <span>{totalStr}</span>
            <span style={{ color: '#E8920A' }}>€</span>
          </div>
        </div>
      </div>

      {/* Cards carousel */}
      <div style={{ padding: '20px 0 0' }}>
        <div style={{ padding: '0 20px 10px', fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Mes cartes
        </div>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 8px',
          scrollSnapType: 'x mandatory',
        }}>
          {MOCK_CARDS.map(card => {
            const sel = card.id === state.selectedCardId
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_SELECTED_CARD', payload: card.id })}
                style={{
                  flexShrink: 0, width: 230, height: 130, borderRadius: 16,
                  border: sel ? `2px solid #E8920A` : `2px solid transparent`,
                  background: card.brand === 'Visa'
                    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)'
                    : 'linear-gradient(135deg, #3B0764 0%, #581C87 100%)',
                  padding: 14, position: 'relative', cursor: 'pointer',
                  color: '#fff', textAlign: 'left',
                  scrollSnapAlign: 'start',
                  boxShadow: sel ? '0 10px 28px -12px rgba(0,0,0,0.4)' : '0 4px 12px -4px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.15s',
                }}
              >
                {sel && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 22, height: 22, borderRadius: '50%', background: '#E8920A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{card.brand}</div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', marginTop: 22, color: 'rgba(255,255,255,0.85)' }}>
                  •••• •••• •••• <span style={{ color: '#fff', fontWeight: 600 }}>{card.last4}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '0.06em' }}>TITULAIRE</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{card.holder}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '0.06em' }}>EXP.</div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{card.expiry}</div>
                  </div>
                </div>
              </button>
            )
          })}
          <button
            type="button"
            style={{
              flexShrink: 0, width: 130, height: 130, borderRadius: 16,
              border: '1.5px dashed #E4E4E7', background: '#fff', color: '#52525B',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
            </div>
            Ajouter
          </button>
        </div>
      </div>

      {/* Digital wallets */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Paiement rapide
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePay('apple_pay')}
            disabled={!!loading}
            style={{
              flex: 1, height: 50, borderRadius: 12, border: 0, background: '#000', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 17, fontWeight: 500, cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              opacity: loading && loading !== 'apple_pay' ? 0.5 : 1,
            }}
          >
            {loading === 'apple_pay' ? (
              <Spinner />
            ) : (
              <>
                <svg viewBox="0 0 814 1000" width="18" height="18" fill="white" style={{ marginTop: -2 }}>
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-42.3-150.3-109.2c-52.2-77.5-95.2-201.1-95.2-319.1 0-177.9 116.5-272.4 231.2-272.4 60.8 0 112.4 39.8 150.3 39.8 37.8 0 96.5-42.4 165.6-42.4 26.5.1 108.2 2.9 167.9 109.5zm-234.7-181.7c31.5-37.9 54.3-90.8 54.3-143.7 0-7.4-.6-14.8-1.9-20.9-51.7 1.9-112.7 35.4-149.7 77.3-28.3 32.8-55.2 85.8-55.2 139.5 0 8.1 1.3 16.1 1.9 18.7 3.2.6 8.4 1.3 13.6 1.3 46.4 0 103.1-31.9 136.9-72.2z"/>
                </svg>
                Pay
              </>
            )}
          </m.button>
          <m.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => handlePay('google_pay')}
            disabled={!!loading}
            style={{
              flex: 1, height: 50, borderRadius: 12, border: '1px solid #E4E4E7', background: '#fff', color: '#3C4043',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              opacity: loading && loading !== 'google_pay' ? 0.5 : 1,
            }}
          >
            {loading === 'google_pay' ? (
              <Spinner color="#3C4043" />
            ) : (
              <>
                <span style={{ fontWeight: 500 }}>
                  <span style={{ color: '#4285F4' }}>G</span>
                  <span style={{ color: '#EA4335' }}>o</span>
                  <span style={{ color: '#FBBC04' }}>o</span>
                  <span style={{ color: '#4285F4' }}>g</span>
                  <span style={{ color: '#34A853' }}>l</span>
                  <span style={{ color: '#EA4335' }}>e</span>
                </span>
                Pay
              </>
            )}
          </m.button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 16 }} />

      {/* Security + CTA */}
      <div style={{ padding: '12px 20px 8px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#A1A1AA', fontSize: 11 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L1.5 3v4c0 2.5 4.5 4 4.5 4s4.5-1.5 4.5-4V3L6 1z" stroke="#A1A1AA" strokeWidth="1.2" />
          </svg>
          Paiement sécurisé · Stripe · 3D Secure
        </div>
      </div>
      <div style={{ padding: '8px 20px', paddingBottom: 'max(24px, calc(12px + env(safe-area-inset-bottom)))' }}>
        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => handlePay(selectedCard.brand.toLowerCase())}
          disabled={!!loading}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: 0,
            background: '#E8920A', color: '#fff',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            opacity: loading && loading !== selectedCard.brand.toLowerCase() ? 0.5 : 1,
          }}
        >
          {loading === selectedCard.brand.toLowerCase() ? (
            <Spinner />
          ) : (
            `Payer avec ${selectedCard.brand} ···· ${selectedCard.last4}`
          )}
        </m.button>
      </div>
    </m.div>
  )
}

function Spinner({ color = '#fff' }: { color?: string }) {
  return (
    <m.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${color}33`, borderTopColor: color,
      }}
    />
  )
}

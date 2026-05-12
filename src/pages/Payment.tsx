import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '../context/SessionContext'
import { Button } from '../components/ui/Button'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'
import { useRestaurantId } from '../hooks/useRestaurant'
import { MOCK_CARDS } from '../data/session'

// Placeholder table ID constant — will be replaced by a real Convex ID once `npx convex dev` is run
// For now, the mutation call is guarded so it only fires when restaurantId is available
const MOCK_TABLE_NUMBER = 7

export function Payment() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal, tipAmount, splitzyFee, total } = useSessionCalcs()
  const [loading, setLoading] = useState(false)

  const restaurantId = useRestaurantId()
  const createPayment = useMutation(api.payments.create)

  const selectedCard = MOCK_CARDS.find(c => c.id === state.selectedCardId) ?? MOCK_CARDS[0]

  const handlePay = async () => {
    setLoading(true)
    try {
      // Fire-and-forget: record payment in Convex when restaurant is connected
      if (restaurantId) {
        // We use a sentinel approach: pass restaurantId as tableId as well
        // since we don't have a real tableId in the client session yet.
        // Once `npx convex dev` seeds the DB, this can be replaced with
        // a real table lookup. For now the mutation is a best-effort call.
        await createPayment({
          restaurantId,
          tableId: restaurantId as unknown as string & { __tableName: "tables" },
          tableNumber: state.tableNumber ?? MOCK_TABLE_NUMBER,
          guests: state.equalSplitCount ?? 1,
          subtotalCents: subtotal,
          tipCents: tipAmount,
          commissionCents: splitzyFee,
          totalCents: total,
          paymentMethod: selectedCard.brand.toLowerCase(),
        }).catch(() => {
          // Silently fail if Convex is not connected
        })
      }
    } catch {
      // Silently fail — app works without Convex
    }
    dispatch({ type: 'CONFIRM_PAYMENT' })
    navigate('/confirmation')
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-full bg-bg"
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{ background: '#18181B' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium min-h-[44px] mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>
        <p className="text-white/60 text-sm">À régler</p>
        <p className="text-3xl font-black text-white mt-1">{formatEur(total)}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        {/* Cards section */}
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Mes cartes</p>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar py-1.5 -mx-5 px-5">
          {MOCK_CARDS.map(card => {
            const isActive = card.id === state.selectedCardId
            return (
              <motion.button
                key={card.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => dispatch({ type: 'SET_SELECTED_CARD', payload: card.id })}
                className={`
                  flex-shrink-0 w-64 h-36 rounded-2xl p-4 text-left relative overflow-hidden
                  transition-all duration-200
                  ${isActive ? 'ring-2 ring-brand' : ''}
                `}
                style={{
                  background: card.brand === 'Visa'
                    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)'
                    : 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 60%, #6930c3 100%)',
                }}
              >
                {/* Subtle circles decoration */}
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5" />

                <p className="text-white font-bold text-base relative">{card.brand}</p>
                <p className="text-white/60 text-xs mt-1 relative">···· ···· ···· {card.last4}</p>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <p className="text-white/40 text-[10px] uppercase">Titulaire</p>
                    <p className="text-white text-sm font-semibold">{card.holder}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-[10px] uppercase">Exp.</p>
                    <p className="text-white text-sm font-semibold">{card.expiry}</p>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand flex items-center justify-center">
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Digital wallets */}
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-5 mb-3">
          Paiement rapide
        </p>
        <div className="flex gap-3">
          {/* Apple Pay */}
          <button
            type="button"
            onClick={() => navigate('/confirmation')}
            className="flex-1 h-14 rounded-xl flex items-center justify-center gap-2 transition-opacity active:opacity-80"
            style={{ background: '#000' }}
          >
            <svg width="18" height="22" viewBox="0 0 814 1000" fill="white">
              <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-42.3-150.3-109.2c-52.2-77.5-95.2-201.1-95.2-319.1 0-177.9 116.5-272.4 231.2-272.4 60.8 0 112.4 39.8 150.3 39.8 37.8 0 96.5-42.4 165.6-42.4 26.5.1 108.2 2.9 167.9 109.5zm-234.7-181.7c31.5-37.9 54.3-90.8 54.3-143.7 0-7.4-.6-14.8-1.9-20.9-51.7 1.9-112.7 35.4-149.7 77.3-28.3 32.8-55.2 85.8-55.2 139.5 0 8.1 1.3 16.1 1.9 18.7 3.2.6 8.4 1.3 13.6 1.3 46.4 0 103.1-31.9 136.9-72.2z"/>
            </svg>
            <span className="text-white font-semibold text-base">Pay</span>
          </button>

          {/* Google Pay */}
          <button
            type="button"
            onClick={() => navigate('/confirmation')}
            className="flex-1 h-14 rounded-xl flex items-center justify-center gap-2 bg-white border border-border transition-opacity active:opacity-80"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-semibold text-base" style={{ color: '#3c4043' }}>Pay</span>
          </button>
        </div>

        {/* Secure mention */}
        <p className="text-center text-xs text-muted mt-4 flex items-center justify-center gap-1">
          <span>🔒</span>
          <span>Paiement sécurisé · Stripe</span>
        </p>
      </div>

      {/* CTA */}
      <div className="px-5 pb-4 safe-bottom flex-shrink-0">
        <Button
          variant="brand"
          disabled={loading}
          onClick={handlePay}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="inline-block"
              >
                ⟳
              </motion.span>
              Traitement en cours…
            </span>
          ) : (
            `Payer avec ${selectedCard.brand} ···· ${selectedCard.last4}`
          )}
        </Button>
      </div>
    </motion.div>
  )
}

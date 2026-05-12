import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { Button } from '../components/ui/Button'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'
import { MOCK_CARDS } from '../data/session'

export function Payment() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { total } = useSessionCalcs()
  const [loading, setLoading] = useState(false)

  const selectedCard = MOCK_CARDS.find(c => c.id === state.selectedCardId) ?? MOCK_CARDS[0]

  const handlePay = () => {
    setLoading(true)
    setTimeout(() => {
      dispatch({ type: 'CONFIRM_PAYMENT' })
      navigate('/confirmation')
    }, 1500)
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
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-5 px-5">
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
          {['Apple Pay', 'Google Pay'].map(wallet => (
            <button
              key={wallet}
              type="button"
              className="flex-1 h-14 bg-white border border-border rounded-xl flex items-center justify-center gap-2 font-semibold text-sm text-dark hover:bg-bg transition-colors"
            >
              {wallet === 'Apple Pay' ? '🍎' : '🅶'}
              {wallet}
            </button>
          ))}
        </div>

        {/* Secure mention */}
        <p className="text-center text-xs text-muted mt-4 flex items-center justify-center gap-1">
          <span>🔒</span>
          <span>Paiement sécurisé · Stripe</span>
        </p>
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 safe-bottom flex-shrink-0">
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

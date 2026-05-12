import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { DarkHero } from '../components/layout/DarkHero'
import { FeedbackNudge } from '../components/features/FeedbackNudge'
import { pageVariants, checkAnimation } from '../utils/animations'
import { MENU_ITEMS } from '../data/menu'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'

export function Confirmation() {
  const { state } = useSession()
  const { subtotal, tipAmount, splitzyFee, total } = useSessionCalcs()

  const selectedMenuItems = state.selectedItems.map(sel => {
    const item = MENU_ITEMS.find(m => m.id === sel.menuItemId)
    return { sel, item }
  }).filter(({ item }) => !!item)

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-full bg-bg"
    >
<DarkHero minHeight="180px" className="flex-shrink-0">
        {/* Check circle */}
        <motion.div
          variants={checkAnimation}
          initial="initial"
          animate="animate"
          className="w-16 h-16 rounded-full bg-success flex items-center justify-center mb-4"
        >
          <svg width="32" height="26" viewBox="0 0 32 26" fill="none">
            <path d="M2 13L11.5 22L30 2" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-white text-2xl font-black"
        >
          Paiement reçu !
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-white/60 text-sm mt-1"
        >
          Merci pour cette soirée
        </motion.p>
      </DarkHero>

      {/* Bill card - overlaps the hero */}
      <div className="flex-1 overflow-y-auto px-5 mt-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-card-dark overflow-hidden"
        >
          {/* Bill header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: '#18181B' }}
          >
            <div>
              <p className="text-white font-bold text-sm">{state.restaurantName}</p>
              <p className="text-white/50 text-xs">Table {state.tableNumber}</p>
            </div>
            <p className="text-white/50 text-xs">
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </p>
          </div>

          {/* Items */}
          <div className="px-4 py-3 space-y-2">
            {state.splitMode === 'item' ? (
              selectedMenuItems.map(({ sel, item }) => {
                if (!item) return null
                const linePrice = Math.round(item.price / sel.splitFactor)
                return (
                  <div key={sel.menuItemId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{item.emoji}</span>
                      <span className="text-sm text-dark truncate">{item.name}</span>
                      {sel.splitFactor > 1 && (
                        <span className="text-xs text-muted">÷{sel.splitFactor}</span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-dark">{formatEur(linePrice)}</span>
                  </div>
                )
              })
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark">
                  {state.splitMode === 'equal' ? `Part (1/${state.equalSplitCount})` : 'Montant libre'}
                </span>
                <span className="text-sm font-semibold text-dark">{formatEur(subtotal)}</span>
              </div>
            )}
          </div>

          {/* Dashed separator */}
          <div className="border-t border-dashed border-border mx-4 my-1" />

          {/* Totals */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Sous-total</span>
              <span className="font-medium text-dark">{formatEur(subtotal)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Pourboire ({state.tipPercent}%)</span>
                <span className="font-medium text-brand">+{formatEur(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted">Commission Splitzy (1,5%)</span>
              <span className="font-medium text-muted">{formatEur(splitzyFee)}</span>
            </div>
          </div>

          {/* Total payé */}
          <div
            className="px-4 py-4 flex justify-between items-center"
            style={{ background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}
          >
            <span className="font-black text-dark">Total payé</span>
            <span className="text-2xl font-black text-dark">{formatEur(total)}</span>
          </div>
        </motion.div>

        {/* Feedback nudge */}
        <div className="mt-5">
          <FeedbackNudge />
        </div>
      </div>
    </motion.div>
  )
}

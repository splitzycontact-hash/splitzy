import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { Button } from '../components/ui/Button'
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
        <p className="text-white/60 text-sm font-medium">Tu paies</p>
        <motion.p
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
          className="text-4xl font-black text-white mt-1"
        >
          {formatEur(subtotal)}
        </motion.p>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Items */}
          <div className="px-4 py-3 space-y-3">
            {state.splitMode === 'item' ? (
              selectedMenuItems.map(({ sel, item }) => {
                if (!item) return null
                const linePrice = Math.round(item.price / sel.splitFactor)
                return (
                  <div key={sel.menuItemId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">{item.name}</p>
                        {sel.splitFactor > 1 && (
                          <p className="text-xs text-muted">Partagé ÷{sel.splitFactor}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-dark flex-shrink-0">{formatEur(linePrice)}</span>
                  </div>
                )
              })
            ) : state.splitMode === 'equal' ? (
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-dark">Part égale (1/{state.equalSplitCount})</p>
                <span className="text-sm font-bold text-dark">{formatEur(subtotal)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-dark">Montant libre</p>
                <span className="text-sm font-bold text-dark">{formatEur(subtotal)}</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-dashed border-border mx-4 my-2" />

          {/* Subtotals */}
          <div className="px-4 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Sous-total</span>
              <span className="text-sm font-semibold text-dark">{formatEur(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Service inclus</span>
              <span className="text-xs text-muted">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Commission Splitzy (1,5%)</span>
              <span className="text-xs text-muted">{formatEur(splitzyFee)}</span>
            </div>
          </div>

          {/* Total */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: '#F9FAFB' }}
          >
            <span className="font-bold text-dark">Total</span>
            <span className="text-xl font-black text-dark">{formatEur(subtotal)}</span>
          </div>
        </div>

        {/* Modify link */}
        <button
          type="button"
          onClick={() => navigate(-2)}
          className="mt-4 w-full text-center text-sm text-brand font-semibold py-3 min-h-[44px]"
        >
          Modifier ma sélection
        </button>
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 safe-bottom flex-shrink-0">
        <Button variant="brand" onClick={() => navigate('/tip')}>
          Ajouter un pourboire
        </Button>
      </div>
    </motion.div>
  )
}

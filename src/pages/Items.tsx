import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { Pill } from '../components/ui/Pill'
import { ItemRow } from '../components/features/ItemRow'
import { SplitStrip } from '../components/features/SplitStrip'
import { Button } from '../components/ui/Button'
import { pageVariants, slideDown } from '../utils/animations'
import { MENU_ITEMS } from '../data/menu'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'
import { TABLE_TOTAL_CENTS } from '../data/session'
type Category = 'entrees' | 'plats' | 'desserts' | 'boissons'

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'entrees', label: 'Entrées', emoji: '🥗' },
  { id: 'plats', label: 'Plats', emoji: '🍽' },
  { id: 'desserts', label: 'Desserts', emoji: '🍮' },
  { id: 'boissons', label: 'Boissons', emoji: '🥤' },
]

export function Items() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal } = useSessionCalcs()
  const [openCategories, setOpenCategories] = useState<Set<Category>>(new Set(['entrees', 'plats']))

  const toggleCategory = (cat: Category) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const isSelected = (itemId: string) =>
    state.selectedItems.some(i => i.menuItemId === itemId)

  const selectedCount = state.selectedItems.length

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
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium min-h-[44px]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
          <h1 className="text-white font-bold text-base">Mes articles</h1>
          <div className="w-16" />
        </div>

        {/* Mode pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <Pill
            label="🍽 Par article"
            active={state.splitMode === 'item'}
            onClick={() => dispatch({ type: 'SET_SPLIT_MODE', payload: 'item' })}
          />
          <Pill
            label="⚖️ Parts égales"
            active={state.splitMode === 'equal'}
            onClick={() => dispatch({ type: 'SET_SPLIT_MODE', payload: 'equal' })}
          />
          <Pill
            label="💶 Montant libre"
            active={state.splitMode === 'custom'}
            onClick={() => dispatch({ type: 'SET_SPLIT_MODE', payload: 'custom' })}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-4">
        {state.splitMode === 'item' && (
          <div className="px-3 pt-3 space-y-2">
            {CATEGORIES.map(cat => {
              const items = MENU_ITEMS.filter(m => m.category === cat.id)
              const isOpen = openCategories.has(cat.id)
              return (
                <div key={cat.id} className="bg-white rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-4 py-3 min-h-[48px]"
                  >
                    <span className="font-bold text-dark text-sm">
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="text-muted text-sm">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        variants={slideDown}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="overflow-hidden"
                      >
                        <div className="px-2 pb-2 space-y-1">
                          {items.map(item => (
                            <div key={item.id}>
                              <ItemRow
                                item={item}
                                selected={isSelected(item.id)}
                                onToggle={() => dispatch({ type: 'TOGGLE_ITEM', payload: item.id })}
                              />
                              {isSelected(item.id) && !item.takenBy && (
                                <SplitStrip itemId={item.id} itemPrice={item.price} />
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}

        {state.splitMode === 'equal' && (
          <EqualSplitMode />
        )}

        {state.splitMode === 'custom' && (
          <CustomAmountMode />
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-border px-5 pt-3 pb-8 safe-bottom">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted font-medium">Ma part</p>
            {state.splitMode === 'item' && (
              <p className="text-xs text-muted">{selectedCount} article{selectedCount !== 1 ? 's' : ''}</p>
            )}
          </div>
          <span className="text-xl font-black text-brand">{formatEur(subtotal)}</span>
        </div>
        <Button
          variant="brand"
          disabled={subtotal === 0}
          onClick={() => navigate('/recap')}
        >
          Valider ma part
        </Button>
      </div>
    </motion.div>
  )
}

function EqualSplitMode() {
  const { state, dispatch } = useSession()
  const perPerson = Math.round(TABLE_TOTAL_CENTS / state.equalSplitCount)

  return (
    <div className="px-5 pt-6 flex flex-col items-center">
      <div className="bg-white rounded-2xl p-6 w-full text-center shadow-card">
        <p className="text-sm text-muted font-medium mb-1">Total de la table</p>
        <p className="text-3xl font-black text-dark mb-6">{formatEur(TABLE_TOTAL_CENTS)}</p>

        <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">
          Nombre de personnes
        </p>

        <div className="flex items-center justify-center gap-5 mb-6">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_EQUAL_SPLIT_COUNT', payload: Math.max(1, state.equalSplitCount - 1) })}
            className="w-12 h-12 rounded-full bg-bg border border-border text-2xl font-bold flex items-center justify-center"
          >
            −
          </button>
          <span className="text-4xl font-black text-dark w-12 text-center">{state.equalSplitCount}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_EQUAL_SPLIT_COUNT', payload: Math.min(8, state.equalSplitCount + 1) })}
            className="w-12 h-12 rounded-full bg-bg border border-border text-2xl font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>

        <div className="bg-brand-bg rounded-xl py-3">
          <p className="text-xs text-brand font-semibold mb-1">Ta part</p>
          <p className="text-3xl font-black text-brand">{formatEur(perPerson)}</p>
        </div>
      </div>
    </div>
  )
}

function CustomAmountMode() {
  const { state, dispatch } = useSession()
  const [inputVal, setInputVal] = useState(
    state.customAmount > 0 ? (state.customAmount / 100).toString() : ''
  )

  const handleChange = (val: string) => {
    setInputVal(val)
    const num = parseFloat(val.replace(',', '.'))
    if (!isNaN(num) && num >= 0) {
      dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: Math.round(num * 100) })
    } else {
      dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: 0 })
    }
  }

  return (
    <div className="px-5 pt-10 flex flex-col items-center">
      <p className="text-sm text-muted font-medium mb-2">Saisis le montant que tu souhaites payer</p>
      <div className="flex items-center gap-2 mt-4">
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          value={inputVal}
          onChange={e => handleChange(e.target.value)}
          placeholder="0,00"
          className="text-5xl font-black text-dark text-center outline-none bg-transparent w-40 border-b-2 border-brand"
        />
        <span className="text-4xl font-black text-muted">€</span>
      </div>
      <p className="text-xs text-muted mt-4">Total table : {formatEur(TABLE_TOTAL_CENTS)}</p>
    </div>
  )
}

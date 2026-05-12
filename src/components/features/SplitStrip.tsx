import { useSession } from '../../context/SessionContext'
import { formatEur } from '../../utils/formatCurrency'

interface SplitStripProps {
  itemId: string
  itemPrice: number
}

const FACTORS = [1, 2, 3, 4] as const

export function SplitStrip({ itemId, itemPrice }: SplitStripProps) {
  const { state, dispatch } = useSession()

  const sel = state.selectedItems.find(i => i.menuItemId === itemId)
  const currentFactor = sel?.splitFactor ?? 1

  return (
    <div className="flex items-center gap-1 mt-1.5 pl-9">
      <span className="text-xs text-muted mr-1">Partager :</span>
      {FACTORS.map(f => (
        <button
          key={f}
          type="button"
          onClick={() => dispatch({ type: 'SET_ITEM_SPLIT', payload: { itemId, factor: f } })}
          className={`
            w-8 h-7 rounded text-xs font-semibold transition-colors
            ${currentFactor === f ? 'bg-brand text-white' : 'bg-border text-mid hover:bg-gray-200'}
          `}
        >
          ÷{f}
        </button>
      ))}
      <span className="ml-auto text-xs font-bold text-brand">
        = {formatEur(Math.round(itemPrice / currentFactor))}
      </span>
    </div>
  )
}

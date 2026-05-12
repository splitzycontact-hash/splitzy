import type { MenuItem } from '../../context/types'
import { Checkbox } from '../ui/Checkbox'
import { Avatar } from '../ui/Avatar'
import { formatEur } from '../../utils/formatCurrency'

interface ItemRowProps {
  item: MenuItem
  selected: boolean
  onToggle: () => void
}

const BADGE_LABELS: Record<string, string> = {
  signature: '✨ Signature',
  vegetarian: '🌿',
  seasonal: '🍂',
  spicy: '🌶️',
}

export function ItemRow({ item, selected, onToggle }: ItemRowProps) {
  const isTaken = !!item.takenBy

  return (
    <button
      type="button"
      onClick={isTaken ? undefined : onToggle}
      disabled={isTaken}
      className={`
        w-full flex items-center gap-3 p-3 rounded-xl text-left
        transition-colors duration-150
        ${isTaken ? 'opacity-60 cursor-not-allowed bg-bg' : 'bg-white hover:bg-brand-bg cursor-pointer'}
        ${selected ? 'ring-1 ring-brand bg-brand-bg' : ''}
      `}
    >
      <Checkbox checked={selected && !isTaken} disabled={isTaken} />

      <span className="text-2xl flex-shrink-0">{item.emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-dark truncate">{item.name}</span>
          {item.badges?.map(b => (
            <span key={b} className="text-xs">{BADGE_LABELS[b] ?? b}</span>
          ))}
        </div>
        <p className="text-xs text-muted mt-0.5 line-clamp-1">{item.description}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isTaken && item.takenBy && (
          <Avatar index={item.takenBy.avatarIndex} size="sm" />
        )}
        <span className={`text-sm font-bold ${selected ? 'text-brand' : 'text-dark'}`}>
          {formatEur(item.price)}
        </span>
      </div>
    </button>
  )
}

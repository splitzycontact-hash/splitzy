import { useSession } from '../context/SessionContext'
import { MENU_ITEMS } from '../data/menu'
import { TABLE_TOTAL_CENTS } from '../data/session'

export function useSessionCalcs() {
  const { state } = useSession()

  let subtotal = 0

  if (state.splitMode === 'item') {
    subtotal = state.selectedItems.reduce((acc, sel) => {
      const item = MENU_ITEMS.find(m => m.id === sel.menuItemId)
      if (!item) return acc
      return acc + Math.round(item.price / sel.splitFactor)
    }, 0)
  } else if (state.splitMode === 'equal') {
    subtotal = Math.round(TABLE_TOTAL_CENTS / state.equalSplitCount)
  } else if (state.splitMode === 'custom') {
    subtotal = state.customAmount
  }

  const tipAmount = Math.round(subtotal * state.tipPercent / 100)
  const splitzyFee = Math.round(subtotal * 0.015)
  const total = subtotal + tipAmount

  return { subtotal, tipAmount, splitzyFee, total }
}

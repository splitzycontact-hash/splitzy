import { useSession } from '../context/SessionContext'

export function useSessionCalcs() {
  const { state } = useSession()

  let subtotal = 0

  if (state.splitMode === 'item') {
    subtotal = state.selectedItems.reduce((acc, sel) => {
      return acc + Math.round(sel.priceCents / sel.splitFactor)
    }, 0)
  } else if (state.splitMode === 'equal') {
    subtotal = Math.round(state.tableTotalCents / state.equalSplitCount)
  } else if (state.splitMode === 'custom') {
    subtotal = state.customAmount
  }

  const tipAmount = Math.round(subtotal * state.tipPercent / 100)
  const splitzyFee = Math.round(subtotal * 0.015)
  const total = subtotal + tipAmount

  return { subtotal, tipAmount, splitzyFee, total }
}

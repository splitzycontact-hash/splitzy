import { useQuery } from 'convex/react'
import { useSession } from '../context/SessionContext'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// Calculs dérivés de la session courante. Abonne aussi la page à la table
// Convex pour que `paidCents` / `amountCents` soient toujours frais.
//
// En mode "parts égales", on partage le **restant** à payer (bill − paid)
// plutôt que le total initial. Sinon, à chaque nouveau client qui arrive sur
// une table partiellement payée, on lui demanderait sa part du total complet
// — il paierait à nouveau ce que ses amis ont déjà réglé.
export function useSessionCalcs() {
  const { state } = useSession()

  const liveTable = useQuery(
    api.tables.getOne,
    state.convexTableId ? { tableId: state.convexTableId as Id<'tables'> } : 'skip',
  )

  const billCents = liveTable?.amountCents ?? state.tableTotalCents
  const paidCents = liveTable?.paidCents ?? 0
  const remainingCents = Math.max(0, billCents - paidCents)
  const isFullyPaid = billCents > 0 && remainingCents === 0

  let subtotal = 0

  if (state.splitMode === 'item') {
    subtotal = state.selectedItems.reduce((acc, sel) => {
      return acc + Math.round(sel.priceCents / sel.splitFactor)
    }, 0)
  } else if (state.splitMode === 'equal') {
    subtotal = state.equalSplitCount > 0
      ? Math.round(remainingCents / state.equalSplitCount)
      : 0
  } else if (state.splitMode === 'custom') {
    subtotal = state.customAmount
  }

  const tipAmount = Math.round(subtotal * state.tipPercent / 100)
  const splitzyFee = Math.round(subtotal * 0.015)
  const total = subtotal + tipAmount

  return {
    subtotal,
    tipAmount,
    splitzyFee,
    total,
    billCents,
    paidCents,
    remainingCents,
    isFullyPaid,
    liveTable,
  }
}

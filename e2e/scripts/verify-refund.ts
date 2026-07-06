/**
 * GOAL_PAIEMENTS_06 §6 — Remboursement.
 * Inverse comptable via appliedAllocation : l'unité repasse non payée, le
 * total table redescend, et le statut passe de `paid` à `payment` DANS LA
 * MÊME mutation (compteur + état, jamais l'un sans l'autre).
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-refund.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, confirm, convexRun, getTable, listPayments, order,
  report, unit, SKEW_MS,
} from './lib-paiements'

const t0 = Date.now() - SKEW_MS
const t = order([
  { name: 'Plat', qty: 1, unitCents: 2600 },
  { name: 'Dessert', qty: 1, unitCents: 800 },
])
const plat = unit(t, 'Plat')
const dessert = unit(t, 'Dessert')

// Deux paiements distincts pour solder la table.
const REF1 = randomUUID()
const r1 = convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2600, tipCents: 200, totalCents: 2800, firstName: 'P1',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF1,
  allocation: [{ lineId: plat.lineId, amountCents: 2600 }],
}) as { paymentId: string }
confirm(REF1, 2800)
const REF2 = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 800, totalCents: 800, firstName: 'P2',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF2,
  allocation: [{ lineId: dessert.lineId, amountCents: 800 }],
})
confirm(REF2, 800)
check('table soldée avant remboursement', [getTable().status, getTable().paidCents, getTable().paidTipCents], ['paid', 3400, 200])

// ── Remboursement du 1er paiement (dashboard gérant) ─────────────────────────
convexRun('payments:updateStatus', { paymentId: r1.paymentId, status: 'Remboursé' }, { asOwner: true })
{
  const now = getTable()
  const p = unit(now, 'Plat')
  const d = unit(now, 'Dessert')
  check('unité remboursée repasse non payée', [p.paid, p.paidCents], [false, 0])
  check('unité NON remboursée intacte', [d.paid, d.paidCents], [true, 800])
  check('total table débité du paiement remboursé', now.paidCents, 800)
  check('pourboire débité aussi', now.paidTipCents, 0)
  check('statut redescendu paid → payment (même mutation)', now.status, 'payment')
  const pmt = listPayments(t0).find(x => x._id === r1.paymentId)
  check('paiement marqué Remboursé', pmt?.status, 'Remboursé')
}

// Rejouer le remboursement ne doit pas double-débiter (transition déjà faite).
convexRun('payments:updateStatus', { paymentId: r1.paymentId, status: 'Remboursé' }, { asOwner: true })
check('rejeu du remboursement : aucun double débit', [getTable().paidCents, getTable().status], [800, 'payment'])

report()

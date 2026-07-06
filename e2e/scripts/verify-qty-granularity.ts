/**
 * GOAL_PAIEMENTS_06 §12 — Granularité à l'unité.
 * `2×Pizza` (fabrique → 2 unités qty 1, lineId distincts) : deux convives
 * réclament et paient chacun LEUR pizza indépendamment — aucune régression
 * par rapport à l'éclatement par qty historique d'Items.tsx.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-qty-granularity.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, order, report, unit,
} from './lib-paiements'

const t = order([{ name: 'Pizza', qty: 2, unitCents: 1300 }])
const p1 = unit(t, 'Pizza', 0)
const p2 = unit(t, 'Pizza', 1)
check('2×Pizza → 2 unités qty 1', [(t.orderItems ?? []).length, p1.qty, p2.qty], [2, 1, 1])
check('lineId distincts par unité', p1.lineId !== p2.lineId && !!p1.lineId, true)

// Convive A réclame et paie SA pizza.
const partA = claim(p1.lineId!, 1300, 'A')
const REF_A = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 1300, totalCents: 1300, firstName: 'A',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF_A,
  allocation: [{ lineId: p1.lineId, amountCents: 1300 }],
  parts: [{ lineId: p1.lineId, partId: partA.partId }],
})
confirm(REF_A, 1300)
{
  const now = getTable()
  check('pizza de A payée', [unit(now, 'Pizza', 0).paid, unit(now, 'Pizza', 0).paidCents], [true, 1300])
  check('pizza de B toujours libre et impayée', [unit(now, 'Pizza', 1).paid ?? false, (unit(now, 'Pizza', 1).holds ?? []).length], [false, 0])
}

// Convive B réclame et paie la sienne, indépendamment.
const partB = claim(p2.lineId!, 1300, 'B')
const REF_B = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 1300, totalCents: 1300, firstName: 'B',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF_B,
  allocation: [{ lineId: p2.lineId, amountCents: 1300 }],
  parts: [{ lineId: p2.lineId, partId: partB.partId }],
})
confirm(REF_B, 1300)
{
  const now = getTable()
  check('les deux unités payées indépendamment', [unit(now, 'Pizza', 0).paidCents, unit(now, 'Pizza', 1).paidCents], [1300, 1300])
  check('table soldée', [now.paidCents, now.status], [2600, 'paid'])
}

report()

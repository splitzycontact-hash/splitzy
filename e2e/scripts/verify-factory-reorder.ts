/**
 * GOAL_PAIEMENTS_06 §15 — Fabrique et recommande du même article.
 * Le gérant recommande un article déjà présent (porteur d'un hold actif ou de
 * paidCents > 0) → la nouvelle unité reçoit TOUJOURS un lineId neuf — jamais
 * un incrément du qty de l'unité existante (règle non négociable de la
 * fabrique, GOAL_01).
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-factory-reorder.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, order, report,
  unit, TABLE,
} from './lib-paiements'

// ── 1. Recommande d'un article porteur d'un HOLD actif ───────────────────────
const t = order([{ name: 'Coca', qty: 1, unitCents: 400 }])
const coca1 = unit(t, 'Coca')
const partA = claim(coca1.lineId!, 400, 'A')
convexRun('tables:addOrderItems', { tableId: TABLE.id, items: [{ name: 'Coca', qty: 1, unitCents: 400 }] }, { asOwner: true })
{
  const now = getTable()
  const cocas = (now.orderItems ?? []).filter(l => l.name === 'Coca')
  check('1. recommande → 2 unités distinctes (pas d\'incrément qty)', [cocas.length, cocas[0]?.qty, cocas[1]?.qty], [2, 1, 1])
  check('1. lineId neuf pour la nouvelle unité', cocas[0]?.lineId !== cocas[1]?.lineId && !!cocas[1]?.lineId, true)
  const held = cocas.find(l => l.lineId === coca1.lineId)
  const fresh = cocas.find(l => l.lineId !== coca1.lineId)
  check('1. hold de A intact sur l\'ancienne unité', [held?.holds?.length, held?.holds?.[0]?.partId === partA.partId], [1, true])
  check('1. nouvelle unité vierge (libre, sans hold, paidCents 0)', [fresh?.holds?.length, fresh?.paidCents], [0, 0])
  check('1. note incrémentée du montant ajouté', now.amountCents, 800)
}

// ── 2. Recommande d'un article partiellement PAYÉ ────────────────────────────
const t2 = order([{ name: 'Carafe', qty: 1, unitCents: 1200 }])
const carafe1 = unit(t2, 'Carafe')
const REF = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 600, totalCents: 600, firstName: 'Moitie',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
  allocation: [{ lineId: carafe1.lineId, amountCents: 600 }],
})
confirm(REF, 600)
check('2. carafe partiellement payée (600/1200)', unit(getTable(), 'Carafe').paidCents, 600)
convexRun('tables:addOrderItems', { tableId: TABLE.id, items: [{ name: 'Carafe', qty: 1, unitCents: 1200 }] }, { asOwner: true })
{
  const now = getTable()
  const carafes = (now.orderItems ?? []).filter(l => l.name === 'Carafe')
  check('2. 2 unités, jamais de fusion avec l\'unité engagée', [carafes.length, carafes[0]?.qty, carafes[1]?.qty], [2, 1, 1])
  const old = carafes.find(l => l.lineId === carafe1.lineId)
  const fresh = carafes.find(l => l.lineId !== carafe1.lineId)
  check('2. paidCents de l\'ancienne unité préservé', old?.paidCents, 600)
  check('2. nouvelle unité vierge avec lineId neuf', [!!fresh?.lineId, fresh?.paidCents], [true, 0])
  check('2. note passée à 2400, argent encaissé intact', [now.amountCents, now.paidCents], [2400, 600])
}

report()

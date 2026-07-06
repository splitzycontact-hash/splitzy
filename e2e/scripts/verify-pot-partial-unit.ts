/**
 * GOAL_PAIEMENTS_06 §14 — Pot commun sur unité partiellement réclamée.
 * Une unité ÷2 dont SEULE la moitié de A est réclamée (hold actif, non payée) :
 * un paiement « montant libre » d'un tiers ne ventile que sur la moitié
 * encore libre de cette unité (et les autres unités libres) — JAMAIS sur la
 * portion tenue par le hold de A.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-pot-partial-unit.ts
 */
import { randomUUID } from 'node:crypto'
import {
  allocPairs, baseArgs, check, claim, confirm, convexRun, getTable,
  listPayments, order, report, unit, SKEW_MS,
} from './lib-paiements'

const t0 = Date.now() - SKEW_MS
const t = order([
  { name: 'Pizza XXL', qty: 1, unitCents: 2400 }, // ÷2 : A tient une moitié
  { name: 'Salade', qty: 1, unitCents: 1000 },
]) // note 3400
const pizza = unit(t, 'Pizza XXL')
const salade = unit(t, 'Salade')

// A réclame SA moitié (hold actif, rien de payé).
const partA = claim(pizza.lineId!, 1200, 'A')
check('moitié de A réclamée (reste 1200 libre)', partA.remainingCents, 1200)

// Tiers convive : montant libre 2200 = absorbante exacte (3400 − 1200 tenu).
const REF = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2200, totalCents: 2200, firstName: 'Tiers',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
})
confirm(REF, 2200)

{
  const now = getTable()
  const p = unit(now, 'Pizza XXL')
  const s = unit(now, 'Salade')
  // Ventilation plus grand reste sur capacité LIBRE : pizza libre 1200 ≥
  // salade 1000 → pizza 1200 puis salade 1000. La moitié de A jamais touchée.
  check('pizza : seule la moitié LIBRE couverte (1200, pas 2400)', [p.paidCents, p.paid], [1200, false])
  check('salade couverte', [s.paidCents, s.paid], [1000, true])
  const pmt = listPayments(t0).find(x => x.firstName === 'Tiers')
  check('appliedAllocation : moitié libre + salade, rien d\'autre',
    allocPairs(pmt),
    ([[pizza.lineId!, 1200], [salade.lineId!, 1000]] as [string, number][]).sort((a, b) => a[0].localeCompare(b[0])))
  check('hold de A toujours actif et intact', [p.holds?.length, p.holds?.[0]?.partId === partA.partId, p.holds?.[0]?.capacityCents], [1, true, 1200])
  check('aucun excédent (le plafond absorbant a fait son travail)', pmt?.overflowCents, undefined)
}

report()

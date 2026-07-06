/**
 * GOAL_PAIEMENTS_06 §11 — Partage fractionné d'une unité (splitFactor).
 * Une unité ÷2 payée par deux convives à des moments différents devient
 * `payé` SANS attendre que la table soit à 100 % (corrige le bug prod du
 * bulk-flip). 3ᵉ réclamation sur unité pleine → refus propre. Expiration
 * d'une part → ne touche pas les autres parts de la même unité.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-split-factor.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, order, report,
  sleep, unit,
} from './lib-paiements'

const t = order([
  { name: 'Côte de bœuf', qty: 1, unitCents: 4800 }, // partagée ÷2
  { name: 'Garniture', qty: 1, unitCents: 900 },      // reste impayée (table < 100 %)
])
const cote = unit(t, 'Côte de bœuf')

// ── A paie sa moitié ──────────────────────────────────────────────────────────
const partA = claim(cote.lineId!, 2400, 'A')
const REF_A = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'A',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF_A,
  allocation: [{ lineId: cote.lineId, amountCents: 2400 }],
  parts: [{ lineId: cote.lineId, partId: partA.partId }],
})
confirm(REF_A, 2400)
{
  const c = unit(getTable(), 'Côte de bœuf')
  check('moitié A réglée : unité PAS encore payée', [c.paidCents, c.paid], [2400, false])
}

// ── B réclame sa moitié plus tard (coexistence différée) et paie ─────────────
const partB = claim(cote.lineId!, 2400, 'B')
check('part B posée après le paiement de A (restant 0)', partB.remainingCents, 0)
const REF_B = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'B',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF_B,
  allocation: [{ lineId: cote.lineId, amountCents: 2400 }],
  parts: [{ lineId: cote.lineId, partId: partB.partId }],
})
confirm(REF_B, 2400)
{
  const now = getTable()
  const c = unit(now, 'Côte de bœuf')
  check('unité payée dès que ses parts couvrent son prix', [c.paidCents, c.paid], [4800, true])
  check('SANS attendre la table à 100 % (garniture impayée)', [now.status, unit(now, 'Garniture').paid ?? false], ['payment', false])
}

// ── 3ᵉ réclamation sur unité pleine → refus propre ───────────────────────────
let rejected = false
try { claim(cote.lineId!, 100, 'C') } catch (e) { rejected = String(e).includes('CAPACITY_EXCEEDED') }
check('3ᵉ réclamation sur unité pleine refusée proprement', rejected, true)

// ── Expiration d'une part : les autres parts de la même unité intactes ───────
const t2 = order([{ name: 'Plateau', qty: 1, unitCents: 3000 }])
const plateau = unit(t2, 'Plateau')
const partX = claim(plateau.lineId!, 1500, 'X', 2000) // expire vite
const partY = claim(plateau.lineId!, 1500, 'Y')        // TTL normal 5 min
await sleep(5000)
{
  const p = unit(getTable(), 'Plateau')
  check('part X expirée : SA capacité seule libérée', p.holds?.some(h => h.partId === partX.partId), false)
  check('part Y intacte', [p.holds?.length, p.holds?.[0]?.partId === partY.partId], [1, true])
}

report()

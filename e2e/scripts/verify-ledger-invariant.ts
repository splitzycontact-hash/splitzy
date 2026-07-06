/**
 * GOAL_PAIEMENTS_06 §1 — Invariant grand livre.
 * Trois modes mélangés sur une même table : par article (allocation), montant
 * libre puis solde (pot commun, plus grand reste). Assertions : aucune unité
 * marquée payée sans argent réel la couvrant ; ventilation déterministe et
 * exacte au centime ; compteur table = Σ paiements confirmés.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-ledger-invariant.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, allocPairs, check, claim, confirm, convexRun, getTable,
  listPayments, order, report, unit, SKEW_MS,
} from './lib-paiements'

// Tag unique par run : l'invariant final somme les allocations de CE run
// seulement (un run précédent < 60 s (SKEW) polluerait le filtre temporel).
const RUN = randomUUID().slice(0, 8)
const t0 = Date.now() - SKEW_MS
const t = order([
  { name: 'Entrecôte', qty: 1, unitCents: 2400 },
  { name: 'Risotto', qty: 1, unitCents: 1000 },
  { name: 'Vin', qty: 2, unitCents: 700 },
]) // note 4800, 4 unités
const entrecote = unit(t, 'Entrecôte')
const risotto = unit(t, 'Risotto')
const vin1 = unit(t, 'Vin', 0)
const vin2 = unit(t, 'Vin', 1)

// ── Convive 1 : par article (réclame + allocation explicite) ─────────────────
const part = claim(entrecote.lineId!, 2400, 'C1')
const REF1 = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: `C1-${RUN}`,
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF1,
  allocation: [{ lineId: entrecote.lineId, amountCents: 2400 }],
  parts: [{ lineId: entrecote.lineId, partId: part.partId }],
})
confirm(REF1, 2400)
{
  const now = getTable()
  const e = unit(now, 'Entrecôte')
  check('C1 : entrecôte payée exactement', [e.paidCents, e.paid], [2400, true])
  check('C1 : autres unités à 0 (pas de bulk-flip)', [unit(now, 'Risotto').paidCents ?? 0, unit(now, 'Vin', 0).paidCents ?? 0], [0, 0])
}

// ── Convive 2 : montant libre 900 → plus grand reste (Risotto 1000 en tête) ──
const REF2 = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 900, totalCents: 900, firstName: `C2-${RUN}`,
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF2,
})
confirm(REF2, 900)
{
  const now = getTable()
  const r = unit(now, 'Risotto')
  check('C2 : 900 ventilés sur le plus grand reste (Risotto)', [r.paidCents, r.paid], [900, false])
  check('C2 : risotto PAS marqué payé (900 < 1000)', r.paid, false)
  const p2 = listPayments(t0).find(p => p.firstName === `C2-${RUN}`)
  check('C2 : appliedAllocation exacte au centime', allocPairs(p2), [[risotto.lineId!, 900]])
}

// ── Convive 3 : solde (1500) → Vin 700 + Vin 700 + Risotto 100 ───────────────
const REF3 = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 1500, totalCents: 1500, firstName: `C3-${RUN}`,
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF3,
})
confirm(REF3, 1500)
{
  const now = getTable()
  check('C3 : table soldée exactement', [now.paidCents, now.status], [4800, 'paid'])
  for (const [label, l] of [['Entrecôte', unit(now, 'Entrecôte')], ['Risotto', unit(now, 'Risotto')], ['Vin1', unit(now, 'Vin', 0)], ['Vin2', unit(now, 'Vin', 1)]] as const) {
    check(`invariant : ${label} payée = son prix, jamais plus`, [l.paidCents, l.paid], [l.qty * l.unitCents, true])
  }
  const p3 = listPayments(t0).find(p => p.firstName === `C3-${RUN}`)
  check('C3 : ventilation déterministe (2 vins pleins + reste risotto)',
    allocPairs(p3), ([[vin1.lineId!, 700], [vin2.lineId!, 700], [risotto.lineId!, 100]] as [string, number][]).sort((a, b) => a[0].localeCompare(b[0])))
  check('aucun excédent non tracé', p3?.overflowCents, undefined)
  // Invariant global : Σ appliedAllocation de tous les paiements = Σ paidCents lignes = paidCents table.
  const all = listPayments(t0).filter(p => p.status === 'Encaissé' && [`C1-${RUN}`, `C2-${RUN}`, `C3-${RUN}`].includes(p.firstName ?? ''))
  const sumApplied = all.reduce((s, p) => s + (p.appliedAllocation ?? []).reduce((x, a) => x + a.amountCents, 0), 0)
  const sumLines = (now.orderItems ?? []).reduce((s, l) => s + (l.paidCents ?? 0), 0)
  check('invariant : Σ allocations = Σ lignes = compteur table', [sumApplied, sumLines, now.paidCents], [4800, 4800, 4800])
}

report()

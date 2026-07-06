/**
 * GOAL_PAIEMENTS_06 §10 — Coexistence pendant la bascule (LE plus critique).
 * Sur la MÊME table, un client « ancien contrat » (sans idempotencyKey,
 * aveugle aux holds) et un client « nouveau contrat » (réclamation + hold),
 * paiements entrelacés (création croisée, confirmations dans l'ordre inverse).
 * Assertions : total encaissé exact, aucune unité payée au-delà de son prix,
 * aucun double-encaissement, invariant grand livre respecté.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-coexistence-migration.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, listPayments,
  order, report, unit, SKEW_MS,
} from './lib-paiements'

const RUN = randomUUID().slice(0, 8) // isolation inter-runs (fenêtre SKEW)
const t0 = Date.now() - SKEW_MS
const t = order([
  { name: 'Pizza', qty: 2, unitCents: 1300 },
  { name: 'Pâtes', qty: 1, unitCents: 1600 },
  { name: 'Vin', qty: 1, unitCents: 700 },
]) // note 4900, unités : Pizza, Pizza, Pâtes, Vin
const pizza1 = unit(t, 'Pizza', 0)
const pizza2 = unit(t, 'Pizza', 1)
const pates = unit(t, 'Pâtes')
const vin = unit(t, 'Vin')

// ── Entrelacement : NOUVEAU crée (hold gelé) → LEGACY crée (aveugle aux
// holds, vise la même pizza par NOM) → confirmation du legacy D'ABORD.
const partNew = claim(pizza1.lineId!, 1300, 'Nouveau')
const REF_NEW = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 1300, totalCents: 1300, firstName: `Nouveau-${RUN}`,
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF_NEW,
  allocation: [{ lineId: pizza1.lineId, amountCents: 1300 }],
  parts: [{ lineId: pizza1.lineId, partId: partNew.partId }],
})
const REF_LEG = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2000, totalCents: 2000, firstName: `Legacy-${RUN}`,
  provider: 'square', providerRef: REF_LEG,
  paidItemNames: ['Pizza', 'Vin'], // traverse la réclamation (confort, pas verrou)
})
confirm(REF_LEG, 2000) // le legacy confirme AVANT le nouveau
confirm(REF_NEW, 1300)

{
  const now = getTable()
  const p1 = unit(now, 'Pizza', 0)
  const p2 = unit(now, 'Pizza', 1)
  const v = unit(now, 'Vin')
  // Chaque pizza payée UNE fois — le legacy (par nom) et le nouveau (par
  // lineId) ne se sont pas double-encaissés sur la même unité.
  check('chaque pizza payée exactement une fois', [p1.paidCents, p2.paidCents], [1300, 1300])
  check('aucune unité au-delà de son prix', (now.orderItems ?? []).every(l => (l.paidCents ?? 0) <= l.qty * l.unitCents), true)
  check('vin payé par le legacy', [v.paid, v.paidCents], [true, 700])
  check('pâtes intactes', [unit(now, 'Pâtes').paid ?? false, unit(now, 'Pâtes').paidCents ?? 0], [false, 0])
  check('total encaissé exact (1300 + 2000)', now.paidCents, 3300)
  check('hold du nouveau consommé, plus rien d\'actif', (now.orderItems ?? []).every(l => (l.holds ?? []).length === 0), true)
}

// ── Le legacy solde le reste (pot commun) pendant que tout est mélangé ───────
const REF_END = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 1600, totalCents: 1600, firstName: `LegacyFin-${RUN}`,
  provider: 'square', providerRef: REF_END,
})
confirm(REF_END, 1600)
{
  const now = getTable()
  check('table soldée, statut cohérent', [now.paidCents, now.status], [4900, 'paid'])
  // Invariant grand livre final : Σ allocations = Σ lignes = compteur.
  const paids = listPayments(t0).filter(p => p.status === 'Encaissé' && [`Nouveau-${RUN}`, `Legacy-${RUN}`, `LegacyFin-${RUN}`].includes(p.firstName ?? ''))
  const sumApplied = paids.reduce((s, p) => s + (p.appliedAllocation ?? []).reduce((x, a) => x + a.amountCents, 0), 0)
  const sumLines = (now.orderItems ?? []).reduce((s, l) => s + (l.paidCents ?? 0), 0)
  check('invariant grand livre (Σ allocations = Σ lignes = compteur)', [sumApplied, sumLines, now.paidCents], [4900, 4900, 4900])
  check('3 paiements, zéro doublon', paids.length, 3)
  check('unités toutes couvertes par de l\'argent réel', (now.orderItems ?? []).every(l => l.paid === true && (l.paidCents ?? 0) === l.qty * l.unitCents), true)
  void [pizza2, pates, vin]
}

report()

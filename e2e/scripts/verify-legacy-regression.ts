/**
 * GOAL_PAIEMENTS_06 §9 — Régression legacy.
 * Ancien contrat (sans idempotencyKey) préservé à l'identique : plafonnement
 * silencieux conservé, statut "En attente" jusqu'au webhook. MAIS le fix de
 * GOAL_03 profite aussi au legacy : plus JAMAIS d'article marqué payé
 * au-delà de l'argent réellement reçu (fin du bulk-flip et du qty-shrink).
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-legacy-regression.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, confirm, convexRun, getTable, listPayments, order,
  report, unit, SKEW_MS,
} from './lib-paiements'

const t0 = Date.now() - SKEW_MS
order([
  { name: 'Pizza', qty: 2, unitCents: 1300 },
  { name: 'Tiramisu', qty: 1, unitCents: 800 },
]) // note 3400, unités : Pizza, Pizza, Tiramisu

// ── 1. Plafonnement silencieux conservé (contrat historique) ─────────────────
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 99999, totalCents: 99999, firstName: 'LegacyCap',
})
{
  const p = listPayments(t0).find(x => x.firstName === 'LegacyCap')
  check('1. Math.min silencieux conservé (3400)', p?.subtotalCents, 3400)
  check('1. "En attente" jusqu\'au webhook (Vuln 1 intact)', p?.status, 'En attente')
  check('1. table pas créditée avant confirmation', getTable().paidCents ?? 0, 0)
}

// ── 2. paidItemNames + argent partiel : l'article ne ment plus ───────────────
const t2 = order([
  { name: 'Pizza', qty: 2, unitCents: 1300 },
  { name: 'Tiramisu', qty: 1, unitCents: 800 },
])
const REF = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 1300, totalCents: 1300, firstName: 'LegacyNames',
  provider: 'square', providerRef: REF,
  paidItemNames: ['Pizza', 'Pizza'], // 2600 réclamés par le nom, 1300 payés
})
confirm(REF, 1300)
{
  const now = getTable()
  const pizza1 = unit(now, 'Pizza', 0)
  const pizza2 = unit(now, 'Pizza', 1)
  check('2. argent réel affecté : 1ʳᵉ pizza payée', [pizza1.paid, pizza1.paidCents], [true, 1300])
  check('2. 2ᵉ pizza PAS marquée payée (pas d\'argent pour elle)', [pizza2.paid ?? false, pizza2.paidCents ?? 0], [false, 0])
  check('2. qty jamais décrémentée', [pizza1.qty, pizza2.qty], [1, 1])
  check('2. compteur table exact', now.paidCents, 1300)
  void t2
}

// ── 3. Fin du bulk-flip : solder la table ne "paye" que ce qui est couvert ───
const REF2 = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2100, totalCents: 2100, firstName: 'LegacySolde',
  provider: 'square', providerRef: REF2, // pot commun legacy (sans noms)
})
confirm(REF2, 2100)
{
  const now = getTable()
  check('3. table soldée', [now.status, now.paidCents], ['paid', 3400])
  for (const [label, l] of [['Pizza1', unit(now, 'Pizza', 0)], ['Pizza2', unit(now, 'Pizza', 1)], ['Tiramisu', unit(now, 'Tiramisu')]] as const) {
    check(`3. ${label} : payé = couvert par de l'argent réel`, [l.paid, l.paidCents], [true, l.qty * l.unitCents])
  }
}

report()

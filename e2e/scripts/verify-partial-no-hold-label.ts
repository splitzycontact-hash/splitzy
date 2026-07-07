/**
 * GOAL_PAIEMENTS_10 — Libellé d'état de repos d'une ligne (avant tout clic).
 *
 * Bug prod 2026-07-07 (« Le bar d'Alfred », Table 1) : une unité payée à 50 %
 * SANS hold actif (holds: []) était affichée « Réservé par un autre convive ·
 * 0€ » au lieu du vrai reste, sélectionnable. La dérivation du libellé est
 * extraite en fonction pure (src/pages/lineStatus.ts) et vérifiée ici sur des
 * documents Convex RÉELS (paiement 50 % via claim → payments:create → confirm),
 * pas sur des fixtures inventées.
 *
 * Scénarios :
 *   1. Unité 1600 payée à 50 %, holds vide → DISPONIBLE : libellé « Reste 8€ »,
 *      montant affiché 8€ (jamais « Réservé »), availableCents = 800.
 *   2. Même unité + hold actif d'un AUTRE convive → « Réservé par un autre
 *      convive », montant = vrai reste (8€), JAMAIS 0€.
 *   3. Même hold vu par SON poseur (claimedBy === mon clientId) alors que la
 *      sélection locale est perdue (myPartIds vide, ex. rechargement de page)
 *      → « Réservé pour toi », montant = vrai reste.
 *   4. Seconde moitié payée → « Payé ✓ ».
 *
 * DEV uniquement (scintillating-viper-372). Exécution :
 *   npx tsx e2e/scripts/verify-partial-no-hold-label.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, order, report, unit,
} from './lib-paiements'
import { computeLineStatus, type LineHold } from '../../src/pages/lineStatus'
import { formatEur } from '../../src/utils/formatCurrency'

const CLIENT_B = 'client-B-observateur'
const CLIENT_C = 'client-C-reclameur'
const freshCtx = (clientId: string) => ({ myPartIds: new Set<string>(), clientId, nowMs: Date.now() })

// ── Mise en place : Tartare 16€, moitié réclamée + payée par A ───────────────
const t0 = order([{ name: 'Tartare de saumon', qty: 1, unitCents: 1600 }])
const tartare0 = unit(t0, 'Tartare de saumon')
const partA = claim(tartare0.lineId!, 800, 'client-A')
const REF_A = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 800, totalCents: 800, firstName: 'A',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF_A,
  allocation: [{ lineId: tartare0.lineId, amountCents: 800 }],
  parts: [{ lineId: tartare0.lineId, partId: partA.partId }],
})
confirm(REF_A, 800)

// ── 1. Payée à 50 %, AUCUN hold actif → disponible, vrai reste ───────────────
const t1 = getTable()
const line1 = unit(t1, 'Tartare de saumon')
check('précondition : paidCents figé à 800', line1.paidCents, 800)
check('précondition : aucun hold restant après confirmation', (line1.holds ?? []).length, 0)

const s1 = computeLineStatus(
  { qty: line1.qty, unitCents: line1.unitCents, paid: line1.paid, paidCents: line1.paidCents, holds: line1.holds as LineHold[] },
  freshCtx(CLIENT_B),
)
check('1. pas « Payé »', s1.isPaid, false)
check('1. reste réel = 8€', s1.remainingCents, 800)
check('1. capacité réclamable = 8€ (sélectionnable)', s1.availableCents, 800)
check('1. libellé = vrai reste, jamais « Réservé »', s1.restingLabel, `Reste ${formatEur(800)}`)
check('1. montant affiché = 8€ (pas 0€, pas 16€)', s1.restingAmountCents, 800)

// ── 2 & 3. Hold actif de C sur le reste : « réservé », montant = vrai reste ──
const partC = claim(line1.lineId!, 800, CLIENT_C)
const t2 = getTable()
const line2 = unit(t2, 'Tartare de saumon')
check('précondition : hold actif de C posé', (line2.holds ?? []).length, 1)

const s2 = computeLineStatus(
  { qty: line2.qty, unitCents: line2.unitCents, paid: line2.paid, paidCents: line2.paidCents, holds: line2.holds as LineHold[] },
  freshCtx(CLIENT_B),
)
check('2. bloquée pour un autre convive (capacité 0)', s2.availableCents, 0)
check('2. libellé « Réservé par un autre convive »', s2.restingLabel, 'Réservé par un autre convive')
check('2. montant affiché = vrai reste (8€), JAMAIS 0€', s2.restingAmountCents, 800)

const s3 = computeLineStatus(
  { qty: line2.qty, unitCents: line2.unitCents, paid: line2.paid, paidCents: line2.paidCents, holds: line2.holds as LineHold[] },
  freshCtx(CLIENT_C), // même convive que le poseur du hold, sélection locale perdue
)
check('3. libellé « Réservé pour toi » (claimedBy = mon clientId)', s3.restingLabel, 'Réservé pour toi')
check('3. montant affiché = vrai reste (8€)', s3.restingAmountCents, 800)

// ── 4. C paie sa moitié → « Payé ✓ » ─────────────────────────────────────────
const REF_C = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 800, totalCents: 800, firstName: 'C',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF_C,
  allocation: [{ lineId: line2.lineId, amountCents: 800 }],
  parts: [{ lineId: line2.lineId, partId: partC.partId }],
})
confirm(REF_C, 800)
const t4 = getTable()
const line4 = unit(t4, 'Tartare de saumon')
const s4 = computeLineStatus(
  { qty: line4.qty, unitCents: line4.unitCents, paid: line4.paid, paidCents: line4.paidCents, holds: line4.holds as LineHold[] },
  freshCtx(CLIENT_B),
)
check('4. unité soldée → payée', s4.isPaid, true)
check('4. libellé « Payé ✓ »', s4.restingLabel, 'Payé ✓')

report()

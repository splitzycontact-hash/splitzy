/**
 * GOAL_PAIEMENTS_06 §13 — Rejet explicite (fin du plafonnement silencieux).
 * Nouveau contrat : montant dépassant la capacité absorbante → STATE_CHANGED
 * retourné avec l'état à jour, AUCUN encaissement plafonné en douce. Le
 * plafond est la capacité ABSORBANTE (reste − holds actifs), pas le reste brut.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-explicit-rejection.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, convexRun, getTable, listPayments, order, report,
  unit, SKEW_MS,
} from './lib-paiements'

const t0 = Date.now() - SKEW_MS
const t = order([
  { name: 'Homard', qty: 1, unitCents: 5200 },
  { name: 'Sorbet', qty: 1, unitCents: 800 },
]) // note 6000

// ── 1. Dépassement du reste brut → STATE_CHANGED, zéro paiement ──────────────
let code = ''
try {
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 9000, totalCents: 9000, firstName: 'Depasse',
    idempotencyKey: randomUUID(),
  })
} catch (e) { code = String(e).includes('STATE_CHANGED') ? 'STATE_CHANGED' : String(e).slice(0, 80) }
check('1. rejet STATE_CHANGED explicite', code, 'STATE_CHANGED')
check('1. aucun paiement créé (pas de plafonnement en douce)', listPayments(t0).filter(p => p.firstName === 'Depasse').length, 0)

// ── 2. Plafond = capacité ABSORBANTE, pas le reste brut ──────────────────────
// A réclame le homard (hold actif 5200). Reste brut = 6000, absorbante = 800.
claim(unit(t, 'Homard').lineId!, 5200, 'A')
let code2 = ''
try {
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 2000, totalCents: 2000, firstName: 'PotTropGros',
    idempotencyKey: randomUUID(), // 2000 ≤ reste brut MAIS > absorbante (800)
  })
} catch (e) { code2 = String(e).includes('STATE_CHANGED') ? 'STATE_CHANGED' : String(e).slice(0, 80) }
check('2. pot commun > absorbante rejeté malgré reste brut suffisant', code2, 'STATE_CHANGED')

// Un pot commun ≤ absorbante passe, lui.
const ok = convexRun('payments:create', {
  ...baseArgs, subtotalCents: 800, totalCents: 800, firstName: 'PotOk',
  idempotencyKey: randomUUID(),
}) as { subtotalCents: number }
check('2. pot commun = absorbante accepté, montant NON modifié', ok.subtotalCents, 800)
check('2. l\'argent n\'a pas bougé sans webhook', getTable().paidCents ?? 0, 0)

report()

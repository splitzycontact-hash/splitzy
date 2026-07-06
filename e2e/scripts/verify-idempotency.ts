/**
 * GOAL_PAIEMENTS_06 §8 — Idempotence.
 * Même idempotencyKey envoyée en PARALLÈLE et en SÉQUENTIEL → un seul
 * paiement créé (check-then-insert dans une seule mutation Convex, OCC).
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-idempotency.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, convexRun, convexRunAsync, listPayments, order, report,
  SKEW_MS,
} from './lib-paiements'

const t0 = Date.now() - SKEW_MS
order([{ name: 'Plat idem', qty: 1, unitCents: 2000 }])

// ── Séquentiel : 3 envois, 1 paiement ─────────────────────────────────────────
const KEY = randomUUID()
const results: { paymentId: string; idempotent: boolean }[] = []
for (let i = 0; i < 3; i++) {
  results.push(convexRun('payments:create', {
    ...baseArgs, subtotalCents: 1000, totalCents: 1000, firstName: 'Seq',
    idempotencyKey: KEY,
  }) as { paymentId: string; idempotent: boolean })
}
check('séquentiel : même paymentId aux 3 envois', new Set(results.map(r => r.paymentId)).size, 1)
check('séquentiel : 1er création, suivants idempotents', results.map(r => r.idempotent), [false, true, true])
check('séquentiel : un seul paiement en base', listPayments(t0).filter(p => p.idempotencyKey === KEY).length, 1)

// ── Parallèle : 3 envois simultanés, 1 paiement ───────────────────────────────
const KEY2 = randomUUID()
const race = await Promise.all([0, 1, 2].map(() =>
  convexRunAsync('payments:create', {
    ...baseArgs, subtotalCents: 500, totalCents: 500, firstName: 'Par',
    idempotencyKey: KEY2,
  }),
))
check('parallèle : les 3 appels aboutissent (aucun blocage)', race.every(r => r.ok), true)
check('parallèle : un seul paymentId retourné', new Set(race.map(r => (r.value as { paymentId: string }).paymentId)).size, 1)
check('parallèle : un seul paiement en base', listPayments(t0).filter(p => p.idempotencyKey === KEY2).length, 1)

report()

/**
 * GOAL_PAIEMENTS_06 §5 — Échec de paiement.
 * Carte refusée (claims:failPayment, cible interne du futur webhook d'échec
 * signé) → part relâchée immédiatement, rien de payé. Aucun webhook du tout
 * (ni succès ni échec) → le filet de secours planifié à la création
 * (failsafeMs court en test, 15 min en réel) relâche la part.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-payment-failure.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, convexRun, getTable, order, report, sleep, unit,
} from './lib-paiements'

// ── 1. Carte refusée ──────────────────────────────────────────────────────────
console.log('\n=== 1. Carte refusée (failPayment) ===')
{
  const t = order([{ name: 'Refusé', qty: 1, unitCents: 1600 }])
  const plat = unit(t, 'Refusé')
  const part = claim(plat.lineId!, 1600, 'A')
  const REF = randomUUID()
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 1600, totalCents: 1600, firstName: 'CarteRefusee',
    idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
    allocation: [{ lineId: plat.lineId, amountCents: 1600 }],
    parts: [{ lineId: plat.lineId, partId: part.partId }],
  })
  check('1. part gelée', unit(getTable(), 'Refusé').holds?.[0]?.state, 'paiement_attente')
  const r = convexRun('claims:failPayment', { provider: 'square', providerRef: REF, reason: 'card_declined' }) as { ok: boolean; released: number }
  check('1. échec traité, part relâchée immédiatement', [r.ok, r.released], [true, 1])
  const l = unit(getTable(), 'Refusé')
  check('1. plat de nouveau libre, rien de payé', [l.holds?.length, l.paidCents ?? 0, getTable().paidCents ?? 0], [0, 0, 0])
}

// ── 2. Aucun webhook : filet de secours temporel ─────────────────────────────
console.log('\n=== 2. Aucun webhook → filet de secours ===')
{
  const t = order([{ name: 'Silence', qty: 1, unitCents: 1100 }])
  const plat = unit(t, 'Silence')
  const part = claim(plat.lineId!, 1100, 'B')
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 1100, totalCents: 1100, firstName: 'SansWebhook',
    idempotencyKey: randomUUID(),
    allocation: [{ lineId: plat.lineId, amountCents: 1100 }],
    parts: [{ lineId: plat.lineId, partId: part.partId }],
    failsafeMs: 5000, // 15 min en réel — court ici pour le test
  })
  check('2. part gelée en attendant', unit(getTable(), 'Silence').holds?.[0]?.state, 'paiement_attente')
  await sleep(9000)
  const l = unit(getTable(), 'Silence')
  check('2. filet de secours a relâché la part', l.holds?.length, 0)
  check('2. aucun encaissement fantôme', [l.paidCents ?? 0, getTable().paidCents ?? 0], [0, 0])
}

report()

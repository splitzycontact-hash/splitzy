/**
 * GOAL_PAIEMENTS_13 §3 — Reset gérant bloqué pendant un paiement en vol.
 * Un hold `paiement_attente` actif → tables:resetPaymentMode refuse (throw
 * explicite), le mode reste verrouillé. Hold libéré (échec PSP simulé via
 * claims:failPayment) → le reset passe, paymentModeHistory archive l'état.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-payment-mode-reset-blocked.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, convexRun, getTable, order, report, unit, TABLE,
} from './lib-paiements'

type HistoryEntry = { mode: string; lockedAt: number; lockedBy: string; resetBy?: string; resetAt?: number }
type TableWithMode = ReturnType<typeof getTable> & {
  paymentMode?: string; paymentModeLockedBy?: string; paymentModeHistory?: HistoryEntry[]
}

const t = order([{ name: 'Plat verrou', qty: 1, unitCents: 2400 }])
const plat = unit(t, 'Plat verrou')

convexRun('tables:choosePaymentMode', { tableId: TABLE.id, mode: 'item', clientId: 'payeur' })
check('mode verrouillé avant le paiement', (getTable() as TableWithMode).paymentMode, 'item')

// Paiement en vol : hold gelé `paiement_attente`.
const part = claim(plat.lineId!, 2400, 'payeur')
const REF = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'ResetBloqué',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
  allocation: [{ lineId: plat.lineId, amountCents: 2400 }],
  parts: [{ lineId: plat.lineId, partId: part.partId }],
})
check('hold gelé (paiement en vol)', unit(getTable(), 'Plat verrou').holds?.[0]?.state, 'paiement_attente')

// Reset pendant le paiement → throw explicite, mode inchangé.
let threw = false
let msg = ''
try {
  convexRun('tables:resetPaymentMode', { tableId: TABLE.id }, { asOwner: true })
} catch (e) {
  threw = true
  msg = String(e)
}
check('reset refusé pendant un paiement en vol', threw, true)
check('message explicite (paiement en cours)', msg.includes('paiement est en cours'), true)
check('paymentMode inchangé après le refus', (getTable() as TableWithMode).paymentMode, 'item')

// Échec PSP simulé → hold libéré → le reset passe.
const fail = convexRun('claims:failPayment', { provider: 'square', providerRef: REF, reason: 'carte refusée (test)' }) as { ok: boolean; released?: number }
check('échec PSP libère la part gelée', [fail.ok, fail.released], [true, 1])
check('plus aucun hold actif', unit(getTable(), 'Plat verrou').holds?.length ?? 0, 0)

const res = convexRun('tables:resetPaymentMode', { tableId: TABLE.id }, { asOwner: true }) as { reset: boolean }
check('reset accepté après libération du hold', res.reset, true)

const after = getTable() as TableWithMode
check('mode déverrouillé', after.paymentMode, undefined)
const last = (after.paymentModeHistory ?? []).at(-1)
check('historique : mode archivé', last?.mode, 'item')
check('historique : lockedBy archivé', last?.lockedBy, 'payeur')
check('historique : resetAt posé', typeof last?.resetAt, 'number')

report()

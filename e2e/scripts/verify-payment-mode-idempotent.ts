/**
 * GOAL_PAIEMENTS_13 §2 — Idempotence du verrou pour le même convive.
 * Retry réseau : le MÊME clientId rappelle choosePaymentMode avec le même
 * mode → les deux réponses confirment SON verrou ({locked:true}), la deuxième
 * porte alreadyMine:true, aucune erreur, la base est inchangée.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-payment-mode-idempotent.ts
 */
import { check, convexRun, getTable, order, report, TABLE } from './lib-paiements'

type ModeResult = { locked: boolean; mode?: string; alreadyMine?: boolean }
type TableWithMode = ReturnType<typeof getTable> & { paymentMode?: string; paymentModeLockedBy?: string; paymentModeLockedAt?: number }

order([{ name: 'Plat retry', qty: 1, unitCents: 1200 }])

const r1 = convexRun('tables:choosePaymentMode', { tableId: TABLE.id, mode: 'item', clientId: 'même-onglet' }) as ModeResult
check('premier appel : verrou posé', [r1.locked, r1.mode], [true, 'item'])
const lockedAt = (getTable() as TableWithMode).paymentModeLockedAt

const r2 = convexRun('tables:choosePaymentMode', { tableId: TABLE.id, mode: 'item', clientId: 'même-onglet' }) as ModeResult
check('deuxième appel (retry) : verrou confirmé', [r2.locked, r2.mode], [true, 'item'])
check('deuxième appel : alreadyMine présent', r2.alreadyMine, true)

const after = getTable() as TableWithMode
check('mode inchangé en base', after.paymentMode, 'item')
check('lockedBy inchangé', after.paymentModeLockedBy, 'même-onglet')
check('horodatage du verrou NON réécrit par le retry', after.paymentModeLockedAt, lockedAt)

report()

/**
 * GOAL_PAIEMENTS_06 §7 — Clôture de table.
 * Clôture avec holds actifs → purgés, rien ne fuit sur la sitting suivante.
 * Paiement en vol au moment de la clôture → la confirmation tardive est
 * rattachée à l'ANCIENNE sitting via le sittingStartedAt DU PAIEMENT ; les
 * chiffres du service suivant restent intacts. Le gérant n'est JAMAIS bloqué.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-table-closure.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, listPayments,
  order, report, unit, SKEW_MS, TABLE,
} from './lib-paiements'

const t0 = Date.now() - SKEW_MS
const t = order([{ name: 'Gigot', qty: 1, unitCents: 3000 }])
const gigot = unit(t, 'Gigot')
const oldSitting = getTable().sittingStartedAt
check('sitting 1 datée', typeof oldSitting, 'number')

// Hold actif + paiement en vol (gelé, en attente de la banque).
const part = claim(gigot.lineId!, 3000, 'EnVol')
const REF = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 3000, totalCents: 3000, firstName: 'EnVol',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
  allocation: [{ lineId: gigot.lineId, amountCents: 3000 }],
  parts: [{ lineId: gigot.lineId, partId: part.partId }],
})
const pmtBefore = listPayments(t0).find(p => p.firstName === 'EnVol')
check('sittingStartedAt figé sur le paiement à sa création', pmtBefore?.sittingStartedAt, oldSitting)

// Clôture IMMÉDIATE — le gérant ne poireaute jamais sur un 3D Secure lent.
convexRun('tables:closeWithoutPayment', { tableId: TABLE.id, reason: 'fin de service' }, { asOwner: true })
{
  const now = getTable()
  check('clôture immédiate malgré le paiement en vol', now.status, 'free')
  check('holds purgés avec la clôture (rien ne fuit)', (now.orderItems ?? []).length, 0)
}

// Sitting 2 : nouveaux clients s'installent.
convexRun('tables:addOrderItems', { tableId: TABLE.id, items: [{ name: 'Salade', qty: 1, unitCents: 1200 }] }, { asOwner: true })
const newSitting = getTable().sittingStartedAt
check('sitting 2 distincte de la sitting 1', newSitting !== oldSitting, true)

// La banque confirme ENFIN le paiement de la sitting 1.
const res = confirm(REF, 3000)
check('webhook tardif traité (argent encaissé)', res.ok, true)
{
  const now = getTable()
  check('sitting 2 JAMAIS créditée par le paiement de la sitting 1', [now.paidCents ?? 0, now.status], [0, 'dining'])
  check('lignes de la sitting 2 intactes', [(now.orderItems ?? []).length, unit(now, 'Salade').paidCents ?? 0], [1, 0])
  const pmt = listPayments(t0).find(p => p.firstName === 'EnVol')
  check('paiement de la sitting 1 bien Encaissé (analytics)', pmt?.status, 'Encaissé')
  check('paiement toujours rattaché à la sitting 1', pmt?.sittingStartedAt, oldSitting)
}

report()

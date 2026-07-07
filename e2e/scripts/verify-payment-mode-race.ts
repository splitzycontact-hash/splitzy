/**
 * GOAL_PAIEMENTS_13 §1 — Course sur le verrou du mode de paiement.
 * Deux convives choisissent SIMULTANÉMENT des modes différents sur une table
 * fraîchement ouverte : exactement un gagne ({locked:true}), l'autre reçoit un
 * refus doux ({locked:false, actualMode}) — jamais d'exception. La base porte
 * le mode du gagnant.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-payment-mode-race.ts
 */
import { check, convexRunAsync, getTable, order, report, TABLE } from './lib-paiements'

type ModeResult = { locked: boolean; mode?: string; actualMode?: string; alreadyMine?: boolean }
type TableWithMode = ReturnType<typeof getTable> & { paymentMode?: string; paymentModeLockedBy?: string }

order([{ name: 'Plat course', qty: 1, unitCents: 1500 }])
check('table fraîche : aucun mode verrouillé', (getTable() as TableWithMode).paymentMode, undefined)

// Course : deux clientId différents, deux modes différents.
const race = await Promise.all([
  convexRunAsync('tables:choosePaymentMode', { tableId: TABLE.id, mode: 'item', clientId: 'onglet-A' }),
  convexRunAsync('tables:choosePaymentMode', { tableId: TABLE.id, mode: 'diviser', clientId: 'onglet-B' }),
])

// Aucun des deux appels ne doit lever d'exception (refus doux, pas de throw).
check('aucune erreur brute sur la course', race.map(r => r.ok), [true, true])

const values = race.map(r => r.value as ModeResult)
const winners = values.filter(v => v.locked)
const losers = values.filter(v => !v.locked)
check('exactement un verrou gagnant', winners.length, 1)
check('exactement un refus doux', losers.length, 1)
check('le perdant reçoit le mode réellement verrouillé', losers[0]?.actualMode, winners[0]?.mode)

const after = getTable() as TableWithMode
check('paymentMode en base = mode du gagnant', after.paymentMode, winners[0]?.mode)
check('lockedBy = un des deux onglets', ['onglet-A', 'onglet-B'].includes(after.paymentModeLockedBy ?? ''), true)

report()

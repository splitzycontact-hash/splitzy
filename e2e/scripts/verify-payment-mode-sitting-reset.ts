/**
 * GOAL_PAIEMENTS_13 §4 — Le verrou meurt avec la sitting.
 * Mode verrouillé, puis tables:resetToFree (table libérée), puis réouverture
 * via tables:addOrderItems : la NOUVELLE sitting n'hérite d'aucun mode —
 * paymentMode est undefined, les nouveaux convives choisiront.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-payment-mode-sitting-reset.ts
 */
import { check, convexRun, getTable, order, report, resetTable, TABLE } from './lib-paiements'

type TableWithMode = ReturnType<typeof getTable> & { paymentMode?: string; paymentModeLockedBy?: string; paymentModeLockedAt?: number }

order([{ name: 'Plat sitting 1', qty: 1, unitCents: 1800 }])
convexRun('tables:choosePaymentMode', { tableId: TABLE.id, mode: 'diviser', clientId: 'sitting-1' })
check('sitting 1 : mode verrouillé', (getTable() as TableWithMode).paymentMode, 'diviser')

// Fin de service : le gérant libère la table.
resetTable()
{
  const t = getTable() as TableWithMode
  check('table libérée', t.status, 'free')
  check('verrou purgé à la libération', [t.paymentMode, t.paymentModeLockedBy, t.paymentModeLockedAt], [undefined, undefined, undefined])
}

// Sitting 2 : nouveaux clients, nouvelle commande.
convexRun('tables:addOrderItems', { tableId: TABLE.id, items: [{ name: 'Plat sitting 2', qty: 1, unitCents: 2100 }] }, { asOwner: true })
{
  const t = getTable() as TableWithMode
  check('sitting 2 ouverte', t.status, 'dining')
  check('aucun mode hérité sur la nouvelle sitting', t.paymentMode, undefined)
}

report()

/**
 * GOAL_PAIEMENTS_13 §5 — Dessert commandé après qu'un convive parti a soldé.
 * Table 5 convives, mode "item" verrouillé. Un convive paie et solde
 * exactement le total courant → table "paid". Le gérant ajoute un dessert :
 * pas de throw, la table repasse en "payment", le grand livre antérieur
 * (paidCents, unités payées) reste intact, seul le dessert reste dû, le
 * verrou de mode survit (même sitting).
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-dessert-after-departure.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, report, resetTable, unit, TABLE,
} from './lib-paiements'

type TableWithMode = ReturnType<typeof getTable> & { paymentMode?: string; guests?: number }

// 5 convives s'installent — un seul plat au grand livre pour solder d'un coup.
resetTable()
convexRun('tables:addOrderItems', {
  tableId: TABLE.id, guests: 5,
  items: [{ name: 'Menu partagé', qty: 1, unitCents: 5000 }],
}, { asOwner: true })
check('sitting ouverte à 5 convives', (getTable() as TableWithMode).guests, 5)
const menu = unit(getTable(), 'Menu partagé')
const sitting1 = getTable().sittingStartedAt

convexRun('tables:choosePaymentMode', { tableId: TABLE.id, mode: 'item', clientId: 'parti-tôt' })

// Le convive pressé paie 100 % du total courant puis s'en va.
const part = claim(menu.lineId!, 5000, 'parti-tôt')
const REF = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 5000, totalCents: 5000, firstName: 'PartiTôt',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
  allocation: [{ lineId: menu.lineId, amountCents: 5000 }],
  parts: [{ lineId: menu.lineId, partId: part.partId }],
})
confirm(REF, 5000)
{
  const t = getTable() as TableWithMode
  check('total soldé → table "paid"', t.status, 'paid')
  check('grand livre : 5000 payés', t.paidCents, 5000)
}

// Les 4 restants commandent un dessert — AUCUN throw attendu.
let threw = ''
try {
  convexRun('tables:addOrderItems', { tableId: TABLE.id, items: [{ name: 'Tiramisu', qty: 1, unitCents: 900 }] }, { asOwner: true })
} catch (e) {
  threw = String(e)
}
check('ajout du dessert accepté sur table réglée (pas de throw)', threw, '')

const after = getTable() as TableWithMode
check('la table repasse en "payment"', after.status, 'payment')
check('paidCents antérieurs intacts', after.paidCents, 5000)
check('total augmenté du dessert', after.amountCents, 5900)
{
  const menuAfter = unit(after, 'Menu partagé')
  check('unité déjà payée intacte', [menuAfter.paid, menuAfter.paidCents], [true, 5000])
  const dessert = unit(after, 'Tiramisu')
  check('dessert dû, non payé', [dessert.paid ?? false, dessert.paidCents ?? 0, dessert.unitCents], [false, 0, 900])
}
check('même sitting (pas de réouverture)', after.sittingStartedAt, sitting1)
check('verrou de mode conservé', after.paymentMode, 'item')

report()

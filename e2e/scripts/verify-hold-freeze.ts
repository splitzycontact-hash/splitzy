/**
 * GOAL_PAIEMENTS_06 §4 — Hold gelé pendant un paiement lent.
 * Confirmation banque simulée AU-DELÀ du TTL du hold (3D Secure lent) :
 * la part n'est jamais libérée entre-temps, le paiement réussit normalement.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-hold-freeze.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, order, report,
  sleep, unit,
} from './lib-paiements'

const t = order([
  { name: 'Plat lent', qty: 1, unitCents: 2200 },
  { name: 'Autre plat', qty: 1, unitCents: 900 },
])
const plat = unit(t, 'Plat lent')

// TTL court (3 s) pour simuler « la banque répond après l'expiration ».
const part = claim(plat.lineId!, 2200, 'Lent', 3000)
const REF = randomUUID()
convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2200, totalCents: 2200, firstName: 'BanqueLente',
  idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
  allocation: [{ lineId: plat.lineId, amountCents: 2200 }],
  parts: [{ lineId: plat.lineId, partId: part.partId }],
})
check('part gelée à la création du paiement', unit(getTable(), 'Plat lent').holds?.[0]?.state, 'paiement_attente')

// La « banque » met 7 s (> TTL 3 s) : l'expiration planifiée se réveille
// pendant la vérification et ne doit RIEN libérer.
await sleep(7000)
{
  const l = unit(getTable(), 'Plat lent')
  check('part toujours gelée après le TTL (aucune libération)', [l.holds?.length, l.holds?.[0]?.state], [1, 'paiement_attente'])
  check('argent intouché pendant l\'attente', [l.paidCents ?? 0, getTable().paidCents ?? 0], [0, 0])
  // Personne d'autre ne peut prendre la part gelée pendant l'attente.
  let rejected = false
  try { claim(plat.lineId!, 2200, 'Intrus') } catch (e) { rejected = String(e).includes('CAPACITY_EXCEEDED') }
  check('capacité gelée inaccessible à un autre convive', rejected, true)
}

confirm(REF, 2200)
{
  const l = unit(getTable(), 'Plat lent')
  check('paiement réussi après la confirmation lente', [l.paidCents, l.paid], [2200, true])
  check('hold consommé', l.holds?.length, 0)
  check('table créditée exactement une fois', getTable().paidCents, 2200)
}

report()

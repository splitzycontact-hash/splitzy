/**
 * GOAL_PAIEMENTS_06 §3 — Concurrence paiement vs expiration de hold.
 * « Au paiement, on vérifie plat encore payable ?, jamais hold encore
 * valide ? » : le paiement passe dans LES DEUX ordres de course, sans rejet
 * indu ni double-encaissement. Étendu : un hold qui « expire » pendant que le
 * paiement est en `paiement_attente` ne libère RIEN (gel, brief §4).
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-concurrent-payments.ts
 */
import { randomUUID } from 'node:crypto'
import {
  baseArgs, check, claim, confirm, convexRun, getTable, order, report,
  sleep, unit,
} from './lib-paiements'

// ── Ordre A : le paiement GAGNE la course (créé avant l'expiration) ──────────
console.log('\n=== Ordre A : paiement avant expiration → gel, aucune libération ===')
{
  const t = order([{ name: 'PlatA', qty: 1, unitCents: 1500 }])
  const plat = unit(t, 'PlatA')
  const part = claim(plat.lineId!, 1500, 'A', 3000) // TTL 3 s
  const REF = randomUUID()
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 1500, totalCents: 1500, firstName: 'CourseA',
    idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
    allocation: [{ lineId: plat.lineId, amountCents: 1500 }],
    parts: [{ lineId: plat.lineId, partId: part.partId }],
  })
  // Le TTL de 3 s « expire » pendant la vérification bancaire…
  await sleep(6000)
  let now = unit(getTable(), 'PlatA')
  check('A. part gelée NON libérée à l\'expiration du TTL', now.holds?.[0]?.state, 'paiement_attente')
  confirm(REF, 1500)
  now = unit(getTable(), 'PlatA')
  check('A. paiement réussi, unité payée une fois', [now.paidCents, now.paid], [1500, true])
  check('A. hold consommé à la confirmation', now.holds?.length, 0)
  check('A. table créditée exactement une fois', getTable().paidCents, 1500)
}

// ── Ordre B : l'expiration GAGNE la course (paiement créé après) ─────────────
console.log('\n=== Ordre B : expiration avant paiement → paiement passe quand même ===')
{
  const t = order([{ name: 'PlatB', qty: 1, unitCents: 1500 }])
  const plat = unit(t, 'PlatB')
  const part = claim(plat.lineId!, 1500, 'B', 1000) // TTL 1 s
  await sleep(4000) // la part expire et est libérée
  check('B. part libérée par l\'expiration', unit(getTable(), 'PlatB').holds?.length, 0)
  // Le client (écran périmé) envoie quand même son paiement avec la part morte :
  // plat encore payable → AUCUN rejet indu, le gel ignore la part disparue.
  const REF = randomUUID()
  let rejected = false
  try {
    convexRun('payments:create', {
      ...baseArgs, subtotalCents: 1500, totalCents: 1500, firstName: 'CourseB',
      idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
      allocation: [{ lineId: plat.lineId, amountCents: 1500 }],
      parts: [{ lineId: plat.lineId, partId: part.partId }],
    })
  } catch { rejected = true }
  check('B. aucun rejet indu (plat encore payable)', rejected, false)
  confirm(REF, 1500)
  const now = unit(getTable(), 'PlatB')
  check('B. unité payée une fois, jamais deux', [now.paidCents, now.paid], [1500, true])
  check('B. table créditée exactement une fois', getTable().paidCents, 1500)
}

report()

/**
 * GOAL_PAIEMENTS_06 §2 — Concurrence réclamation.
 * Deux réclamations SIMULTANÉES sur la même capacité → une gagne, l'autre est
 * rejetée proprement (CAPACITY_EXCEEDED), aucun blocage de mutation.
 * DEV uniquement. Exécution : npx tsx e2e/scripts/verify-concurrent-claims.ts
 */
import { check, convexRunAsync, getTable, order, report, unit, TABLE } from './lib-paiements'

const t = order([{ name: 'Plat unique', qty: 1, unitCents: 1800 }])
const plat = unit(t, 'Plat unique')

// Course : les deux visent 100 % de la capacité.
const race = await Promise.all([
  convexRunAsync('claims:claimPart', { tableId: TABLE.id, lineId: plat.lineId, capacityCents: 1800, claimedBy: 'R1' }),
  convexRunAsync('claims:claimPart', { tableId: TABLE.id, lineId: plat.lineId, capacityCents: 1800, claimedBy: 'R2' }),
])
const winners = race.filter(r => r.ok)
const cleanRejects = race.filter(r => !r.ok && String(r.error).includes('CAPACITY_EXCEEDED'))
check('exactement 1 réclamation gagnante', winners.length, 1)
check('exactement 1 rejet propre (CAPACITY_EXCEEDED)', cleanRejects.length, 1)

// Aucun blocage : l'état est cohérent (1 seul hold) et la mutation répond.
const after = unit(getTable(), 'Plat unique')
check('un seul hold posé', after.holds?.length, 1)
check('capacité du hold = prix entier', after.holds?.[0]?.capacityCents, 1800)
check('argent intouché par la course', [after.paidCents ?? 0, getTable().paidCents ?? 0], [0, 0])

// Deux réclamations PARTIELLES simultanées (½ + ½) doivent, elles, coexister.
const t2 = order([{ name: 'Partagé', qty: 1, unitCents: 2000 }])
const partage = unit(t2, 'Partagé')
const race2 = await Promise.all([
  convexRunAsync('claims:claimPart', { tableId: TABLE.id, lineId: partage.lineId, capacityCents: 1000, claimedBy: 'A' }),
  convexRunAsync('claims:claimPart', { tableId: TABLE.id, lineId: partage.lineId, capacityCents: 1000, claimedBy: 'B' }),
])
check('parts partielles concurrentes : les deux gagnent', race2.filter(r => r.ok).length, 2)
check('deux holds coexistent', unit(getTable(), 'Partagé').holds?.length, 2)

report()

/**
 * GOAL_PAIEMENTS_03 — Vérification nouveau contrat `create` +
 * `applyConfirmedPayment` unifié, sur le déploiement DEV Convex
 * (scintillating-viper-372). Aucun contact avec la prod.
 *
 * Scénarios :
 *   1. LEGACY (sans idempotencyKey) : comportement inchangé — plafonnement
 *      silencieux Math.min conservé, paiement "En attente".
 *   2. NOUVEAU CONTRAT : montant > capacité absorbante → STATE_CHANGED,
 *      aucun paiement créé, aucun plafonnement en douce.
 *   3. Idempotence : même clé séquentielle ET en parallèle → un seul paiement.
 *   4. Confirmation webhook (confirmPayment interne) rejouée 3× → UNE seule
 *      réconciliation ; allocation explicite honorée ; appliedAllocation écrite.
 *   5. Plus grand reste : paiement libre ventilé sur la capacité libre.
 *   6. Fix Bug 1 (profite au legacy) : paidItemNames avec argent partiel →
 *      l'unité n'est PLUS marquée payée au-delà de l'argent reçu.
 *
 * Exécution : npx tsx e2e/scripts/verify-create-contract.ts
 */
import { execFileSync, execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const SPLITZY_DIR = path.resolve(import.meta.dirname, '../../../Splitzy')
const DEPLOYMENT = 'dev:scintillating-viper-372'

const RESTAURANT_ID = 'jd73fccbqc79hpeh4g43nc6pj589dgpm'
const OWNER_SUBJECT = 'user_3FflExqtWyLeBI7UYLydTbMBebt'
const TABLE = { id: 'jh7d9g3p7qaq78v8r1a242y56989d6p5', number: 1 }

function convexRun(fn: string, args: Record<string, unknown>, opts: { asOwner?: boolean } = {}): unknown {
  const argv = ['convex', 'run', fn, JSON.stringify(args)]
  if (opts.asOwner) argv.push('--identity', JSON.stringify({ subject: OWNER_SUBJECT }))
  const out = execFileSync('npx', argv, {
    cwd: SPLITZY_DIR,
    env: { ...process.env, CONVEX_DEPLOYMENT: DEPLOYMENT },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const trimmed = out.trim()
  if (!trimmed) return null
  try { return JSON.parse(trimmed) } catch { return trimmed }
}

function convexRunAsync(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; value?: unknown; error?: string }> {
  return new Promise(resolve => {
    execFile('npx', ['convex', 'run', fn, JSON.stringify(args)], {
      cwd: SPLITZY_DIR,
      env: { ...process.env, CONVEX_DEPLOYMENT: DEPLOYMENT },
      encoding: 'utf8',
    }, (err, stdout, stderr) => {
      if (err) resolve({ ok: false, error: String(stderr || err.message) })
      else {
        const t = stdout.trim()
        try { resolve({ ok: true, value: t ? JSON.parse(t) : null }) } catch { resolve({ ok: true, value: t }) }
      }
    })
  })
}

type Hold = { partId: string; capacityCents: number; state: string }
type Line = { lineId?: string; name: string; qty: number; unitCents: number; paid?: boolean; paidCents?: number; holds?: Hold[] }
type TableDoc = { _id: string; status: string; amountCents?: number; paidCents?: number; orderItems?: Line[] }
type PaymentDoc = {
  _id: string; subtotalCents: number; totalCents: number; status: string
  provider?: string; providerRef?: string; idempotencyKey?: string
  appliedAllocation?: { lineId: string; amountCents: number }[]
  overflowCents?: number; firstName?: string; createdAt: number
}

function getTable(): TableDoc {
  const rows = convexRun('tables:list', { restaurantId: RESTAURANT_ID }, { asOwner: true }) as TableDoc[]
  const t = rows.find(r => r._id === TABLE.id)
  if (!t) throw new Error(`Table ${TABLE.id} introuvable`)
  return t
}
function listPayments(since: number): PaymentDoc[] {
  return (convexRun('payments:list', { restaurantId: RESTAURANT_ID, from: since }, { asOwner: true }) as PaymentDoc[])
}

const results: { name: string; pass: boolean; detail: string }[] = []
function check(name: string, actual: unknown, expected: unknown, extra = '') {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ name, pass, detail: `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}${extra ? ` — ${extra}` : ''}` })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`)
}

const SKEW_MS = 60_000
const baseArgs = {
  restaurantId: RESTAURANT_ID, tableId: TABLE.id, tableNumber: TABLE.number,
  tipCents: 0, commissionCents: 0, paymentMethod: 'card',
}

function setupTable(): { entrecote: Line; dessert: Line } {
  convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })
  convexRun('tables:addOrderItems', {
    tableId: TABLE.id,
    items: [{ name: 'Entrecôte partagée', qty: 1, unitCents: 2400 }, { name: 'Dessert', qty: 1, unitCents: 1000 }],
  }, { asOwner: true })
  const t = getTable()
  return {
    entrecote: t.orderItems!.find(l => l.name === 'Entrecôte partagée')!,
    dessert: t.orderItems!.find(l => l.name === 'Dessert')!,
  }
}

// ── 1. Legacy inchangé : plafonnement silencieux conservé ─────────────────────
console.log('\n=== 1. Legacy (sans clé) : Math.min conservé, "En attente" ===')
setupTable()
const t0 = Date.now() - SKEW_MS
convexRun('payments:create', { ...baseArgs, subtotalCents: 5000, totalCents: 5000, firstName: 'Legacy' })
{
  const p = listPayments(t0).find(x => x.firstName === 'Legacy')!
  check('1. subtotal plafonné en douce (3400)', p.subtotalCents, 3400)
  check('1. statut "En attente" (Vuln 1 intact)', p.status, 'En attente')
  check('1. paidCents table intouché avant webhook', getTable().paidCents ?? 0, 0)
}

// ── 2. Nouveau contrat : STATE_CHANGED, pas de plafonnement ──────────────────
console.log('\n=== 2. Nouveau contrat : dépassement → STATE_CHANGED ===')
const { entrecote, dessert } = setupTable()
const t1 = Date.now() - SKEW_MS
let stateChanged = false
try {
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 5000, totalCents: 5000, firstName: 'Rejete',
    idempotencyKey: randomUUID(),
  })
} catch (e) { stateChanged = String(e).includes('STATE_CHANGED') }
check('2. rejet STATE_CHANGED explicite', stateChanged, true)
check('2. aucun paiement créé', listPayments(t1).filter(p => p.firstName === 'Rejete').length, 0)

// ── 3. Idempotence : séquentiel + parallèle ───────────────────────────────────
console.log('\n=== 3. Idempotence ===')
const KEY = randomUUID()
const REF1 = randomUUID()
const first = convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'Idem',
  idempotencyKey: KEY, provider: 'square', providerRef: REF1,
  allocation: [{ lineId: entrecote.lineId, amountCents: 2400 }],
}) as { paymentId: string; subtotalCents: number; idempotent: boolean }
check('3. retour montants validés serveur', [first.subtotalCents, first.idempotent], [2400, false])
const second = convexRun('payments:create', {
  ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'Idem',
  idempotencyKey: KEY,
  allocation: [{ lineId: entrecote.lineId, amountCents: 2400 }],
}) as { paymentId: string; idempotent: boolean }
check('3. rejeu séquentiel → même paiement', [second.paymentId === first.paymentId, second.idempotent], [true, true])
const KEY2 = randomUUID()
const race = await Promise.all([
  convexRunAsync('payments:create', { ...baseArgs, subtotalCents: 500, totalCents: 500, firstName: 'IdemPar', idempotencyKey: KEY2 }),
  convexRunAsync('payments:create', { ...baseArgs, subtotalCents: 500, totalCents: 500, firstName: 'IdemPar', idempotencyKey: KEY2 }),
])
const paceOk = race.every(r => r.ok)
const uniqueIds = new Set(race.map(r => (r.value as { paymentId: string }).paymentId))
check('3. parallèle même clé → 1 seul paiement', [paceOk, uniqueIds.size], [true, 1])

// ── 4. Confirmation webhook rejouée 3× → une seule réconciliation ────────────
console.log('\n=== 4. confirmPayment ×3 : allocation honorée, une réconciliation ===')
{
  for (let i = 0; i < 3; i++) {
    convexRun('payments:confirmPayment', { provider: 'square', providerRef: REF1, amountCents: 2400 })
  }
  const t = getTable()
  const e = t.orderItems!.find(l => l.lineId === entrecote.lineId)!
  check('4. table.paidCents crédité UNE fois', t.paidCents, 2400)
  check('4. unité ciblée payée (paidCents = prix)', [e.paidCents, e.paid], [2400, true])
  const d = t.orderItems!.find(l => l.lineId === dessert.lineId)!
  check('4. autre unité intacte (pas de bulk-flip)', [d.paidCents ?? 0, d.paid ?? false], [0, false])
  const pAfter = listPayments(t1).find(p => p._id === first.paymentId)!
  check('4. appliedAllocation écrite', pAfter.appliedAllocation?.map(a => [a.lineId, a.amountCents]), [[entrecote.lineId, 2400]])
}

// ── 5. Plus grand reste : montant libre ventilé sur la capacité libre ────────
console.log('\n=== 5. Pot commun (plus grand reste) ===')
{
  const KEY3 = randomUUID()
  const REF3 = randomUUID()
  const r = convexRun('payments:create', {
    ...baseArgs, subtotalCents: 800, totalCents: 800, firstName: 'Pot', idempotencyKey: KEY3,
    provider: 'square', providerRef: REF3,
  }) as { paymentId: string }
  convexRun('payments:confirmPayment', { provider: 'square', providerRef: REF3, amountCents: 800 })
  const t = getTable()
  const d = t.orderItems!.find(l => l.lineId === dessert.lineId)!
  check('5. ventilé sur le Dessert (seule capacité libre)', [d.paidCents, d.paid ?? false], [800, false])
  const pAfter = listPayments(t1).find(p => p._id === r.paymentId)!
  check('5. appliedAllocation = dessert 800', pAfter.appliedAllocation?.map(a => [a.lineId, a.amountCents]), [[dessert.lineId, 800]])
  check('5. total table exact', t.paidCents, 3200)
}

// ── 6. Fix Bug 1 sur le legacy : paidItemNames + argent partiel ──────────────
console.log('\n=== 6. Legacy paidItemNames : plus de "payé" sans argent ===')
{
  const lines = setupTable()
  const t2 = Date.now() - SKEW_MS
  const REF6 = randomUUID()
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 1200, totalCents: 1200, firstName: 'LegacyPartiel',
    provider: 'square', providerRef: REF6,
    paidItemNames: ['Entrecôte partagée'], // 2400 réclamés par le nom, 1200 payés
  })
  void t2
  convexRun('payments:confirmPayment', { provider: 'square', providerRef: REF6, amountCents: 1200 })
  const t = getTable()
  const e = t.orderItems!.find(l => l.lineId === lines.entrecote.lineId)!
  check('6. unité PAS marquée payée (1200 < 2400)', e.paid ?? false, false)
  check('6. paidCents partiel exact', e.paidCents, 1200)
  check('6. qty JAMAIS décrémentée', e.qty, 1)
  check('6. table.paidCents exact', t.paidCents, 1200)
}

// ── Nettoyage ─────────────────────────────────────────────────────────────────
convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })

const failed = results.filter(r => !r.pass)
console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) {
  for (const f of failed) console.log(`FAIL ${f.name} — ${f.detail}`)
  process.exit(1)
}

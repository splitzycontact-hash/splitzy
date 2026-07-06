/**
 * GOAL_PAIEMENTS_02 — Vérification hold par part + TTL + gel, sur le
 * déploiement DEV Convex (scintillating-viper-372). Aucun contact avec la prod.
 *
 * Scénarios :
 *   1. Deux réclamations partielles coexistent sur la même unité (½ + ½).
 *   2. Réclamation sur unité pleine → rejet propre CAPACITY_EXCEEDED.
 *   3. Deux réclamations CONCURRENTES sur la même capacité → une gagne,
 *      l'autre rejetée proprement, aucun blocage.
 *   4. Expiration TTL (3 s en test) : la part expire seule, les autres parts
 *      de la même unité restent intactes.
 *   5. releasePart manuel : ne libère que la part visée, seulement `reclamee`.
 *   6. GEL : payments:create avec `parts` → la part passe `paiement_attente`,
 *      l'expiration planifiée ne la libère PAS, paidCents JAMAIS modifié par
 *      le hold (invariant sécurité).
 *
 * Exécution : npx tsx e2e/scripts/verify-claims-hold.ts
 */
import { execFileSync, execFile } from 'node:child_process'
import path from 'node:path'

const SPLITZY_DIR = path.resolve(import.meta.dirname, '../../../Splitzy')
const DEPLOYMENT = 'dev:scintillating-viper-372'

// Restaurant dédié E2E sur dev (« Resto Owner E2E », slug resto-owner-e2e).
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

// Variante asynchrone pour les courses (Promise.all).
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

type Hold = { partId: string; capacityCents: number; state: string; expiresAt?: number }
type Line = { lineId?: string; name: string; qty: number; unitCents: number; paidCents?: number; holds?: Hold[] }
type TableDoc = { _id: string; paidCents?: number; orderItems?: Line[] }

function getTable(): TableDoc {
  const rows = convexRun('tables:list', { restaurantId: RESTAURANT_ID }, { asOwner: true }) as TableDoc[]
  const t = rows.find(r => r._id === TABLE.id)
  if (!t) throw new Error(`Table ${TABLE.id} introuvable`)
  return t
}

const results: { name: string; pass: boolean; detail: string }[] = []
function check(name: string, actual: unknown, expected: unknown, extra = '') {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ name, pass, detail: `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}${extra ? ` — ${extra}` : ''}` })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Setup : table propre + 1 unité 24€ (partageable) + 1 unité 10€ ───────────
console.log('\n=== Setup (reset + commande 2 unités) ===')
convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })
convexRun('tables:addOrderItems', {
  tableId: TABLE.id,
  items: [{ name: 'Entrecôte partagée', qty: 1, unitCents: 2400 }, { name: 'Dessert', qty: 1, unitCents: 1000 }],
}, { asOwner: true })
let t = getTable()
const entrecote = t.orderItems!.find(l => l.name === 'Entrecôte partagée')!
const dessert = t.orderItems!.find(l => l.name === 'Dessert')!
check('setup: unités avec lineId', [!!entrecote.lineId, !!dessert.lineId], [true, true])
check('setup: paidCents 0 / holds vides', [entrecote.paidCents, entrecote.holds?.length], [0, 0])

// ── 1. Deux parts partielles coexistent ──────────────────────────────────────
console.log('\n=== 1. Parts partielles concurrentes (½ + ½) ===')
const partA = convexRun('claims:claimPart', {
  tableId: TABLE.id, lineId: entrecote.lineId, capacityCents: 1200, claimedBy: 'A',
}) as { partId: string; remainingCents: number }
check('1. part A posée, restant 1200', partA.remainingCents, 1200)
const partB = convexRun('claims:claimPart', {
  tableId: TABLE.id, lineId: entrecote.lineId, capacityCents: 1200, claimedBy: 'B',
}) as { partId: string; remainingCents: number }
check('1. part B posée, restant 0', partB.remainingCents, 0)
t = getTable()
check('1. deux holds actifs sur l\'unité', t.orderItems!.find(l => l.lineId === entrecote.lineId)!.holds!.length, 2)

// ── 2. 3ᵉ réclamation sur unité pleine → refus propre ────────────────────────
console.log('\n=== 2. Unité pleine → CAPACITY_EXCEEDED ===')
let rejected = false
try {
  convexRun('claims:claimPart', { tableId: TABLE.id, lineId: entrecote.lineId, capacityCents: 100, claimedBy: 'C' })
} catch (e) {
  rejected = String(e).includes('CAPACITY_EXCEEDED')
}
check('2. rejet propre (CAPACITY_EXCEEDED)', rejected, true)

// ── 3. Course : 2 réclamations simultanées sur la même capacité ──────────────
console.log('\n=== 3. Réclamations concurrentes (course sur le Dessert) ===')
const race = await Promise.all([
  convexRunAsync('claims:claimPart', { tableId: TABLE.id, lineId: dessert.lineId, capacityCents: 1000, claimedBy: 'R1' }),
  convexRunAsync('claims:claimPart', { tableId: TABLE.id, lineId: dessert.lineId, capacityCents: 1000, claimedBy: 'R2' }),
])
const winners = race.filter(r => r.ok)
const losers = race.filter(r => !r.ok && String(r.error).includes('CAPACITY_EXCEEDED'))
check('3. exactement 1 gagnant', winners.length, 1)
check('3. exactement 1 rejet propre', losers.length, 1)
const dessertPart = (winners[0]!.value as { partId: string }).partId

// ── 4. Expiration TTL courte : la part expire, les autres intactes ───────────
console.log('\n=== 4. Expiration TTL (3 s) — les autres parts intactes ===')
convexRun('claims:releasePart', { tableId: TABLE.id, lineId: dessert.lineId, partId: dessertPart })
const partTtl = convexRun('claims:claimPart', {
  tableId: TABLE.id, lineId: dessert.lineId, capacityCents: 400, claimedBy: 'TTL', ttlMs: 3000,
}) as { partId: string }
await sleep(6000) // 3 s TTL + marge scheduler
t = getTable()
const dessertLine = t.orderItems!.find(l => l.lineId === dessert.lineId)!
const entrecoteLine = t.orderItems!.find(l => l.lineId === entrecote.lineId)!
check('4. part TTL expirée (libérée)', dessertLine.holds!.some(h => h.partId === partTtl.partId), false)
check('4. parts A+B de l\'entrecôte intactes', entrecoteLine.holds!.length, 2)

// ── 5. releasePart : libère SA part seule ─────────────────────────────────────
console.log('\n=== 5. releasePart manuel ===')
const rel = convexRun('claims:releasePart', { tableId: TABLE.id, lineId: entrecote.lineId, partId: partB.partId }) as { released: boolean }
check('5. released true', rel.released, true)
t = getTable()
const holdsAfterRelease = t.orderItems!.find(l => l.lineId === entrecote.lineId)!.holds!
check('5. reste 1 hold (part A)', [holdsAfterRelease.length, holdsAfterRelease[0]!.partId === partA.partId], [1, true])

// ── 6. GEL : paiement sur la part A → paiement_attente, TTL inopérant ────────
console.log('\n=== 6. Gel du hold à la création du paiement ===')
// Re-réclame la part A avec TTL court pour prouver que le gel désarme le TTL.
convexRun('claims:releasePart', { tableId: TABLE.id, lineId: entrecote.lineId, partId: partA.partId })
const partG = convexRun('claims:claimPart', {
  tableId: TABLE.id, lineId: entrecote.lineId, capacityCents: 1200, claimedBy: 'G', ttlMs: 3000,
}) as { partId: string }
convexRun('payments:create', {
  restaurantId: RESTAURANT_ID, tableId: TABLE.id, tableNumber: TABLE.number,
  subtotalCents: 1200, tipCents: 0, commissionCents: 0, totalCents: 1200,
  paymentMethod: 'card', firstName: 'Geleur',
  parts: [{ lineId: entrecote.lineId, partId: partG.partId }],
}) // chemin convive anonyme réel — reste "En attente" (aucun webhook ici)
t = getTable()
let gHold = t.orderItems!.find(l => l.lineId === entrecote.lineId)!.holds!.find(h => h.partId === partG.partId)
check('6. état gelé paiement_attente', gHold?.state, 'paiement_attente')
await sleep(6000) // le TTL de 3 s « expire » pendant le paiement en vérification
t = getTable()
gHold = t.orderItems!.find(l => l.lineId === entrecote.lineId)!.holds!.find(h => h.partId === partG.partId)
check('6. part NON libérée après expiration du TTL', gHold?.state, 'paiement_attente')
check('6. INVARIANT : paidCents table intouché par le hold', t.paidCents ?? 0, 0)
check('6. INVARIANT : paidCents unité intouché', t.orderItems!.find(l => l.lineId === entrecote.lineId)!.paidCents, 0)

// ── Nettoyage ─────────────────────────────────────────────────────────────────
convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })

const failed = results.filter(r => !r.pass)
console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) {
  for (const f of failed) console.log(`FAIL ${f.name} — ${f.detail}`)
  process.exit(1)
}

/**
 * GOAL 2 — Validation « convives réels » sur le déploiement DEV Convex
 * (scintillating-viper-372). Aucun contact avec la prod.
 *
 * Scénarios (voir GOALS_GUESTS_REEL.md) :
 *   A — 3 paiements en partage équitable (guests=3) → table.guests === 3
 *   B — 2 paiements « par article » (payeurs distincts, sans guests) → table.guests === 2
 *   C — table ouverte à 3 couverts par le gérant, signal plus faible (2 payeurs)
 *       → table.guests reste 3 (jamais de diminution)
 *
 * Exécution : npx tsx e2e/scripts/verify-guests.ts
 * Prérequis : le code convives (computeGuestsPatch) est déployé sur dev depuis
 * Splitzy/ (CONVEX_DEPLOYMENT=dev:scintillating-viper-372 npx convex dev --once).
 *
 * Toutes les opérations passent par `npx convex run` :
 *   - setup gérant (resetToFree, updateStatus+amountCents) avec --identity mockée
 *     (subject = clerkUserId du restaurant E2E) — possible sur dev uniquement ;
 *   - paiements convive (payments:create) SANS identité (anonyme, comme en prod) ;
 *   - confirmation via internal payments:backfillDemoPending (équivalent dev du
 *     webhook PSP → confirmPayment, même computeGuestsPatch).
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const SPLITZY_DIR = path.resolve(import.meta.dirname, '../../../Splitzy')
const DEPLOYMENT = 'dev:scintillating-viper-372'

// Restaurant dédié E2E sur dev (« Resto Owner E2E », slug resto-owner-e2e).
const RESTAURANT_ID = 'jd73fccbqc79hpeh4g43nc6pj589dgpm'
const OWNER_SUBJECT = 'user_3FflExqtWyLeBI7UYLydTbMBebt'
const TABLES = {
  A: { id: 'jh7d9g3p7qaq78v8r1a242y56989d6p5', number: 1 },
  B: { id: 'jh7bz2pw3y6dxts4sgbvbwfrc189csqd', number: 2 },
  C: { id: 'jh74fm069gpvdgbv8d1hx16c8d89d1wn', number: 3 },
} as const

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

type TableDoc = { _id: string; guests?: number; paidCents?: number; amountCents?: number; status: string }

function getTable(tableId: string): TableDoc {
  const rows = convexRun('tables:list', { restaurantId: RESTAURANT_ID }, { asOwner: true }) as TableDoc[]
  const t = rows.find(r => r._id === tableId)
  if (!t) throw new Error(`Table ${tableId} introuvable`)
  return t
}

function openTable(tableId: string, amountCents: number, guests?: number) {
  convexRun('tables:resetToFree', { tableId }, { asOwner: true })
  convexRun('tables:updateStatus', {
    tableId,
    status: 'dining',
    amountCents,
    ...(guests !== undefined ? { guests } : {}),
  }, { asOwner: true })
}

function pay(table: { id: string; number: number }, subtotalCents: number, p: {
  guests?: number; firstName?: string; avatarIndex?: number
}) {
  convexRun('payments:create', {
    restaurantId: RESTAURANT_ID,
    tableId: table.id,
    tableNumber: table.number,
    subtotalCents,
    tipCents: 0,
    commissionCents: 0,
    totalCents: subtotalCents,
    paymentMethod: 'card',
    ...(p.guests !== undefined ? { guests: p.guests } : {}),
    ...(p.firstName !== undefined ? { firstName: p.firstName } : {}),
    ...(p.avatarIndex !== undefined ? { avatarIndex: p.avatarIndex } : {}),
  }) // volontairement SANS identité : chemin convive anonyme réel
}

function confirmAll(sinceCreatedAt: number) {
  return convexRun('payments:backfillDemoPending', { restaurantId: RESTAURANT_ID, sinceCreatedAt })
}

const results: { name: string; pass: boolean; detail: string }[] = []

function check(name: string, actual: unknown, expected: unknown, extra = '') {
  const pass = actual === expected
  results.push({ name, pass, detail: `attendu ${expected}, obtenu ${actual}${extra ? ` — ${extra}` : ''}` })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — attendu ${expected}, obtenu ${actual}`)
}

// Marge 60 s : createdAt est posé par l'horloge serveur Convex, qui peut être
// légèrement derrière l'horloge locale — sans marge, backfill raterait nos
// paiements. Les paiements déjà « Encaissé » sont filtrés, donc sans risque.
const SKEW_MS = 60_000
const t0 = Date.now() - SKEW_MS

// ---------- Scénario A — partage équitable, 3 paiements guests=3 ----------
console.log('\n=== Scénario A (équitable, 3× guests=3, note 90€) ===')
openTable(TABLES.A.id, 9000)
for (let i = 0; i < 3; i++) {
  pay(TABLES.A, 3000, { guests: 3, firstName: `EqA${i}`, avatarIndex: i })
}
console.log('backfill:', JSON.stringify(confirmAll(t0)))
{
  const t = getTable(TABLES.A.id)
  check('A. table.guests', t.guests, 3, `paidCents=${t.paidCents}, status=${t.status}`)
  check('A. paidCents (argent intouché)', t.paidCents, 9000)
}

// ---------- Scénario B — par article, 2 payeurs distincts sans guests ----------
console.log('\n=== Scénario B (par article, 2 payeurs distincts, note 40€) ===')
const tB = Date.now() - SKEW_MS
openTable(TABLES.B.id, 4000)
pay(TABLES.B, 2000, { firstName: 'Léo', avatarIndex: 0 })
pay(TABLES.B, 2000, { firstName: 'Mia', avatarIndex: 1 })
console.log('backfill:', JSON.stringify(confirmAll(tB)))
{
  const t = getTable(TABLES.B.id)
  check('B. table.guests', t.guests, 2, `paidCents=${t.paidCents}, status=${t.status}`)
  check('B. paidCents (argent intouché)', t.paidCents, 4000)
}

// ---------- Scénario C — guests=3 posé par le gérant, signal faible (2) ----------
console.log('\n=== Scénario C (gérant ouvre à 3 couverts, 2 payeurs → reste 3) ===')
const tC = Date.now() - SKEW_MS
openTable(TABLES.C.id, 4000, 3)
pay(TABLES.C, 2000, { firstName: 'Sam', avatarIndex: 2 })
pay(TABLES.C, 2000, { firstName: 'Ana', avatarIndex: 3 })
console.log('backfill:', JSON.stringify(confirmAll(tC)))
{
  const t = getTable(TABLES.C.id)
  check('C. table.guests (jamais diminué)', t.guests, 3, `paidCents=${t.paidCents}, status=${t.status}`)
  check('C. paidCents (argent intouché)', t.paidCents, 4000)
}

// ---------- Nettoyage : tables relâchées ----------
for (const t of Object.values(TABLES)) {
  convexRun('tables:resetToFree', { tableId: t.id }, { asOwner: true })
}

const failed = results.filter(r => !r.pass)
console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) {
  for (const f of failed) console.log(`FAIL ${f.name} — ${f.detail}`)
  process.exit(1)
}

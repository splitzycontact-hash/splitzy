/**
 * GOAL_PAIEMENTS_04 — Vérification des filets : échec de paiement,
 * remboursement, clôture de table. DEV uniquement (scintillating-viper-372).
 *
 * Scénarios :
 *   1. Carte refusée (claims:failPayment interne) → parts gelées libérées,
 *      rien de payé.
 *   2. Aucun webhook (ni succès ni échec) → filet de secours planifié à la
 *      création (failsafeMs court en test) libère les parts.
 *   3. Filet de secours INOFFENSIF sur paiement confirmé : la confirmation
 *      consomme les holds avant, le réveil ne touche à rien.
 *   4. Remboursement : unité repasse non payée, total table débité, statut
 *      `paid` → `payment` dans la MÊME mutation. Re-encaisser un remboursé
 *      → rejet.
 *   5. Clôture avec holds actifs → purgés ; paiement en vol au moment de la
 *      clôture → confirmation tardive rattachée à l'ANCIENNE sitting
 *      (sittingStartedAt du paiement), la nouvelle sitting jamais créditée.
 *
 * Exécution : npx tsx e2e/scripts/verify-filets.ts
 */
import { execFileSync } from 'node:child_process'
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

type Hold = { partId: string; capacityCents: number; state: string }
type Line = { lineId?: string; name: string; qty: number; unitCents: number; paid?: boolean; paidCents?: number; holds?: Hold[] }
type TableDoc = { _id: string; status: string; amountCents?: number; paidCents?: number; paidTipCents?: number; orderItems?: Line[]; sittingStartedAt?: number }

function getTable(): TableDoc {
  const rows = convexRun('tables:list', { restaurantId: RESTAURANT_ID }, { asOwner: true }) as TableDoc[]
  const t = rows.find(r => r._id === TABLE.id)
  if (!t) throw new Error(`Table ${TABLE.id} introuvable`)
  return t
}

const results: { name: string; pass: boolean; detail: string }[] = []
function check(name: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ name, pass, detail: `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}` })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`)
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

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
const claim = (lineId: string, cap: number, who: string) =>
  convexRun('claims:claimPart', { tableId: TABLE.id, lineId, capacityCents: cap, claimedBy: who }) as { partId: string }

// ── 1. Carte refusée : failPayment libère les parts gelées ───────────────────
console.log('\n=== 1. Échec PSP (failPayment) ===')
{
  const { entrecote } = setupTable()
  const part = claim(entrecote.lineId!, 2400, 'A')
  const REF = randomUUID()
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'Refuse',
    idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
    allocation: [{ lineId: entrecote.lineId, amountCents: 2400 }],
    parts: [{ lineId: entrecote.lineId, partId: part.partId }],
  })
  let e = getTable().orderItems!.find(l => l.lineId === entrecote.lineId)!
  check('1. part gelée avant échec', e.holds![0]!.state, 'paiement_attente')
  const r = convexRun('claims:failPayment', { provider: 'square', providerRef: REF, reason: 'card_declined' }) as { ok: boolean; released: number }
  check('1. failPayment ok + 1 part libérée', [r.ok, r.released], [true, 1])
  e = getTable().orderItems!.find(l => l.lineId === entrecote.lineId)!
  check('1. plus aucun hold, rien payé', [e.holds!.length, e.paidCents, getTable().paidCents ?? 0], [0, 0, 0])
}

// ── 2. Aucun webhook : filet de secours temporel ─────────────────────────────
console.log('\n=== 2. Filet de secours (failsafeMs 5 s) ===')
{
  const { dessert } = setupTable()
  const part = claim(dessert.lineId!, 1000, 'B')
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 1000, totalCents: 1000, firstName: 'SansWebhook',
    idempotencyKey: randomUUID(),
    allocation: [{ lineId: dessert.lineId, amountCents: 1000 }],
    parts: [{ lineId: dessert.lineId, partId: part.partId }],
    failsafeMs: 5000,
  })
  let d = getTable().orderItems!.find(l => l.lineId === dessert.lineId)!
  check('2. part gelée (paiement_attente)', d.holds![0]!.state, 'paiement_attente')
  await sleep(9000)
  d = getTable().orderItems!.find(l => l.lineId === dessert.lineId)!
  check('2. filet a libéré la part', d.holds!.length, 0)
  check('2. aucun double-encaissement possible entre-temps (rien payé)', [d.paidCents, getTable().paidCents ?? 0], [0, 0])
}

// ── 3. Filet inoffensif si paiement confirmé avant le réveil ─────────────────
console.log('\n=== 3. Filet vs confirmation (course sûre) ===')
{
  const { entrecote } = setupTable()
  const part = claim(entrecote.lineId!, 2400, 'C')
  const REF = randomUUID()
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'ConfirmeVite',
    idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
    allocation: [{ lineId: entrecote.lineId, amountCents: 2400 }],
    parts: [{ lineId: entrecote.lineId, partId: part.partId }],
    failsafeMs: 5000,
  })
  convexRun('payments:confirmPayment', { provider: 'square', providerRef: REF, amountCents: 2400 })
  await sleep(9000) // le filet se réveille APRÈS la confirmation
  const t = getTable()
  const e = t.orderItems!.find(l => l.lineId === entrecote.lineId)!
  check('3. unité payée, intacte après réveil du filet', [e.paid, e.paidCents], [true, 2400])
  check('3. table créditée une seule fois', t.paidCents, 2400)
}

// ── 4. Remboursement : inverse comptable + statut table, même mutation ───────
console.log('\n=== 4. Remboursement ===')
{
  const { entrecote, dessert } = setupTable()
  const REF = randomUUID()
  const r = convexRun('payments:create', {
    ...baseArgs, subtotalCents: 3400, totalCents: 3400, firstName: 'Rembourse',
    idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
    allocation: [
      { lineId: entrecote.lineId, amountCents: 2400 },
      { lineId: dessert.lineId, amountCents: 1000 },
    ],
  }) as { paymentId: string }
  convexRun('payments:confirmPayment', { provider: 'square', providerRef: REF, amountCents: 3400 })
  let t = getTable()
  check('4. table réglée avant remboursement', [t.status, t.paidCents], ['paid', 3400])
  convexRun('payments:updateStatus', { paymentId: r.paymentId, status: 'Remboursé' }, { asOwner: true })
  t = getTable()
  const e = t.orderItems!.find(l => l.lineId === entrecote.lineId)!
  check('4. statut table redescendu paid → payment', t.status, 'payment')
  check('4. total table débité', t.paidCents, 0)
  check('4. unité repasse non payée', [e.paid, e.paidCents], [false, 0])
  let rejected = false
  try {
    convexRun('payments:updateStatus', { paymentId: r.paymentId, status: 'Encaissé' }, { asOwner: true })
  } catch { rejected = true }
  check('4. ré-encaissement d\'un remboursé rejeté', rejected, true)
}

// ── 5. Clôture : holds purgés + confirmation tardive → ancienne sitting ──────
console.log('\n=== 5. Clôture + paiement en vol ===')
{
  const { entrecote } = setupTable()
  const oldSitting = getTable().sittingStartedAt
  check('5. sitting ouverte datée', typeof oldSitting, 'number')
  const part = claim(entrecote.lineId!, 2400, 'EnVol')
  const REF = randomUUID()
  convexRun('payments:create', {
    ...baseArgs, subtotalCents: 2400, totalCents: 2400, firstName: 'EnVol',
    idempotencyKey: randomUUID(), provider: 'square', providerRef: REF,
    allocation: [{ lineId: entrecote.lineId, amountCents: 2400 }],
    parts: [{ lineId: entrecote.lineId, partId: part.partId }],
  })
  // Clôture IMMÉDIATE (jamais bloquer le gérant), paiement toujours en vol.
  convexRun('tables:closeWithoutPayment', { tableId: TABLE.id, reason: 'test' }, { asOwner: true })
  let t = getTable()
  check('5. clôture immédiate, holds purgés', [t.status, (t.orderItems ?? []).length], ['free', 0])
  // Nouvelle sitting (nouveaux clients).
  convexRun('tables:addOrderItems', {
    tableId: TABLE.id, items: [{ name: 'Café', qty: 2, unitCents: 300 }],
  }, { asOwner: true })
  const newSitting = getTable().sittingStartedAt
  check('5. nouvelle sitting distincte', newSitting !== oldSitting, true)
  // La confirmation bancaire tardive arrive maintenant.
  const res = convexRun('payments:confirmPayment', { provider: 'square', providerRef: REF, amountCents: 2400 }) as { ok: boolean }
  check('5. webhook tardif accepté (argent encaissé)', res.ok, true)
  t = getTable()
  check('5. nouvelle sitting JAMAIS créditée', [t.paidCents ?? 0, t.status], [0, 'dining'])
  const cafe = t.orderItems!.find(l => l.name === 'Café')
  check('5. lignes de la nouvelle sitting intactes', [t.orderItems!.length, cafe?.paidCents ?? 0], [2, 0])
}

// ── Nettoyage ─────────────────────────────────────────────────────────────────
convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })

const failed = results.filter(r => !r.pass)
console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) {
  for (const f of failed) console.log(`FAIL ${f.name} — ${f.detail}`)
  process.exit(1)
}

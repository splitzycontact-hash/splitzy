/**
 * GOAL_FIX_PAIDCENTS_STALE — Validation sur le déploiement DEV Convex
 * (scintillating-viper-372). Aucun contact avec la prod.
 *
 * Scénario exact du bug (voir GOAL_FIX_PAIDCENTS_STALE.md) :
 *   1. Sitting 1 soldée : note 90€, paiement 90€ + pourboire 5€ confirmé
 *      → table.paidCents = 9000, table.paidTipCents = 500.
 *   2. Libération POS : updateTableFromPOS(amountCents: 0)
 *      → paidCents ET paidTipCents doivent être purgés (undefined),
 *        comme guests/sittingStartedAt (symétrie resetToFree).
 *   3. Nouvelle installation POS : updateTableFromPOS(amountCents: 5000),
 *      paiement convive de 5000 → payments.create ne doit PAS le plafonner
 *      (subtotalCents inséré = 5000, pas 0 ni réduit par l'ancien paidCents).
 *
 * Exécution : npx tsx e2e/scripts/verify-paidcents.ts
 * Prérequis : fix posIntegrations.ts déployé sur dev depuis Splitzy/
 * (CONVEX_DEPLOYMENT=dev:scintillating-viper-372 npx convex dev --once).
 */
import { execFileSync } from 'node:child_process'
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

type TableDoc = {
  _id: string; guests?: number; paidCents?: number; paidTipCents?: number
  amountCents?: number; status: string
}

function getTable(): TableDoc {
  const rows = convexRun('tables:list', { restaurantId: RESTAURANT_ID }, { asOwner: true }) as TableDoc[]
  const t = rows.find(r => r._id === TABLE.id)
  if (!t) throw new Error(`Table ${TABLE.id} introuvable`)
  return t
}

function pay(subtotalCents: number, tipCents: number, firstName: string) {
  convexRun('payments:create', {
    restaurantId: RESTAURANT_ID,
    tableId: TABLE.id,
    tableNumber: TABLE.number,
    subtotalCents,
    tipCents,
    commissionCents: 0,
    totalCents: subtotalCents + tipCents,
    paymentMethod: 'card',
    firstName,
  }) // volontairement SANS identité : chemin convive anonyme réel
}

// Libération / mise à jour POS — la fonction corrigée, appelée directement
// (internalMutation, accessible via la clé deploy dev uniquement).
function posUpdate(amountCents: number) {
  convexRun('posIntegrations:updateTableFromPOS', {
    restaurantId: RESTAURANT_ID,
    tableNumber: TABLE.number,
    amountCents,
  })
}

const results: { name: string; pass: boolean; detail: string }[] = []

function check(name: string, actual: unknown, expected: unknown, extra = '') {
  const pass = actual === expected
  results.push({ name, pass, detail: `attendu ${expected}, obtenu ${actual}${extra ? ` — ${extra}` : ''}` })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — attendu ${expected}, obtenu ${actual}`)
}

// Marge 60 s : createdAt posé par l'horloge serveur Convex (peut être derrière
// l'horloge locale) — sans marge, backfill/filtre rateraient nos paiements.
const SKEW_MS = 60_000

// ---------- Étape 1 — sitting 1 soldée : paidCents=9000, paidTipCents=500 ----------
console.log('\n=== Étape 1 (sitting 1 : note 90€, payée 90€ + tip 5€, confirmée) ===')
const t0 = Date.now() - SKEW_MS
convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })
posUpdate(9000) // le POS ouvre la note à 90€
pay(9000, 500, 'Sitting1')
console.log('backfill:', JSON.stringify(convexRun('payments:backfillDemoPending', { restaurantId: RESTAURANT_ID, sinceCreatedAt: t0 })))
{
  const t = getTable()
  check('1. paidCents après sitting soldée', t.paidCents, 9000, `status=${t.status}`)
  check('1. paidTipCents après sitting soldée', t.paidTipCents, 500)
}

// ---------- Étape 2 — libération POS : purge paidCents/paidTipCents ----------
console.log('\n=== Étape 2 (libération POS : updateTableFromPOS amountCents=0) ===')
posUpdate(0)
{
  const t = getTable()
  check('2. status après libération', t.status, 'free')
  check('2. paidCents purgé', t.paidCents, undefined)
  check('2. paidTipCents purgé', t.paidTipCents, undefined)
  check('2. guests purgé (comportement existant intact)', t.guests, undefined)
}

// ---------- Étape 3 — nouvelle installation : paiement 50€ non plafonné ----------
console.log('\n=== Étape 3 (nouvelle installation 50€ : paiement 5000 non plafonné) ===')
const t1 = Date.now() - SKEW_MS
posUpdate(5000) // nouvelle addition 50€
pay(5000, 0, 'Sitting2')
{
  type PaymentDoc = { tableNumber: number; subtotalCents: number; createdAt: number; firstName?: string }
  const rows = convexRun('payments:list', { restaurantId: RESTAURANT_ID, from: t1 }, { asOwner: true }) as PaymentDoc[]
  const p = rows.find(r => r.tableNumber === TABLE.number && r.firstName === 'Sitting2')
  check('3. paiement sitting 2 trouvé', !!p, true)
  check('3. subtotalCents NON plafonné', p?.subtotalCents, 5000)
}

// ---------- Nettoyage ----------
convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })

const failed = results.filter(r => !r.pass)
console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) {
  for (const f of failed) console.log(`FAIL ${f.name} — ${f.detail}`)
  process.exit(1)
}

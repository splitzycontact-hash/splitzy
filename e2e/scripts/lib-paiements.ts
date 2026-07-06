/**
 * Helpers partagés des scripts E2E paiements (GOAL_PAIEMENTS_06).
 * Tout s'exécute sur le déploiement DEV Convex (scintillating-viper-372) —
 * JAMAIS sur la prod (mellow-chinchilla-481).
 */
import { execFileSync, execFile } from 'node:child_process'
import path from 'node:path'

export const SPLITZY_DIR = path.resolve(import.meta.dirname, '../../../Splitzy')
export const DEPLOYMENT = 'dev:scintillating-viper-372'

// Restaurant dédié E2E sur dev (« Resto Owner E2E », slug resto-owner-e2e).
export const RESTAURANT_ID = 'jd73fccbqc79hpeh4g43nc6pj589dgpm'
export const OWNER_SUBJECT = 'user_3FflExqtWyLeBI7UYLydTbMBebt'
export const TABLE = { id: 'jh7d9g3p7qaq78v8r1a242y56989d6p5', number: 1 }

export function convexRun(fn: string, args: Record<string, unknown>, opts: { asOwner?: boolean } = {}): unknown {
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
export function convexRunAsync(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; value?: unknown; error?: string }> {
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

export type Hold = { partId: string; claimedBy?: string; capacityCents: number; state: string; expiresAt?: number }
export type Line = {
  lineId?: string; name: string; qty: number; unitCents: number
  paid?: boolean; paidCents?: number; holds?: Hold[]
}
export type TableDoc = {
  _id: string; status: string; amountCents?: number; paidCents?: number
  paidTipCents?: number; orderItems?: Line[]; sittingStartedAt?: number
}
export type PaymentDoc = {
  _id: string; subtotalCents: number; tipCents: number; totalCents: number; status: string
  provider?: string; providerRef?: string; idempotencyKey?: string; firstName?: string
  appliedAllocation?: { lineId: string; amountCents: number }[]
  overflowCents?: number; createdAt: number; sittingStartedAt?: number
}

export function getTable(): TableDoc {
  const rows = convexRun('tables:list', { restaurantId: RESTAURANT_ID }, { asOwner: true }) as TableDoc[]
  const t = rows.find(r => r._id === TABLE.id)
  if (!t) throw new Error(`Table ${TABLE.id} introuvable`)
  return t
}

export function listPayments(since: number): PaymentDoc[] {
  return convexRun('payments:list', { restaurantId: RESTAURANT_ID, from: since }, { asOwner: true }) as PaymentDoc[]
}

export function resetTable(): void {
  convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })
}

// Pose une commande neuve (fabrique côté serveur : unités qty 1 + lineId).
export function order(items: { name: string; qty: number; unitCents: number }[]): TableDoc {
  resetTable()
  convexRun('tables:addOrderItems', { tableId: TABLE.id, items }, { asOwner: true })
  return getTable()
}

export const unit = (t: TableDoc, name: string, nth = 0): Line => {
  const matches = (t.orderItems ?? []).filter(l => l.name === name)
  if (!matches[nth]) throw new Error(`Unité "${name}"[${nth}] introuvable`)
  return matches[nth]
}

export const baseArgs = {
  restaurantId: RESTAURANT_ID, tableId: TABLE.id, tableNumber: TABLE.number,
  tipCents: 0, commissionCents: 0, paymentMethod: 'card',
} as const

export function claim(lineId: string, capacityCents: number, who: string, ttlMs?: number): { partId: string; remainingCents: number } {
  return convexRun('claims:claimPart', {
    tableId: TABLE.id, lineId, capacityCents, claimedBy: who,
    ...(ttlMs !== undefined ? { ttlMs } : {}),
  }) as { partId: string; remainingCents: number }
}

export function confirm(providerRef: string, amountCents: number): { ok: boolean } {
  return convexRun('payments:confirmPayment', { provider: 'square', providerRef, amountCents }) as { ok: boolean }
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Marge horloge serveur Convex vs locale (voir verify-paidcents.ts).
export const SKEW_MS = 60_000

const results: { name: string; pass: boolean; detail: string }[] = []
export function check(name: string, actual: unknown, expected: unknown): void {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ name, pass, detail: `attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}` })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`)
}

export function report(): void {
  resetTable()
  const failed = results.filter(r => !r.pass)
  console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
  if (failed.length) {
    for (const f of failed) console.log(`FAIL ${f.name} — ${f.detail}`)
    process.exit(1)
  }
}

// Ventilation par unité d'un paiement, triée pour comparaison stable.
export const allocPairs = (p: PaymentDoc | undefined): [string, number][] =>
  (p?.appliedAllocation ?? []).map(a => [a.lineId, a.amountCents] as [string, number]).sort((a, b) => a[0].localeCompare(b[0]))

/**
 * GOAL_PAIEMENTS_00 — Audit baseline paiements (LECTURE SEULE).
 *
 * Mesure la dérive actuelle entre `table.paidCents` (argent réellement
 * encaissé sur la sitting) et la somme des `orderItems` marqués `paid: true`
 * (ce que le tableau « qui a payé quoi » affiche). C'est LA métrique que la
 * refonte (GOAL_PAIEMENTS_01 → 06) doit empêcher de progresser : ce script
 * sera rejoué à l'identique après le déploiement de la Phase 2.
 *
 * Zéro écriture : le script fait un `npx convex export` (snapshot lecture
 * seule) du déploiement DEV (scintillating-viper-372) puis analyse les JSONL
 * localement. Aucun contact avec la prod (mellow-chinchilla-481), aucune
 * mutation, aucun fichier convex modifié.
 *
 * Exécution : npx tsx e2e/scripts/audit-paiements-baseline.ts [snapshot.zip]
 *   - sans argument : exporte un snapshot frais de dev dans un dossier temp ;
 *   - avec argument : ré-analyse un snapshot déjà téléchargé (offline).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SPLITZY_DIR = path.resolve(import.meta.dirname, '../../../Splitzy')
const DEPLOYMENT = 'dev:scintillating-viper-372'

type OrderItem = { name: string; qty: number; unitCents: number; paid?: boolean; lineId?: string }
type TableDoc = {
  _id: string; restaurantId: string; number: number; status: string
  amountCents?: number; paidCents?: number; paidTipCents?: number
  sittingStartedAt?: number; orderItems?: OrderItem[]
}
type RestaurantDoc = { _id: string; name: string; slug: string }

function exportSnapshot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'splitzy-audit-'))
  const zip = path.join(dir, 'dev-snapshot.zip')
  console.log(`Export snapshot dev (${DEPLOYMENT}) → ${zip}`)
  execFileSync('npx', ['convex', 'export', '--path', zip], {
    cwd: SPLITZY_DIR,
    env: { ...process.env, CONVEX_DEPLOYMENT: DEPLOYMENT },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  return zip
}

function readJsonl<T>(dir: string, table: string): T[] {
  const file = path.join(dir, table, 'documents.jsonl')
  if (!fs.existsSync(file)) return []
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(l => l.trim().length > 0)
    .map(l => JSON.parse(l) as T)
}

const zipPath = process.argv[2] ?? exportSnapshot()
const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'splitzy-audit-extract-'))
execFileSync('unzip', ['-o', '-q', zipPath, '-d', extractDir], { stdio: 'inherit' })

const tables = readJsonl<TableDoc>(extractDir, 'tables')
const restaurants = readJsonl<RestaurantDoc>(extractDir, 'restaurants')
const restoName = new Map(restaurants.map(r => [r._id, `${r.name} (${r.slug})`]))

// ── 1. Tables auditées : orderItems non vide + status payment/paid ────────────
const audited = tables.filter(t =>
  (t.orderItems?.length ?? 0) > 0 && (t.status === 'payment' || t.status === 'paid'),
)

// ── 2. Dérive : paidCents vs Σ unitCents×qty des items paid:true ─────────────
type Drift = {
  table: TableDoc; paidCents: number; paidItemsCents: number; driftCents: number
}
const drifts: Drift[] = audited.map(t => {
  const paidCents = t.paidCents ?? 0
  const paidItemsCents = (t.orderItems ?? [])
    .filter(it => it.paid === true)
    .reduce((s, it) => s + it.qty * it.unitCents, 0)
  return { table: t, paidCents, paidItemsCents, driftCents: paidCents - paidItemsCents }
})
const withDrift = drifts.filter(d => d.driftCents !== 0)

// ── 3. Sittings en cours (heuristique : status dining/payment) ───────────────
const inProgress = tables.filter(t => t.status === 'dining' || t.status === 'payment')
const inProgressWithSitting = inProgress.filter(t => t.sittingStartedAt != null)

// ── 4. lineId — avant GOAL_01 : attendu 0 (check collision). Après le
// backfill de GOAL_01 : attendu = toutes les unités des sittings non libres.
// On signale seulement les DOUBLONS de lineId (vraie anomalie dans les deux cas).
let unitsTotal = 0
let unitsWithLineId = 0
const seenLineIds = new Set<string>()
const duplicateLineIds: string[] = []
for (const t of tables) {
  for (const it of t.orderItems ?? []) {
    unitsTotal += it.qty
    if (it.lineId !== undefined) {
      unitsWithLineId += it.qty
      if (seenLineIds.has(it.lineId)) duplicateLineIds.push(`table ${t.number} (${t._id}) item "${it.name}" lineId=${it.lineId}`)
      seenLineIds.add(it.lineId)
    }
  }
}

// ── Rapport ───────────────────────────────────────────────────────────────────
const now = new Date().toISOString()
console.log('')
console.log('════════════════════════════════════════════════════════════════')
console.log(`AUDIT BASELINE PAIEMENTS — dev ${DEPLOYMENT} — ${now}`)
console.log('════════════════════════════════════════════════════════════════')
console.log(`Tables totales dev                          : ${tables.length}`)
console.log(`Tables auditées (orderItems + payment/paid) : ${audited.length}`)
console.log(`  … dont avec dérive paidCents ≠ Σ items payés : ${withDrift.length}`)
console.log(`Sittings en cours (status dining/payment)   : ${inProgress.length}`)
console.log(`  … dont avec sittingStartedAt posé           : ${inProgressWithSitting.length}`)
console.log(`Unités d'orderItems (Σ qty, toutes tables)  : ${unitsTotal}`)
console.log(`Unités portant un lineId                    : ${unitsWithLineId} (0 attendu avant GOAL_01, tout ensuite)`)
if (duplicateLineIds.length) {
  console.log('  ⚠ lineId DUPLIQUÉS (anomalie) :')
  for (const c of duplicateLineIds) console.log(`    - ${c}`)
}
console.log('')
if (withDrift.length) {
  console.log('Détail des dérives (centimes ; + = argent encaissé non reflété')
  console.log('sur les items ; − = items marqués payés au-delà de l\'argent reçu) :')
  for (const d of withDrift) {
    const t = d.table
    console.log(
      `  - ${restoName.get(t.restaurantId) ?? t.restaurantId} · table ${t.number} [${t.status}] : ` +
      `paidCents=${d.paidCents} vs itemsPayés=${d.paidItemsCents} → dérive ${d.driftCents > 0 ? '+' : ''}${d.driftCents}`,
    )
  }
  const totalAbs = withDrift.reduce((s, d) => s + Math.abs(d.driftCents), 0)
  console.log(`  Ampleur totale (Σ |dérive|) : ${totalAbs} centimes`)
} else {
  console.log('Aucune dérive détectée sur les tables auditées.')
}
console.log('')
console.log('Tables auditées (détail complet) :')
for (const d of drifts) {
  const t = d.table
  const items = (t.orderItems ?? [])
    .map(it => `${it.qty}×${it.name}@${it.unitCents}${it.paid ? '✓' : ''}`)
    .join(', ')
  console.log(
    `  - ${restoName.get(t.restaurantId) ?? t.restaurantId} · table ${t.number} [${t.status}] ` +
    `note=${t.amountCents ?? '—'} payé=${d.paidCents} itemsPayés=${d.paidItemsCents} | ${items}`,
  )
}

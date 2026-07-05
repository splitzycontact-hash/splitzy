/**
 * GOAL — Fix affichage montant divisé par 2 sur l'écran de confirmation convive.
 * Validation UI (Playwright) sur le déploiement DEV Convex (scintillating-viper-372).
 * Aucun contact avec la prod.
 *
 * Scénario exact du bug (Le bar d'Alfred, 05/07/2026) rejoué sur le restaurant
 * E2E dédié : note 8€ (Coca-Cola 4,50€ + Cappuccino 3,50€), pourboire 10%,
 * puis lecture des 3 montants affichés sur /confirmation :
 *   A — Parts égales à 2   → attendu Sous-total 4€    / +0,40€ / 4,40€
 *       (bug : 2€ / 0,20€ / 2,20€ — le recalcul re-divise le restant après
 *        que le paiement a déjà incrémenté paidCents)
 *   B — Par article (Coca) → attendu Sous-total 4,50€ / +0,45€ / 4,95€
 *   C — Montant libre 3€   → attendu Sous-total 3€    / +0,30€ / 3,30€
 *
 * Exécution : npx tsx e2e/scripts/verify-confirmation-display.ts
 * Prérequis : dev server Vite sur http://localhost:5173 (npm run dev),
 * pointé sur le déploiement dev via .env.local.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'

const SPLITZY_DIR = path.resolve(import.meta.dirname, '../../../Splitzy')
const DEPLOYMENT = 'dev:scintillating-viper-372'

// Restaurant dédié E2E sur dev (« Resto Owner E2E », slug resto-owner-e2e,
// id jd73fccbqc79hpeh4g43nc6pj589dgpm).
const OWNER_SUBJECT = 'user_3FflExqtWyLeBI7UYLydTbMBebt'
const TABLE = { id: 'jh7d9g3p7qaq78v8r1a242y56989d6p5', number: 1 }
const SLUG = 'resto-owner-e2e'
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

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

// Note 8€ posée par le gérant : Coca-Cola 4,50€ + Cappuccino 3,50€.
// resetToFree puis updateStatus staff (wasFreshSitting) → paidCents purgé.
function seedTable() {
  convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })
  convexRun('tables:updateStatus', {
    tableId: TABLE.id,
    status: 'dining',
    amountCents: 800,
    orderItems: [
      { name: 'Coca-Cola', qty: 1, unitCents: 450 },
      { name: 'Cappuccino', qty: 1, unitCents: 350 },
    ],
  }, { asOwner: true })
}

// /t/… → Landing → Profile → Items (page montée quand le CTA est visible).
async function walkToItems(page: Page) {
  await page.goto(`${BASE}/t/${SLUG}/${TABLE.number}`)
  await page.getByRole('button', { name: /C'est parti/ }).click()
  // Deux inputs identiques dans le DOM (préview cachée + sheet), même state contrôlé.
  await page.getByPlaceholder('Ton prénom').filter({ visible: true }).fill('Testeur')
  await page.getByRole('button', { name: 'Rejoindre la table' }).click()
  await page.getByRole('button', { name: 'Valider ma part' }).waitFor()
}

type Amounts = { sousTotal: string | null; pourboire: string | null; total: string | null }

// Items → Tip 10% → Payment (carte) → lecture du reçu /confirmation.
async function payAndReadConfirmation(page: Page): Promise<Amounts> {
  await page.getByRole('button', { name: 'Valider ma part' }).click()
  await page.getByRole('button', { name: '10 %' }).click()
  await page.getByRole('button', { name: /^Payer \d/ }).click()
  await page.getByRole('button', { name: /^Payer avec/ }).click()
  await page.waitForURL('**/confirmation')

  // Lignes du reçu : label dans un div imbriqué, montant = span enfant direct
  // de la ligne (sauf Total payé : les 2 spans sont frères directs).
  // Lecture sur nœud attaché (indépendant de la visibilité Playwright) —
  // la vérité visuelle est doublée par un screenshot par cas.
  const sub = page.locator('xpath=//span[normalize-space()="Sous-total"]/../../span').first()
  const tip = page.locator('xpath=//span[starts-with(normalize-space(),"Pourboire")]/../../span').first()
  const tot = page.locator('xpath=//span[normalize-space()="Total payé"]/following-sibling::span').first()
  await tot.waitFor({ state: 'attached' })
  return {
    sousTotal: (await sub.textContent())?.trim() ?? null,
    pourboire: (await tip.textContent())?.trim() ?? null,
    total: (await tot.textContent())?.trim() ?? null,
  }
}

const CASES: { name: string; expect: Amounts; drive: (page: Page) => Promise<void> }[] = [
  {
    name: 'A — Parts égales à 2 (scénario du bug)',
    expect: { sousTotal: '4€', pourboire: '+0,40€', total: '4,40€' },
    drive: async page => {
      await page.getByRole('button', { name: 'Parts égales' }).click()
      // stepper déjà à 2 (défaut equalSplitCount = 2)
    },
  },
  {
    name: 'B — Par article (Coca-Cola seul)',
    expect: { sousTotal: '4,50€', pourboire: '+0,45€', total: '4,95€' },
    drive: async page => {
      await page.getByRole('button', { name: 'Par article' }).click()
      await page.getByRole('button', { name: /Coca-Cola/ }).click()
    },
  },
  {
    name: 'C — Montant libre 3€',
    expect: { sousTotal: '3€', pourboire: '+0,30€', total: '3,30€' },
    drive: async page => {
      await page.getByRole('button', { name: 'Montant libre' }).click()
      await page.locator('input[type="number"]').filter({ visible: true }).fill('3')
    },
  },
]

const results: { name: string; pass: boolean; detail: string }[] = []

const browser = await chromium.launch()
for (const c of CASES) {
  seedTable()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = ctx.pages()[0] ?? await ctx.newPage()
  try {
    await walkToItems(page)
    await c.drive(page)
    const got = await payAndReadConfirmation(page)
    const shot = process.env.SHOT_DIR
    if (shot) {
      await page.waitForTimeout(1200) // animations d'entrée du reçu (delay 0.4/0.5s)
      await page.screenshot({ path: path.join(shot, `${c.name[0]}.png`), fullPage: true })
    }
    const pass = got.sousTotal === c.expect.sousTotal
      && got.pourboire === c.expect.pourboire
      && got.total === c.expect.total
    const detail = `attendu ${c.expect.sousTotal} / ${c.expect.pourboire} / ${c.expect.total} — obtenu ${got.sousTotal} / ${got.pourboire} / ${got.total}`
    results.push({ name: c.name, pass, detail })
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${c.name} — ${detail}`)
  } catch (err) {
    results.push({ name: c.name, pass: false, detail: String(err) })
    console.log(`FAIL  ${c.name} — ${String(err)}`)
  } finally {
    await ctx.close()
  }
}
await browser.close()

// Nettoyage : table relâchée (les payments "En attente" créés restent, comme
// pour les autres scripts verify-* — restaurant E2E dédié).
convexRun('tables:resetToFree', { tableId: TABLE.id }, { asOwner: true })

const failed = results.filter(r => !r.pass)
console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) process.exit(1)

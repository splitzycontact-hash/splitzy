/**
 * GOAL_PAIEMENTS_13 §6 — Le montant suggéré en mode "diviser" se base sur le
 * RESTE À PAYER divisé par le nombre de parts choisi par les convives
 * (equalSplitCount, ajustable en séance), JAMAIS sur table.guests figé à
 * l'ouverture. Vérification statique du code client (useSessionCalcs +
 * écrans Items) — pas de mutation, aucune donnée touchée.
 * Exécution : npx tsx e2e/scripts/verify-equal-split-active-payers.ts
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(path.join(root, p), 'utf8')

const calcs = read('src/hooks/useSessionCalcs.ts')
const itemsNew = read('src/pages/Items.tsx')
const itemsLegacy = read('src/pages/ItemsLegacy.tsx')

const results: { name: string; pass: boolean }[] = []
const check = (name: string, actual: unknown, expected: unknown) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`)
}

// 1. La base du calcul est le reste à payer (facture - déjà payé), jamais le
//    total figé de la table.
check('useSessionCalcs : reste = facture - déjà payé',
  /remainingCents = Math\.max\(0, billCents - paidCents\)/.test(calcs), true)

// 2. En mode "equal", la part = reste ÷ equalSplitCount (nombre de payeurs
//    actifs, choisi et ajustable par les convives au moment de payer).
check('useSessionCalcs : part égale = reste ÷ equalSplitCount',
  /splitMode === 'equal'[\s\S]{0,120}remainingCents \/ state\.equalSplitCount/.test(calcs), true)

// 3. Aucune référence à guests (compteur figé à l'ouverture de la sitting)
//    dans le calcul des montants.
check('useSessionCalcs : aucun usage de table.guests', calcs.includes('guests'), false)

// 4. Écran neuf (ItemsNew) : la suggestion affichée suit la même règle.
check('Items.tsx : suggestion = reste ÷ equalSplitCount',
  /perPerson = remainingCents > 0 && state\.equalSplitCount > 0\s*\n?\s*\? Math\.round\(remainingCents \/ state\.equalSplitCount\)/.test(itemsNew), true)
check('Items.tsx : aucun usage de table.guests', itemsNew.includes('guests'), false)

// 5. Écran legacy : même règle (les restos hors allowlist restent justes).
check('ItemsLegacy.tsx : suggestion = reste ÷ equalSplitCount',
  /perPerson = remainingCents > 0 && state\.equalSplitCount > 0\s*\n?\s*\? Math\.round\(remainingCents \/ state\.equalSplitCount\)/.test(itemsLegacy), true)
check('ItemsLegacy.tsx : aucun usage de table.guests', itemsLegacy.includes('guests'), false)

const failed = results.filter(r => !r.pass)
console.log(`\n=== Résultat : ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) process.exit(1)

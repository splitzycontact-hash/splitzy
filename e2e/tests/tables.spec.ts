import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

// Adapté au DOM réel de Tables.tsx :
//  - "ouvrir" une table = bouton Play (aria "Ouvrir") → modale "Ajouter un article"
//  - "simuler" = bouton [TEST] "Simuler commande" → modale avec Total
//  - "clôturer" = modale détail → "Libérer la table" (déclenche les confettis)
// Il n'existe pas de mode VIP / forcePayment dans ce composant → scénario 6 omis.

test.describe('Tables — gestion (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/tables', /Tables live/)
  })

  test('Scénario 1 — la grille de tables (ou l\'état vide) est visible', async ({ page }) => {
    const cards = page.locator('[data-testid^="table-card-"]')
    const empty = page.getByText('Aucune table configurée')
    await expect(cards.first().or(empty)).toBeVisible({ timeout: 15_000 })
    // Barre de filtres présente.
    await expect(page.getByRole('button', { name: /Toutes/ })).toBeVisible()
  })

  test('Scénario 2 — ouvrir une table libre ouvre la modale d\'ajout', async ({ page }) => {
    const openBtn = page.getByRole('button', { name: 'Ouvrir' }).first()
    test.skip((await openBtn.count()) === 0, 'Aucune table libre dans ce service.')
    await openBtn.click()
    await expect(page.getByText(/Ajouter un article — Table/)).toBeVisible()
    await page.getByRole('button', { name: 'Fermer' }).click()
  })

  test('Scénario 3 — simuler une commande affiche un total', async ({ page }) => {
    const simBtn = page.getByRole('button', { name: /Simuler commande/ }).first()
    test.skip((await simBtn.count()) === 0, 'Aucun bouton Simuler (rôle viewer ?).')
    await simBtn.click()
    await expect(page.getByText(/Simuler — Table/)).toBeVisible()
    // Menu présent → total ; menu vide (resto neuf, pas de sync Square) → message.
    const total = page.getByText('Total', { exact: true })
    const noItems = page.getByText(/Aucun article/)
    await expect(total.or(noItems).first()).toBeVisible()
    await page.getByRole('button', { name: 'Annuler' }).click()
  })

  test('Scénario 4 — la modale détail propose de libérer la table (confettis montés)', async ({ page }) => {
    const card = page.locator('[data-testid^="table-card-"]:not([data-status="free"])').first()
    test.skip((await card.count()) === 0, 'Aucune table active à clôturer.')
    await card.getByRole('button', { name: 'Voir' }).click()
    await expect(page.getByRole('button', { name: 'Libérer la table' })).toBeVisible()
    // Le canvas confetti est monté dans la page (déclenché au reset).
    await expect(page.getByTestId('confetti-canvas')).toBeAttached()
  })
})

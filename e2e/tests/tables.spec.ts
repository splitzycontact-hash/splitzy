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
    // Attendre que Convex ait résolu la liste des tables avant chaque test —
    // le h1 apparaît avant la réponse de la query, ce qui causait des faux skips.
    await expect(
      page.locator('[data-testid^="table-card-"]').first()
        .or(page.getByText('Aucune table configurée')),
    ).toBeVisible({ timeout: 12_000 })
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
    await page.getByRole('button', { name: 'Annuler' }).click()
  })

  test('Scénario 3 — simuler une commande affiche un total ou un état vide', async ({ page }) => {
    const simBtn = page.locator('button').filter({ hasText: 'Simuler commande' }).first()
    test.skip((await simBtn.count()) === 0, 'Aucun bouton Simuler (rôle viewer ?).')
    await simBtn.click()
    await expect(page.getByText(/Simuler — Table/)).toBeVisible()
    // Menu réel → Total ; menu vide (resto neuf, pas de sync Square) → "Aucun article".
    const total = page.getByText('Total', { exact: true })
    const noItems = page.getByText(/Aucun article/)
    await expect(total.or(noItems).first()).toBeVisible()
    await page.getByRole('button', { name: 'Annuler' }).click()
  })

  test('Scénario 4 — la modale détail propose de libérer une table active', async ({ page }) => {
    let card = page.locator('[data-testid^="table-card-"]:not([data-status="free"])').first()

    if ((await card.count()) === 0) {
      // Aucune table active → en créer une via "Ouvrir" + ajout d'un article.
      // AddItemModal utilise DEMO_MENU comme fallback si le resto n'a pas de menu,
      // donc ce scénario fonctionne même sur un restaurant de test vierge.
      const openBtn = page.getByRole('button', { name: 'Ouvrir' }).first()
      test.skip((await openBtn.count()) === 0, 'Aucune table libre ni active disponible.')

      await openBtn.click()
      await expect(page.getByText(/Ajouter un article — Table/)).toBeVisible()

      // Cliquer sur le premier article (aria-label="Ajouter <nom>")
      await page.locator('button[aria-label^="Ajouter"]').first().click()

      // Confirmer ("Ajouter N article(s) · XX,XX €")
      await page.locator('button').filter({ hasText: /Ajouter \d+ article/ }).click()

      // Attendre que la table passe en "dining"
      card = page.locator('[data-testid^="table-card-"]:not([data-status="free"])').first()
      await expect(card).toBeVisible({ timeout: 15_000 })
    }

    // Ouvrir le détail et vérifier "Libérer la table" + canvas confetti
    await card.getByRole('button', { name: 'Voir' }).click()
    await expect(page.getByRole('button', { name: 'Libérer la table' })).toBeVisible()
    await expect(page.getByTestId('confetti-canvas')).toBeAttached()

    // Nettoyage : remettre la table à l'état libre pour ne pas polluer les runs suivants
    await page.getByRole('button', { name: 'Libérer la table' }).click()
  })
})

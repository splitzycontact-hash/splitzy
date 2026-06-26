import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

// NB : le h1 de /restaurant/salle est "Service". L'assignation serveur↔table se
// fait par drag-and-drop (dnd-kit) → non couverte ici (fragile en E2E).

test.describe('Salle / Plan de service (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — la grille du plan de salle charge', async ({ page }) => {
    await gotoPage(page, '/salle', /Service/)
    // Grille si des tables sont positionnées, sinon l'état vide (resto neuf).
    const grid = page.getByTestId('floor-grid')
    const emptyState = page.getByText(/Aucune table positionnée|Placez vos tables/)
    await expect(grid.or(emptyState).first()).toBeVisible({ timeout: 15_000 })
  })
})

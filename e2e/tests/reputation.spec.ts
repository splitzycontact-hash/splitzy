import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Réputation (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — la page réputation charge', async ({ page }) => {
    await gotoPage(page, '/reputation', /Réputation/)
    // Liste de feedbacks ou état vide — le contenu principal est rendu.
    await expect(page.locator('main')).toBeVisible()
  })
})

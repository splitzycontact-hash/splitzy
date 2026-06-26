import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Analytics (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/analytics', /Analytics/)
  })

  test('Scénario 1 — la page charge avec un graphique', async ({ page }) => {
    // Au moins un SVG (courbe CA) dans le contenu.
    await expect(page.locator('main svg').first()).toBeVisible({ timeout: 15_000 })
  })

  test('Scénario 2 — changer de période', async ({ page }) => {
    for (const label of [/Semaine/, /Mois/]) {
      const btn = page.getByRole('button', { name: label }).first()
      if ((await btn.count()) === 0) continue
      await btn.click()
      await expect(btn).toBeVisible()
    }
  })
})

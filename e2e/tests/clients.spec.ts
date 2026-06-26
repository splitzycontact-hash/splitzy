import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Clients (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — la page clients charge (liste ou état vide)', async ({ page }) => {
    await gotoPage(page, '/clients', /Clients/)
    await expect(page.locator('main')).toBeVisible()
  })
})

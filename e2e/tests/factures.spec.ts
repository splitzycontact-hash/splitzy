import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Factures (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — la page factures charge (liste ou état vide)', async ({ page }) => {
    await gotoPage(page, '/factures', /Factures/)
    await expect(page.locator('main')).toBeVisible()
  })
})

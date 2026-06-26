import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Planning (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — la page planning charge', async ({ page }) => {
    await gotoPage(page, '/planning', /Planning/)
    await expect(page.locator('main')).toBeVisible()
  })
})

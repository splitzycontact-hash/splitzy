import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Chat équipe (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/chat', /Chat équipe/)
  })

  test('Scénario 1 — la page chat charge avec son champ de saisie', async ({ page }) => {
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 15_000 })
  })

  test('Scénario 2 — envoyer un message (Entrée)', async ({ page }) => {
    const input = page.locator('textarea').first()
    const msg = `E2E ${Date.now()}`
    await input.fill(msg)
    await input.press('Enter')
    await expect(page.getByText(msg).first()).toBeVisible({ timeout: 15_000 })
  })
})

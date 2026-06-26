import { test, expect, memberReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

// Scénario 2 — un manager accède aux pages owner+manager mais PAS à
// /integrations (RoleGuard owner-only → redirect vers /restaurant).
test.describe('Accès par rôle — manager', () => {
  test.skip(!memberReady, SKIP_AUTH_REASON)

  test('manager accède à /salle', async ({ page }) => {
    await gotoPage(page, '/salle', /Service/)
  })

  test('manager accède à /clients', async ({ page }) => {
    await gotoPage(page, '/clients', /Clients/)
  })

  test('manager est redirigé depuis /integrations', async ({ page }) => {
    await page.goto('/restaurant/integrations')
    await expect(page).toHaveURL(/\/restaurant(\/)?$/, { timeout: 20_000 })
    await expect(page.locator('h1').filter({ hasText: /Intégrations/ })).toHaveCount(0)
  })
})

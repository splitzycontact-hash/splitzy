import { test, expect, memberReady, SKIP_AUTH_REASON } from '../fixtures/base'

// Session membre (manager) requise → skippé tant que e2e/.env.test n'a pas de
// TEST_MEMBER_* valides.

test.describe('Onboarding — membre existant', () => {
  test.skip(!memberReady, SKIP_AUTH_REASON)

  test('Scénario 2 — un membre est redirigé depuis onboarding vers le dashboard', async ({ page }) => {
    await page.goto('/restaurant/onboarding')
    await expect(page).toHaveURL(/\/restaurant(\/)?$/, { timeout: 20_000 })
    // Le formulaire d'onboarding ne doit pas être visible.
    await expect(page.getByText('Créez votre compte restaurant')).toHaveCount(0)
  })
})

import { test, expect } from '../fixtures/base'

// NB : contrairement au brief (qui attendait un redirect vers sign-in), la route
// /restaurant/onboarding n'est PAS derrière RestaurantAuthGuard. Non connecté,
// elle affiche directement le formulaire d'inscription Clerk (<SignUp>). On teste
// donc le comportement réel.

test.describe('Onboarding — non authentifié', () => {
  test("Scénario 1 — onboarding non connecté affiche la création de compte", async ({ page }) => {
    await page.goto('/restaurant/onboarding')
    await expect(page.getByText('Créez votre compte restaurant')).toBeVisible({ timeout: 15_000 })
    // Formulaire Clerk d'inscription monté.
    await expect(page.locator('input').first()).toBeVisible({ timeout: 20_000 })
  })
})

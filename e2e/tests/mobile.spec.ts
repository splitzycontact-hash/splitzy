import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { openDashboard } from '../fixtures/helpers'

// Projet mobile-safari (iPhone 14, session owner). NB : il n'existe pas de bouton
// FAB dans Tables.tsx → scénario 2 du brief omis.

test.describe('Mobile (iPhone 14, owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — nav mobile visible, sidebar desktop cachée', async ({ page }) => {
    await page.goto('/restaurant')
    await expect(page.getByTestId('mobile-nav')).toBeVisible({ timeout: 20_000 })
    // La sidebar desktop est `hidden md:flex` → invisible en viewport mobile.
    await expect(page.getByTestId('sidebar')).toBeHidden()
  })

  test('Scénario 3 — navigation via la barre du bas', async ({ page }) => {
    await openDashboard(page).catch(() => {}) // sidebar cachée en mobile : on ne bloque pas dessus
    await page.goto('/restaurant')
    const nav = page.getByTestId('mobile-nav')
    await nav.getByRole('link', { name: /Tables/ }).click()
    await expect(page.locator('h1').filter({ hasText: /Tables live/ }).first()).toBeVisible()
    await nav.getByRole('link', { name: /Réputation/ }).click()
    await expect(page.locator('h1').filter({ hasText: /Réputation/ }).first()).toBeVisible()
    // Pas de débordement horizontal.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(2)
  })
})

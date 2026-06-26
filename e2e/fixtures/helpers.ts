import { expect, type Page } from '@playwright/test'

// Aides communes aux specs authentifiées. Toutes supposent une session valide
// (les specs appellent test.skip(!authReady) en amont).

/** Va sur /restaurant et attend que le dashboard (sidebar) soit monté. */
export async function openDashboard(page: Page) {
  await page.goto('/restaurant')
  await expect(page.getByTestId('sidebar')).toBeVisible({ timeout: 20_000 })
}

/**
 * Navigue vers une page du dashboard et vérifie le titre (h1 du PageHeader).
 * `path` est relatif à /restaurant (ex: '/tables').
 */
export async function gotoPage(page: Page, path: string, headerRe: RegExp) {
  await page.goto(`/restaurant${path}`)
  await expect(page.locator('h1').filter({ hasText: headerRe }).first()).toBeVisible({
    timeout: 20_000,
  })
}

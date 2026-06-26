import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { openDashboard } from '../fixtures/helpers'

test.describe('Dashboard — Overview (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test.beforeEach(async ({ page }) => {
    await openDashboard(page)
  })

  test('Scénario 1 — les 4 KPIs + la sidebar sont présents', async ({ page }) => {
    for (const id of ['kpi-ca', 'kpi-tables', 'kpi-score', 'kpi-tips']) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('Scénario 2 — la navigation sidebar change la page', async ({ page }) => {
    const sidebar = page.getByTestId('sidebar')
    const targets: { name: string; header: RegExp }[] = [
      { name: 'Tables live', header: /Tables live/ },
      { name: 'Réputation', header: /Réputation/ },
      { name: 'Analytics', header: /Analytics/ },
    ]
    for (const t of targets) {
      await sidebar.getByRole('link', { name: t.name }).click()
      await expect(page.locator('h1').filter({ hasText: t.header }).first()).toBeVisible()
    }
  })

  test('Scénario 3 — Score Splitzy : arc SVG + barème /100', async ({ page }) => {
    const score = page.getByTestId('kpi-score')
    await expect(score.locator('svg').first()).toBeVisible()
    await expect(score.getByText('/ 100')).toBeVisible()
  })

  test('Scénario 4 — panel Insights IA visible', async ({ page }) => {
    await expect(page.getByText('Insights IA').first()).toBeVisible()
  })

  test('Scénario 5 — bascule du thème (dark mode)', async ({ page }) => {
    const root = page.locator('.restaurant-root')
    const before = await root.getAttribute('data-theme')
    await page.getByRole('button', { name: 'Basculer le thème clair/sombre' }).first().click()
    await expect(root).not.toHaveAttribute('data-theme', before ?? '')
  })
})

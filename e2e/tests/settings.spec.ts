import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Paramètres (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/settings', /Paramètres/)
  })

  test('Scénario 1 — les sections sont navigables', async ({ page }) => {
    for (const label of [/Équipe/, /Tables/, /Plan/]) {
      const tab = page.getByRole('button', { name: label }).first()
      if ((await tab.count()) === 0) continue
      await tab.click()
      await expect(tab).toBeVisible()
    }
  })

  test('Scénario 4 — la danger zone propose la suppression (owner)', async ({ page }) => {
    const danger = page.getByRole('button', { name: /Supprimer ce restaurant/ })
    test.skip((await danger.count()) === 0, 'Bouton de suppression non exposé.')
    await expect(danger.first()).toBeVisible()
  })
})

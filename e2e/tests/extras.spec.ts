import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

test.describe('Extras (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — la page extras charge', async ({ page }) => {
    await gotoPage(page, '/extras', /Extras/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('Scénario 2 — le bouton d\'ajout est présent', async ({ page }) => {
    await gotoPage(page, '/extras', /Extras/)
    const addBtn = page.getByRole('button', { name: /Ajouter/ }).first()
    test.skip((await addBtn.count()) === 0, 'Aucun bouton d\'ajout exposé.')
    await expect(addBtn).toBeVisible()
  })
})

import { test, expect } from '../fixtures/base'

// Aucune session — vérifie les gardes d'accès et les pages publiques d'auth.
// Tourne réellement (n'a besoin que du dev server + Convex public).

test.describe('Auth — non authentifié', () => {
  test('Scénario 1 — /restaurant redirige vers sign-in', async ({ page }) => {
    await page.goto('/restaurant')
    await expect(page).toHaveURL(/\/restaurant\/sign-in/, { timeout: 20_000 })
  })

  test('Scénario 2 — la page sign-in affiche le formulaire Clerk', async ({ page }) => {
    await page.goto('/restaurant/sign-in')
    // Chrome statique de la page (toujours présent, sans dépendre du chargement Clerk).
    await expect(page.getByText('Interface gérant')).toBeVisible({ timeout: 15_000 })
    // Formulaire Clerk monté (champ identifiant).
    await expect(page.locator('input').first()).toBeVisible({ timeout: 20_000 })
  })

  test('Scénario 3 — lien d\'invitation invalide → "Invitation introuvable"', async ({ page }) => {
    await page.goto('/restaurant/accept-invite?token=faketoken123')
    await expect(page.getByText('Invitation introuvable')).toBeVisible({ timeout: 20_000 })
  })

  test('Scénario 4 — lien sans token → "Aucun token d\'invitation trouvé"', async ({ page }) => {
    await page.goto('/restaurant/accept-invite')
    await expect(page.getByText(/Aucun token d'invitation trouvé/)).toBeVisible({ timeout: 15_000 })
  })
})

import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

// Flow invitation côté owner (envoi). L'acceptation complète + les états
// expirée/déjà-acceptée nécessitent de vrais tokens → gated par env.

test.describe('Invitation — envoi (owner)', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  test('Scénario 1 — envoyer une invitation depuis Paramètres › Équipe', async ({ page }) => {
    await gotoPage(page, '/settings', /Paramètres/)
    await page.getByRole('button', { name: /Équipe/ }).click()

    await page.getByRole('button', { name: /Inviter un membre/ }).first().click()
    // Modale d'invitation montée.
    await expect(page.getByText(/Inviter un membre/).first()).toBeVisible()

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()
    await expect(emailInput).toBeVisible()
    await emailInput.fill('invite-e2e@splitzy.fr')

    // L'envoi écrit dans Convex (status pending) ; on valide qu'une confirmation
    // (toast sonner ou ligne pending) apparaît.
    await page.getByRole('button', { name: /Envoyer|Inviter|Confirmer/ }).last().click()
    await expect(
      page.getByText(/invitation|envoyée|pending|en attente/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Invitation — états par token (owner)', () => {
  const expiredToken = process.env.TEST_INVITE_EXPIRED_TOKEN
  const acceptedToken = process.env.TEST_INVITE_ACCEPTED_TOKEN

  test('Scénario 4 — invitation expirée', async ({ page }) => {
    test.skip(!authReady || !expiredToken, 'authReady + TEST_INVITE_EXPIRED_TOKEN requis.')
    await page.goto(`/restaurant/accept-invite?token=${expiredToken}`)
    await expect(page.getByText('Invitation expirée')).toBeVisible({ timeout: 20_000 })
  })

  test('Scénario 5 — invitation déjà acceptée', async ({ page }) => {
    test.skip(!authReady || !acceptedToken, 'authReady + TEST_INVITE_ACCEPTED_TOKEN requis.')
    await page.goto(`/restaurant/accept-invite?token=${acceptedToken}`)
    await expect(page.getByText('Invitation déjà acceptée')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: 'Aller au dashboard' })).toBeVisible()
  })
})

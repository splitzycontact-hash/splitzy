import { test, expect } from '../fixtures/base'

// Scénario localStorage du flow invitation — testable SANS session, mais nécessite
// un VRAI token d'invitation `pending` (sinon la page affiche "Invitation
// introuvable" et le bouton "Se connecter pour accepter" n'apparaît jamais).
// Fournir le token via TEST_INVITE_TOKEN dans e2e/.env.test pour activer ce test.

const inviteToken = process.env.TEST_INVITE_TOKEN

test.describe('Invitation — stockage du token (non authentifié)', () => {
  test.skip(
    !inviteToken,
    'TEST_INVITE_TOKEN absent — fournir un token d\'invitation pending (voir e2e/README.md).',
  )

  test('Scénario 2 — le token est stocké en localStorage (pas sessionStorage)', async ({ page }) => {
    await page.goto(`/restaurant/accept-invite?token=${inviteToken}`)

    // Invitation valide & pending → bouton de connexion visible.
    const signInBtn = page.getByRole('button', { name: /Se connecter pour accepter/ })
    await expect(signInBtn).toBeVisible({ timeout: 20_000 })

    await signInBtn.click()

    const stored = await page.evaluate(() => ({
      local: localStorage.getItem('pendingInviteToken'),
      session: sessionStorage.getItem('pendingInviteToken'),
    }))
    expect(stored.local).toBe(inviteToken)
    expect(stored.session).toBeNull()
  })
})

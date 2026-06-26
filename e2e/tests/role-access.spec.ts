import { test, expect, authReady, SKIP_AUTH_REASON } from '../fixtures/base'
import { gotoPage } from '../fixtures/helpers'

// Scénario 1 — owner accède à toutes les pages protégées.
test.describe('Accès par rôle — owner', () => {
  test.skip(!authReady, SKIP_AUTH_REASON)

  const pages: { path: string; header: RegExp }[] = [
    { path: '/salle', header: /Service/ },
    { path: '/clients', header: /Clients/ },
    { path: '/planning', header: /Planning/ },
    { path: '/extras', header: /Extras/ },
    { path: '/settings', header: /Paramètres/ },
    { path: '/integrations', header: /Intégrations/ },
  ]

  for (const p of pages) {
    test(`owner accède à ${p.path}`, async ({ page }) => {
      await gotoPage(page, p.path, p.header)
      await expect(page).toHaveURL(new RegExp(`/restaurant${p.path}`))
    })
  }
})

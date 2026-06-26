import { defineConfig, devices } from '@playwright/test'

// Suffixes de fichiers → projets :
//   *.unauth.spec.ts  → projet "unauth"        (aucune session Clerk)
//   *.member.spec.ts  → projet "chrome-member" (session manager)
//   *.mobile.spec.ts  → projet "mobile-safari" (iPhone 14, session owner)
//   tout le reste     → projet "chrome-owner"  (session owner)
//
// Les sessions auth sont créées par e2e/global-setup.ts et écrites dans
// e2e/.auth/. Sans identifiants Clerk de test (voir e2e/README.md), les
// projets authentifiés SKIPPENT proprement (run vert) via le flag `authReady`
// exporté par e2e/fixtures/base.ts. Les tests *.unauth.spec.ts tournent
// toujours (ils n'ont besoin que du dev server + Convex public).

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,          // Convex a des limites de concurrence
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                    // séquentiel — évite la contention Convex / dev server
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Démarre automatiquement le dev server Vite si aucun n'écoute déjà sur 5173.
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  projects: [
    // Desktop Chrome — propriétaire (session owner)
    {
      name: 'chrome-owner',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/owner.json',
      },
      testMatch: /\.spec\.ts$/,
      testIgnore: [/unauth\.spec\.ts$/, /member\.spec\.ts$/, /mobile\.spec\.ts$/],
    },
    // Desktop Chrome — membre (session manager)
    {
      name: 'chrome-member',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/member.json',
      },
      testMatch: /member\.spec\.ts$/,
    },
    // Mobile Safari (iPhone 14) — session owner
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
        storageState: 'e2e/.auth/owner.json',
      },
      testMatch: /mobile\.spec\.ts$/,
    },
    // Pages publiques / redirections — aucune session
    {
      name: 'unauth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /unauth\.spec\.ts$/,
    },
  ],
})

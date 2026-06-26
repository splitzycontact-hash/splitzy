import { test as base, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Lu une seule fois par worker au chargement du module. global-setup.ts écrit
// e2e/.auth/status.json AVANT le spawn des workers, donc la valeur est fiable.
// authReady === true uniquement si une vraie session owner a pu être créée.
const STATUS_PATH = path.join(__dirname, '..', '.auth', 'status.json')

function readStatus(): { authReady?: boolean; memberReady?: boolean } {
  try {
    return JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'))
  } catch {
    return {}
  }
}

const status = readStatus()

/** Vrai si une session owner Clerk a été créée (sinon les specs authentifiées skippent). */
export const authReady = status.authReady === true
/** Vrai si une session manager Clerk a été créée. */
export const memberReady = status.memberReady === true

export const SKIP_AUTH_REASON =
  'Session Clerk de test absente — renseignez e2e/.env.test (voir e2e/README.md).'

type Fixtures = {
  restaurantPage: string
}

export const test = base.extend<Fixtures>({
  restaurantPage: ['/restaurant', { option: true }],
})

export { expect }

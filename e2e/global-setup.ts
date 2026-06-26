import { chromium, type FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Crée les sessions Clerk (owner + manager) et les sauvegarde dans e2e/.auth/.
//
// IMPORTANT — dégradation gracieuse : sans identifiants Clerk de test réels
// (CLERK_SECRET_KEY + TEST_OWNER_EMAIL/PASSWORD dans e2e/.env.test), on
// n'échoue PAS. On écrit des storageState vides + status.json {authReady:false}
// et les specs authentifiées se SKIPPENT (cf. e2e/fixtures/base.ts → authReady).
// Le run reste vert ; seules les specs *.unauth tournent réellement.
// Voir e2e/README.md pour activer l'auth réelle.

const AUTH_DIR = path.join(__dirname, '.auth')
const EMPTY_STATE = { cookies: [], origins: [] }

function isPlaceholder(v?: string | null): boolean {
  return !v || v.trim() === '' || v.includes('XXXX')
}

async function globalSetup(config: FullConfig) {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

  const ownerPath = path.join(AUTH_DIR, 'owner.json')
  const memberPath = path.join(AUTH_DIR, 'member.json')
  const statusPath = path.join(AUTH_DIR, 'status.json')

  // Toujours garantir des storageState valides : les projets authentifiés
  // référencent ces fichiers et planteraient au chargement s'ils manquaient.
  fs.writeFileSync(ownerPath, JSON.stringify(EMPTY_STATE))
  fs.writeFileSync(memberPath, JSON.stringify(EMPTY_STATE))

  const secret = process.env.CLERK_SECRET_KEY
  const pub = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? process.env.CLERK_PUBLISHABLE_KEY
  const ownerEmail = process.env.TEST_OWNER_EMAIL
  const memberEmail = process.env.TEST_MEMBER_EMAIL

  // Auth via "sign-in token" (Clerk Backend API) plutôt que mot de passe : ça
  // contourne password ET 2FA/MFA — robuste en headless. Besoin de la clé
  // secrète + de l'email du compte de test (pas du mot de passe).
  const credsOk =
    !isPlaceholder(secret) &&
    !isPlaceholder(pub) &&
    !isPlaceholder(ownerEmail)

  if (!credsOk) {
    fs.writeFileSync(
      statusPath,
      JSON.stringify({
        authReady: false,
        memberReady: false,
        reason: 'Identifiants Clerk de test absents — voir e2e/README.md',
      }),
    )
    console.warn(
      '\n[e2e global-setup] ⚠ Identifiants Clerk de test absents.\n' +
        '  → Les tests authentifiés (owner/member/mobile) seront SKIPPÉS.\n' +
        '  → Renseignez e2e/.env.test (CLERK_SECRET_KEY, TEST_OWNER_EMAIL,\n' +
        '    TEST_MEMBER_EMAIL) pour les activer. Détails : e2e/README.md\n',
    )
    return
  }

  // ── Auth réelle via sign-in token ─────────────────────────────────────────
  const { clerkSetup, setupClerkTestingToken } = await import('@clerk/testing/playwright')
  await clerkSetup()

  const baseURL =
    config.projects.find(p => p.use?.baseURL)?.use?.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    'http://localhost:5173'

  const CLERK_API = 'https://api.clerk.com/v1'

  // Crée un sign-in token Clerk (Backend API) pour l'email donné. Ce ticket
  // ouvre une session SANS mot de passe ni 2FA → fiable en CI/headless.
  async function mintTicket(email: string): Promise<string> {
    const ures = await fetch(`${CLERK_API}/users?email_address=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    })
    const users = (await ures.json()) as Array<{ id: string }>
    const userId = users[0]?.id
    if (!userId) throw new Error(`Utilisateur Clerk introuvable pour ${email}`)
    const tres = await fetch(`${CLERK_API}/sign_in_tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    const tok = (await tres.json()) as { token?: string }
    if (!tok.token) throw new Error(`sign_in_token échoué pour ${email}: ${JSON.stringify(tok)}`)
    return tok.token
  }

  const convexUrl = (process.env.VITE_CONVEX_URL ?? '').replace(/^wss?:\/\//, 'https://')
  const NAME_INPUT = 'input[placeholder="Le Comptoir Parisien"]'

  type Page = Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>['newPage']>>

  // Appel Convex authentifié via l'API HTTP, avec le JWT Clerk (template "convex")
  // de la session courante. Sert à provisionner owner↔manager côté backend.
  async function convexAuthed<T>(
    kind: 'query' | 'mutation' | 'action',
    path: string,
    args: object,
    jwt: string,
  ): Promise<T> {
    const res = await fetch(`${convexUrl}/api/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ path, format: 'json', args: [args] }),
    })
    const data = (await res.json()) as
      | { status: 'success'; value: T }
      | { status: 'error'; errorMessage: string }
    if (data.status === 'error') throw new Error(`${path}: ${data.errorMessage}`)
    return data.value
  }

  // Connecte la page via un sign-in token (ticket) → contourne password + 2FA.
  async function signInWithTicket(page: Page, email: string): Promise<void> {
    await setupClerkTestingToken({ page })
    const ticket = await mintTicket(email)
    await page.goto(`${baseURL}/restaurant/sign-in`)
    await page.waitForFunction(
      () => !!(window as unknown as { Clerk?: { loaded?: boolean } }).Clerk?.loaded,
      { timeout: 20_000 },
    )
    const ok = await page.evaluate(async (ticket) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (window as any).Clerk
      const si = await c.client.signIn.create({ strategy: 'ticket', ticket })
      if (si.status === 'complete') {
        await c.setActive({ session: si.createdSessionId })
        return true
      }
      return false
    }, ticket)
    if (!ok) throw new Error('sign-in par ticket non complété')
  }

  // JWT Convex de la session (template Clerk "convex", qui émet le claim email).
  async function getConvexJwt(page: Page): Promise<string> {
    const jwt = await page.evaluate(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Clerk.session.getToken({ template: 'convex' }),
    )
    if (!jwt) throw new Error('JWT Convex introuvable (template "convex" ?)')
    return jwt as string
  }

  const browser = await chromium.launch()
  let ownerReady = false
  let memberReady = false

  // ── Owner : connexion + onboarding si besoin → owner.json + (jwt, restaurant) ─
  async function provisionOwner(): Promise<{ jwt: string; restaurantId: string; name: string } | null> {
    const page = await browser.newPage()
    try {
      await signInWithTicket(page, ownerEmail!)
      await page.goto(`${baseURL}/restaurant`)
      // RestaurantGuard résout via Convex PUIS redirige → on attend l'un des deux
      // états terminaux (dashboard OU onboarding), sans tester l'URL (course).
      await page.waitForSelector(`[data-testid="sidebar"], ${NAME_INPUT}`, { timeout: 30_000 })

      if ((await page.locator(NAME_INPUT).count()) > 0) {
        console.log('[e2e global-setup] Onboarding owner → création de "Resto Owner E2E"')
        await page.fill(NAME_INPUT, 'Resto Owner E2E')
        await page.fill('input[placeholder="12 rue de Rivoli, 75004 Paris"]', '1 rue de Test, 75001 Paris')
        await page.fill('input[placeholder="01 42 33 44 55"]', '0100000000')
        await page.fill('input[placeholder="gerant@restaurant.fr"]', ownerEmail!)
        await page.getByRole('button', { name: 'Étape suivante' }).click()
        await page.getByText('Étape 2 sur 4').waitFor({ timeout: 10_000 })
        await page.getByRole('button', { name: 'Étape suivante' }).click()
        await page.getByText('Étape 3 sur 4').waitFor({ timeout: 10_000 })
        await page.getByRole('button', { name: 'Étape suivante' }).click()
        await page.getByText('Étape 4 sur 4').waitFor({ timeout: 10_000 })
        await page.getByRole('button', { name: 'Accéder au tableau de bord' }).click()
        await page.waitForSelector('[data-testid="sidebar"]', { timeout: 30_000 })
      }

      await page.context().storageState({ path: ownerPath })
      const jwt = await getConvexJwt(page)
      const resto = await convexAuthed<{ _id: string; name: string } | null>(
        'query', 'restaurants:getByClerkId', {}, jwt,
      )
      if (!resto) throw new Error('restaurant owner introuvable après onboarding')
      return { jwt, restaurantId: resto._id, name: resto.name }
    } catch (e) {
      console.warn('[e2e global-setup] provision owner échoué:', (e as Error).message)
      return null
    } finally {
      await page.close()
    }
  }

  // ── Manager : devient un VRAI membre (role manager) du restaurant de l'owner ──
  // 1) on supprime un éventuel restaurant possédé par le manager (sinon
  //    getByClerkId gagne et il serait traité en owner, pas en membre).
  // 2) il accepte l'invitation → ligne `members` (role manager) avec son clerkUserId.
  async function provisionManager(inviteToken: string): Promise<boolean> {
    const page = await browser.newPage()
    try {
      await signInWithTicket(page, memberEmail!)
      const jwt = await getConvexJwt(page)
      const owned = await convexAuthed<{ _id: string } | null>(
        'query', 'restaurants:getByClerkId', {}, jwt,
      )
      if (owned) {
        await convexAuthed('mutation', 'restaurants:deleteAll', { id: owned._id }, jwt)
        console.log('[e2e global-setup] restaurant possédé par le manager supprimé (→ vrai membre)')
      }
      // Auto-acceptation au montage (manager connecté + invitation pending + email match).
      await page.goto(`${baseURL}/restaurant/accept-invite?token=${inviteToken}`)
      await page.waitForSelector('[data-testid="sidebar"]', { timeout: 30_000 })
      await page.context().storageState({ path: memberPath })
      return true
    } catch (e) {
      console.warn('[e2e global-setup] provision manager échoué:', (e as Error).message)
      return false
    } finally {
      await page.close()
    }
  }

  const owner = await provisionOwner()
  ownerReady = owner !== null

  if (owner && !isPlaceholder(memberEmail)) {
    try {
      const inv = await convexAuthed<{ token: string }>(
        'action', 'invitations:create',
        { restaurantId: owner.restaurantId, email: memberEmail, role: 'manager', restaurantName: owner.name },
        owner.jwt,
      )
      if (inv?.token) memberReady = await provisionManager(inv.token)
    } catch (e) {
      console.warn('[e2e global-setup] création invitation manager échouée:', (e as Error).message)
    }
  }

  await browser.close()
  fs.writeFileSync(statusPath, JSON.stringify({ authReady: ownerReady, memberReady }))
}

export default globalSetup

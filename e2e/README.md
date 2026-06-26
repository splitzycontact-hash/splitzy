# Tests E2E Playwright

Suite Playwright pour le dashboard restaurant (`/restaurant/*`).

## Lancer

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run test:e2e          # headless, tous les projets
npm run test:e2e:ui       # mode UI interactif
npm run test:e2e:headed   # navigateur visible
```

Le dev server Vite (`npm run dev`, port 5173) est démarré automatiquement par
Playwright (`webServer` dans `playwright.config.ts`). Si un serveur écoute déjà
sur 5173, il est réutilisé.

## Deux familles de tests

| Famille | Fichiers | Auth | Tourne sans config ? |
|---|---|---|---|
| Public | `*.unauth.spec.ts` | aucune | ✅ oui |
| Authentifié | tous les autres | session Clerk | ⏭️ skippé tant que `e2e/.env.test` n'est pas renseigné |

Les specs authentifiées appellent `test.skip(!authReady, …)` en tête de fichier.
`authReady` vient de `e2e/.auth/status.json`, écrit par `global-setup.ts`. Sans
identifiants Clerk de test, `authReady === false` → ces tests sont **skippés**
(le run reste vert), seuls les tests publics s'exécutent réellement.

## Activer les tests authentifiés

L'auth utilise les **sign-in tokens** de la Clerk Backend API (pas de mot de
passe, pas de 2FA) → fiable en headless/CI. Il suffit de :

1. **Clé secrète Clerk DEV** — dashboard Clerk (instance `novel-cougar-88`) →
   *API Keys* → `sk_test_…`. La poser dans `e2e/.env.test` (`CLERK_SECRET_KEY`).
2. **Deux emails de comptes de test** Clerk DEV (les comptes doivent exister ;
   mot de passe non requis) : `TEST_OWNER_EMAIL`, `TEST_MEMBER_EMAIL`. Les
   conventions `+clerk_test@` sont pratiques (comptes de test Clerk).
3. Relancer `npm run test:e2e`.

`global-setup.ts` fait alors tout automatiquement :

- mint un sign-in token par compte → ouvre la session (`strategy: 'ticket'`) ;
- **owner** : si le compte n'a pas encore de restaurant, déroule l'onboarding
  (crée « Resto Owner E2E ») → `owner.json` ;
- **manager** : supprime un éventuel restaurant possédé par le compte (sinon il
  serait owner), puis le fait **accepter une invitation** émise par l'owner
  → vrai membre `role: manager` du restaurant de l'owner → `member.json` ;
- écrit `e2e/.auth/status.json` (`authReady`, `memberReady`). Si une étape
  échoue, le flag reste `false` et les specs concernées **skippent** (jamais
  d'échec rouge dû à l'environnement).

> Les champs `TEST_*_PASSWORD` dans `e2e/.env.test` sont **ignorés** (legacy).
> `e2e/.env.test` et `e2e/.auth/` sont git-ignorés. Ne jamais committer de
> secret ni de session.

### Tokens d'invitation optionnels

`invitation.unauth.spec.ts` (localStorage) et `invitation.spec.ts` (états
expirée / déjà acceptée) attendent de vrais tokens via `TEST_INVITE_TOKEN`,
`TEST_INVITE_EXPIRED_TOKEN`, `TEST_INVITE_ACCEPTED_TOKEN`. Absents → ces
scénarios skippent.

## Architecture

- `playwright.config.ts` — 4 projets : `chrome-owner`, `chrome-member`,
  `mobile-safari`, `unauth`. Routage par suffixe de fichier.
- `e2e/global-setup.ts` — crée (ou skippe) les sessions auth.
- `e2e/fixtures/base.ts` — `test`/`expect` étendus + flags `authReady` /
  `memberReady` + `SKIP_AUTH_REASON`.
- `e2e/tests/*.spec.ts` — un fichier par module.

## `data-testid` posés dans le code applicatif

`sidebar`, `mobile-nav`, `page-header`, `kpi-ca`, `kpi-tables`, `kpi-score`,
`kpi-tips`, `confetti-canvas`, `table-card-{id}`, `floor-grid`. Ajoutés en
design-only (aucune logique modifiée).

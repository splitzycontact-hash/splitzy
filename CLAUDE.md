# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node.js is installed locally at `~/.local/node/bin` — prefix all npm commands:

```bash
export PATH="$HOME/.local/node/bin:$PATH"

npm run dev        # dev server on http://localhost:5173
npm run build      # TypeScript check + Vite build
npm run lint       # ESLint
npm run preview    # preview production build
```

Vercel (deploy production — Vercel CLI installé globalement) :

```bash
export PATH="$HOME/.local/node/bin:$PATH"
vercel --prod      # build + deploy sur www.splitzy.fr depuis le répertoire courant
```

> **Important** : Vercel déploie automatiquement depuis la branche `main`. Les branches `sauvegarde-*` ne déclenchent que des previews. Pour déployer en prod : merger dans `main` + `vercel --prod`.

Convex (always run from `splitzy-client/` directory):

```bash
# Deploy to dev Convex (scintillating-viper-372)
CONVEX_DEPLOYMENT=dev:scintillating-viper-372 npx convex dev --once

# Deploy to prod Convex (mellow-chinchilla-481)
npx convex deploy --yes

# Run a Convex function directly (useful for admin tasks)
CONVEX_DEPLOYMENT=dev:scintillating-viper-372 npx convex run <module>:<function> '{"arg": "value"}'

# View recent logs
CONVEX_DEPLOYMENT=dev:scintillating-viper-372 npx convex logs --history
```

## Architecture

Splitzy is a **restaurant bill-splitting app** currently with two surfaces in a single repo, being migrated to a 3-app monorepo (Turborepo + pnpm):

| App | Status | Surface |
|---|---|---|
| `apps/client` | exists — `src/` (non-restaurant routes) | Mobile PWA, QR code entry |
| `apps/dashboard` | exists — `src/restaurant/` | Desktop dashboard for restaurant owners |
| `apps/admin` | **to build** | Dark theme internal tool for Splitzy team |

All three apps share **one Convex deployment** (one schema, one set of functions). The Convex backend is the single source of truth — no HTTP calls between apps, only Convex queries/mutations.

### Infrastructure

| Service | Dev | Prod |
|---|---|---|
| Convex backend | `scintillating-viper-372` (`.env.local`) | `mellow-chinchilla-481` (Convex deploy) |
| Vercel frontend | `http://localhost:5173` | `https://www.splitzy.fr` |
| Clerk auth | `pk_test_bm92ZWwtY291Z2FyLTg4…` (dev instance) | `pk_test_…` + origin `splitzy-client.vercel.app` autorisée |
| Square POS | `connect.squareup.com` (production) | same |
| Stripe Connect | Stripe Connect Express | platform: Splitzy, 1.5% commission |

The Vercel production deployment points to **Convex prod** (`mellow-chinchilla-481`). Local dev points to **Convex dev** (`scintillating-viper-372`). Changes to Convex functions must be deployed to both if you want them in prod.

### Clerk — contraintes de domaine (important)

Clerk a deux types d'instances :
- **Dev instance** (`pk_test_...`) — supporte n'importe quel domaine si ajouté dans **Allowed origins**. Utilisée en local ET sur Vercel pour l'instant.
- **Prod instance** (`pk_live_...`) — nécessite un domaine custom vérifié. Les domaines `.vercel.app` ne sont **pas** supportés en prod Clerk.

**État actuel** : on utilise la clé `pk_test_...` sur Vercel avec `https://splitzy-client.vercel.app` ajouté dans Clerk dashboard → Configure → Restrictions → **Allowed origins**.

**Quand on aura un domaine custom** (ex: `app.splitzy.fr`) :
1. Créer une instance Clerk prod → récupérer `pk_live_...`
2. Ajouter le domaine dans Clerk dashboard → Domains (vérification DNS)
3. Remplacer `VITE_CLERK_PUBLISHABLE_KEY` dans Vercel par `pk_live_...`
4. Redéployer

Une instance Clerk prod est déjà créée (`pk_live_Y2x1cmsuc3BsaXR6eXRleHQuY29tJ2Rldi1wcm9k`) — en attente d'un domaine custom pour être activée.

### Convex env vars (set on dev deployment)

```
SQUARE_ACCESS_TOKEN        # Square production token (EAAAl_b44btPH…)
SQUARE_LOCATION_ID         # LS3JS5QB97NV8
STRIPE_SECRET_KEY          # sk_… (never in VITE_* — server only)
STRIPE_WEBHOOK_SECRET      # whsec_… for signature verification
MAILGUN_API_KEY            # for transactional emails
RESEND_API_KEY             # re_… — envoi des campagnes email (campaigns:sendCampaign)
```

These must also be set on the prod deployment. `RESEND_API_KEY` déjà posée sur dev (`scintillating-viper-372`) **et** prod (`mellow-chinchilla-481`). DNS Resend (`splitzy.fr`) ajoutés sur IONOS — l'envoi réel depuis `noreply@splitzy.fr` ne marche qu'une fois le domaine vérifié côté Resend.

### Routing overview (current single-repo)

```
/restaurant/*         → RestaurantApp (Clerk-protected dashboard)
/t/:slug/:tableNumber → TableEntry (public — customer QR entry point)

/                     → Homepage (marketing landing page)
/fonctionnalites      → Fonctionnalites (features + FonctionnalitesHero)
/pricing              → PricingPage
/blog                 → BlogPage
/blog/:slug           → BlogArticlePage
/changelog            → ChangelogPage
/aide                 → AidePage (FAQ accordion)
/securite             → SecuritePage
/presse               → PressePage
/a-propos             → AboutPage
/contact              → ContactPage
/carrieres            → CarriersPage
/privacy              → PrivacyPage (politique de confidentialité, structure CNIL)
/unsubscribe?id=…     → Unsubscribe (désabonnement marketing depuis lien email — public)

/welcome              → Landing (consumer — après scan QR)
/profile              → Profile (avatar + prénom)
/items → /tip → /payment → /confirmation → /feedback → /feedback/sent
```

Les routes `/table` et `/recap` ont été supprimées (sauvegarde v3). Le flow est désormais : `TableEntry → /welcome → /profile → /items → /tip → /payment → /confirmation → /feedback → /feedback/sent`.

All client routes after `/profile` are protected by `ProtectedRoute` (redirects to `/welcome` if `userName` is empty). Session resets on `/feedback/sent`.

`TableEntry` résout la table en **HTTP direct** (pas de `useQuery` WS) et navigue toujours vers `/welcome` — voir « iOS Safari — résilience réseau » ci-dessous.

### Auth guard logic (`src/App.tsx`)

`ConsumerAppGuard` wraps the client app. Key rules:
- `window.location.pathname.startsWith('/t/')` is checked **first** (before Clerk state) to prevent auth redirects on hard refresh — `useLocation()` can lag during Clerk re-initialization.
- If Clerk is loaded + user is signed in + `state.restaurantName` is empty → redirect to `/restaurant/onboarding` (restaurant owner flow).
- `flushSync` wraps `dispatch(SET_TABLE_CONTEXT)` in `TableEntry` before `navigate('/welcome')` to prevent a race where the guard sees `restaurantName = ''` at the new path.

### Auth — Clerk roles

Admin and dashboard users are authenticated via Clerk. Their Convex `users` document (keyed by `clerkUserId`) carries a `role` field:

```
super_admin     Full access — can impersonate, suspend, delete
admin_support   Full access except team management
viewer          Read-only admin access
gerant          Dashboard access scoped to their restaurant(s)
```

Every sensitive Convex mutation checks `ctx.auth.getUserIdentity()` → looks up `users.role` → throws `ConvexError` if insufficient. Never bypass this check.

---

## Convex backend (`convex/`)

### Existing files

| File | Key exports |
|---|---|
| `schema.ts` | Full DB schema |
| `restaurants.ts` | `getTableContext`, `getByClerkId`, `getBySlug`, `create`, `update`, `setSuspended`, `deleteAll` |
| `tables.ts` | `list`, `createBulk`, `updateStatus`, `resetToFree`, `importAmounts` |
| `menuItems.ts` | `listByRestaurant`, `addItem`, `updateItem`, `deleteItem`, `replaceAll`, `syncFromSquare` |
| `payments.ts` | `list`, `create` (accepte `paidItemNames?`), `getOverviewStats` |
| `feedbacks.ts` | `list`, `create`, `markRead` |
| `posIntegrations.ts` | `getByProvider`, `upsert`, `syncLive` |
| `customers.ts` | `list`, `getByRestaurant`, `saveContact` (upsert phone+email, consolidation via `customerId`), `updateContact`, `unsubscribe` (public, sans auth — lien email), `getManyForCampaign` (internalQuery) |
| `campaigns.ts` | `sendCampaign` (action `"use node"`, Resend — double check `email`+`marketingConsent` backend, footer désabonnement RGPD). ⚠ dépend du pkg `resend` — voir « Deps des actions Convex » |

### Files to add (admin + interconnexion phases)

| File | Purpose |
|---|---|
| `http.ts` | HTTP actions — Stripe webhook (`/stripe-webhook`), Mailgun inbound (`/mailgun-inbound`) |
| `crons.ts` | Scheduled jobs — `deliverMorningFeedbacks` (8h Paris), `checkDependencies` (every 30s) |
| `auth.config.ts` | Clerk → Convex JWT config |
| `users.ts` | `getByClerkId`, `upsert`, `list`, `updateRole` |
| `restaurantMembers.ts` | membership queries |
| `sessions.ts` | `openSession`, `listOpenByRestaurant`, `close` |
| `diners.ts` | `join`, `listBySession` |
| `dinerItems.ts` | `lock`, `markPaid` |
| `transactions.ts` | `create`, `markSucceeded`, `markFailed`, `listRecent`, `listByRestaurant` |
| `stripeWebhooks.ts` | `dispatch`, `getByEventId`, `listRecent`, `retryDeadLetter` |
| `tickets.ts` | `list`, `create`, `assign`, `resolve` |
| `bugs.ts` | `list`, `create`, `resolve`, `createHighSeverity` |
| `auditLogs.ts` | `insert` only — no patch/delete (immutable) |
| `featureFlags.ts` | `evaluate`, `list`, `update` |
| `admin.ts` | `impersonate`, `verifyImpersonationToken`, `suspendRestaurant` |
| `dependencyStatus.ts` | `list`, `upsert` |
| `gdprRequests.ts` | `create`, `resolve` |
| `subscriptions.ts` | `list`, `listPastDue`, `incrementDunning` |
| `broadcasts.ts` | `create`, `send` |

### Deps des actions Convex (gotcha build/deploy)

Tout pkg npm importé par une action Convex (`"use node"`, ex : `resend`, `@anthropic-ai/sdk`) doit être installé à **DEUX** endroits, sinon ça casse :

1. **`splitzy-client/`** → `npm install <pkg>`. `tsconfig.app.json` a `include: ["src"]`, mais `src → convex/_generated/api.d.ts → import type * as campaigns from "../campaigns.js"` tire le vrai `.ts` (campaigns.ts) dans le graphe de types. `api.d.ts` est skipLibCheck, mais le `.ts` cible ne l'est pas → `tsc -b` échoue avec `TS2307: Cannot find module 'resend'` (build local **et** Vercel).
2. **`Splitzy/convex/`** (`@splitzy/convex`, monorepo pnpm) → `pnpm add <pkg>` (⚠ `npm install` y plante : `Cannot read properties of null (reading 'matches')`). Sinon `npx convex deploy --yes` échoue : esbuild `Could not resolve "resend"`.

Mirror obligatoire : la fonction existe dans `Splitzy/convex/` (déployé en prod) **et** `splitzy-client/convex/` (codegen + types dashboard). Si on n'exécute pas `convex codegen`, enregistrer le nouveau module à la main dans `splitzy-client/convex/_generated/api.d.ts` (ligne `import type * as X` + entrée `X: typeof X` dans `fullApi`). `api.js` utilise `anyApi` → pas à toucher.

---

## DB schema (`convex/schema.ts`)

Full schema — all tables, all indexes. `_id` and `_creationTime` are auto-generated by Convex (never declare them).

```
restaurants      slug*, clerkUserId*, status*, plan, healthScore?, stripeAccountId?, kycStatus?, suspended?, posProvider?
users            clerkUserId*, role*, email, firstName?, lastName?, totpEnabled?
restaurantMembers restaurantId*, userId*, role
tables           restaurantId*, qrToken*, number, capacity, status, guests?, amountCents?, alert?
menuCategories   restaurantId*, name, displayOrder?
menuItems        restaurantId*, categoryId?, name, priceCents, emoji?, category?, isAvailable?, externalId?
sessions         restaurantId*, tableId*, status, by_restaurant_status*, closedAt?, totalCents?
diners           sessionId*, firstName, avatar?, joinedAt
dinerItems       dinerId*, menuItemId*, qty, priceCents, status
payments         restaurantId*, tableId, tableNumber, guests, subtotalCents, tipCents, commissionCents, totalCents, paymentMethod, status, createdAt*, dateLabel
transactions     restaurantId*, sessionId*, stripePaymentIntentId?, status, amountCents, tipCents?, commissionCents?, succeededAt*, failureCode?, paymentMethod?
refunds          transactionId*, stripeRefundId?, amountCents, status, initiatedBy?
disputes         transactionId*, stripeDisputeId?, amountCents, status, reason?, evidenceDueBy?
feedbacks        restaurantId*, tableId, stars, tags[], text, isNew*, deliveredAt*, createdAt, timeLabel
subscriptions    restaurantId*, status*, plan, stripeSubscriptionId?, dunningAttempts?
invoices         restaurantId*, number, amountCents, vatCents, status, issuedAt, paidAt?
payouts          restaurantId*, stripePayoutId?, amountCents, status
tickets          restaurantId?, status*, priority, assignedTo?, createdBy?, resolvedAt?
ticketMessages   ticketId*, authorId?, body, isInternal?
bugs             status+severity*, restaurantId?, assignedTo?, severity, isPinned?
auditLogs        actorId*, resourceType+resourceId*, action, isImpersonation?, diff?
featureFlags     key*, status, rolloutType, rolloutValue?
broadcasts       type, audience, sentAt?, scheduledFor?, createdBy?
restaurantNotes  restaurantId*, authorId, body
gdprRequests     status*, email, type, dueBy
dependencyStatus service*, status, latencyMs?
stripeWebhookEvents eventId*, status, failureCount?
platformConfig   key*, value, updatedBy?, updatedAt
savedViews       userId*, scope, name, filters
pinnedRestaurants userId*, userId+restaurantId*
posIntegrations  restaurantId*, restaurantId+provider*, provider, apiKey, status, lastSyncAt?
customers        restaurantId*, restaurantId+phone*, restaurantId+email*, tableNumber?, firstName?, avatarIndex?, phone?, email?, marketingConsent?, consentAt?, createdAt
```

`*` = indexed. `tables.status` values: `"free" | "dining" | "payment" | "paid"`.

---

## Realtime — Convex reactive queries

**There are no channels to manage.** `useQuery` hooks re-render automatically when underlying data changes. A `payments.create` mutation triggers all active `useQuery(api.payments.list, ...)` calls across all connected clients instantly.

Dashboard tables live, admin feed, client diner list — all reactive with zero subscription code.

> **Exception iOS (flow client `/t/`) — voir section dédiée ci-dessous.** Le WebSocket Convex peut prendre 15-30 s à s'établir sur Safari iOS (et être suspendu en arrière-plan). Le flow client ne dépend donc **pas** du WS pour son chemin critique : lectures d'entrée et mutations passent par HTTP direct.

---

## iOS Safari — résilience réseau (flow client `/t/`)

Sur Safari iOS, le WebSocket Convex est peu fiable : 15-30 s de cold start, suspension quand l'app passe en arrière-plan, `setTimeout` throttlés. Le flow client (`TableEntry → /welcome → … → /feedback/sent`) est conçu pour fonctionner **sans dépendre du WS**.

### Mutations critiques en HTTP direct — `src/utils/convexHttp.ts`

`httpMutation(path, args)` fait un `POST /api/mutation` avec `fetch({ keepalive: true })`. `keepalive` garantit que la requête part **même si l'utilisateur ferme l'onglet juste après** (limite navigateur : 64 KB/requête).

Pourquoi : `useMutation()` queue la mutation côté client en attendant le WS. Si le WS ne s'établit jamais avant fermeture de la page, la mutation est **perdue** → le gérant ne voit ni paiement, ni table en `dining`, ni feedback.

Mutations basculées en HTTP (ne **pas** revenir à `useMutation` pour celles-ci) :
- `payments:create` — `Payment.tsx`
- `tables:updateStatus` — `TableEntry.tsx`
- `feedbacks:create` — `Feedback.tsx`

Format réponse Convex HTTP : `{ status: "success", value }` ou `{ status: "error", errorMessage }` — **toujours vérifier `status === 'success'`** avant de lire `value` (sinon une erreur Convex est interprétée comme `value: undefined`).

### Lecture d'entrée en HTTP direct — `TableEntry.tsx`

`TableEntry` ne fait **plus** de `useQuery` WebSocket. Il :
1. consomme `window.__tableBootstrap` (fetch HTTP lancé dans `index.html` **avant** le mount React) si disponible (1ʳᵉ ouverture = instantané) ;
2. fallback sur un `fetch` direct `POST /api/query` (`restaurants:getTableContext`), avec **une 2ᵉ tentative après 1 s** en cas de cold start ;
3. dispatch `SET_TABLE_CONTEXT` (avec `cachedOrderItems` / `cachedPaidCents`) via `flushSync`, puis `navigate('/welcome', { replace: true })`.

**Naviguer vers `/welcome`, jamais `/items`** : `/items` est derrière `ProtectedRoute` (redirige vers `/welcome` si `userName` vide) → naviguer dessus directement chaîne un `Navigate` replace qui peut freezer dans `AnimatePresence mode="wait"`.

États d'erreur explicites (`LoadState`) avec bouton Réessayer (`retryKey`) : `invalid_url`, `not_found`, `no_table`, `fetch_error`. Tous les échecs loggent un `console.error('[TableEntry] …')` (debuggable via Safari Web Inspector) — jamais d'échec silencieux / page blanche.

### Cache local — `SessionContext`

`cachedOrderItems` / `cachedPaidCents` (remplis par `TableEntry` à l'entrée) sont la source de vérité du flow tant que le WS n'a pas répondu. `useSessionCalcs` et `Items.tsx` font `liveTable?.… ?? state.cached…`. `Landing.tsx` n'affiche **aucun** spinner d'attente WS (`tableLoading = false`). `RESET_SESSION` préserve `cachedOrderItems` / `cachedPaidCents`.

---

## Client flow — state management

Single global context: `src/context/SessionContext.tsx` — `useReducer` with `SessionState`/`SessionAction` (defined in `src/context/types.ts`).

**Key state fields:**
- `restaurantName`, `tableNumber`, `tableCapacity` — set by `SET_TABLE_CONTEXT` when a QR code is scanned (via `TableEntry`)
- `convexRestaurantId`, `convexTableId` — Convex IDs for the active restaurant/table
- `tableTotalCents` — amount from `tables.amountCents` (set by POS or simulation), used in equal/custom split
- `splitMode: 'item' | 'equal' | 'custom'`
- `selectedItems: SelectedItem[]` — each has `menuItemId` + `splitFactor` (1–4)
- `tipPercent: number` — 0–30
- `convives: Convive[]` — other people at the table

**Derived values** (never stored in state, computed in `src/hooks/useSessionCalcs.ts`):
- `subtotal` — depends on splitMode
- `tipAmount = subtotal × tipPercent / 100`
- `splitzyFee = subtotal × 1.5%` (display only, not added to total)
- `total = subtotal + tipAmount`

---

## Mock / seed data

- `src/data/menu.ts` — 14 static menu items for the client demo (not synced from Convex). Items with `takenBy` are greyed out.
- `src/data/session.ts` — **cleaned**: `TABLE_TOTAL_CENTS = 0`, `MOCK_SESSION.convives = []`, `restaurantName = ''`. `MOCK_CARDS` (Visa/Mastercard) still present for the payment carousel demo.
- Real menu data lives in Convex `menuItems` table, synced from Square via `syncFromSquare`.

---

## Square POS integration

`convex/menuItems.ts → syncFromSquare` action:
- Calls `connect.squareup.com/v2/catalog/list?types=ITEM,CATEGORY` (production, not sandbox)
- Token priority: `process.env.SQUARE_ACCESS_TOKEN` (Convex env var) → DB (`posIntegrations.apiKey`)
- Maps `item_data.variations[0].item_variation_data.price_money.amount` → `priceCents`
- Items with `pricing_type: "VARIABLE_PRICING"` get `priceCents: 0` — must be set to Fixed Pricing in Square dashboard
- Categories mapped to: `entrees | plats | desserts | boissons`

---

## Restaurant dashboard (`src/restaurant/`)

Auth: `RestaurantGuard` fetches restaurant by `clerkUserId` (production) or by `VITE_RESTAURANT_SLUG` env var (dev without Clerk).

Routing (`RestaurantApp.tsx`) — toutes les routes sont sous `/restaurant/*`, layout commun `RestaurantLayout` (Sidebar desktop / bottom-nav mobile) :

| Route | Page | Rôle |
|---|---|---|
| `/restaurant` | `Overview` | KPIs (CA du jour, tables actives, note moy., pourboires), tables live grid, revenus semaine, activité récente |
| `/restaurant/tables` | `Tables` | Grille tables live + filtre statut, modal détail, **"Simuler commande" (TEST)** |
| `/restaurant/reputation` | `Reputation` | Feedbacks + répartition pos/neu/neg, badge "nouveau". `negCount = stars ≤ 2`, `neuCount = 3★` (ne pas re-compter les 3★) |
| `/restaurant/analytics` | `Analytics` | Graphe CA SVG (Bezier) par période today/week/month/year/custom, boutons Simuler/Nettoyer |
| `/restaurant/menu` | `MenuPage` | Carte / menu (sync Square) |
| `/restaurant/clients` | `Clients` | Clients dérivés des `payments` + `feedbacks` réels (identités fixes indexées par `tableNumber` 1-10), statut vip/régulier/insatisfait/nouveau |
| `/restaurant/factures` | `Factures` | Factures |
| `/restaurant/integrations` | `Integrations` | Intégrations POS / tierces |
| `/restaurant/settings` | `Settings` | POS config, menu sync, QR codes, table setup |
| `/restaurant/onboarding` | `RestaurantOnboarding` | Flow création restaurant (hors layout) |
| `/restaurant/sign-in` | `RestaurantSignIn` | Connexion gérant (hors layout) |

`/restaurant/feedbacks` redirige (301 client) vers `/restaurant/reputation`. La sidebar desktop (`layout/Sidebar.tsx`) groupe ces pages en deux sections : **Pilotage** (Vue d'ensemble, Tables, Réputation, Analytics) et **Restaurant** (Menu, Clients, Factures, Intégrations, Paramètres). La bottom-nav mobile (`RestaurantLayout.tsx`) n'expose que 5 entrées : Accueil, Tables, Réputation, Factures, Réglages.

### Analytics — graphe CA (`Analytics.tsx`)

`buildChartDays(period)` pré-remplit **tous** les slots de la fenêtre à 0 avant d'injecter les paiements (sinon les jours/mois vides manquent et la courbe Bezier saute). `year` génère Jan → mois courant ; `custom` boucle de `windowStart` à `windowEnd` (+86400000/itération). La légende affiche un `currentPeriodLabel` dynamique (Aujourd'hui / Cette semaine / nom du mois / année / plage custom), pas un label hardcodé.

### Clients — données réelles (`Clients.tsx`)

Plus de tableau `CUSTOMERS` statique : `useQuery(api.payments.list)` (filtré `status === 'Encaissé'`) + `useQuery(api.feedbacks.list)` + `useQuery(api.customers.getByRestaurant)`, agrégés par `tableNumber` dans un `useMemo`. Statut dérivé : `vip` (visits ≥ 10 ou total ≥ 500€), `insatisfait` (0 < avgRating < 3), `regulier` (visits ≥ 3), sinon `nouveau`. Tables sans paiement filtrées, tri par total décroissant. Les KPIs header sont calculés depuis cet agrégat (plus de valeurs en dur). Chaque `Customer` porte `consent` + `marketingId` (id de la row CRM avec email + `marketingConsent` actif), pour la campagne email.

### Clients — campagne email (`Clients.tsx` + `convex/campaigns.ts`)

Bouton **« Campagne email »** → modale : sélecteur segment radio (Tous / Réguliers / Nouveaux / Insatisfaits, avec nb d'éligibles = email + consentement par segment), sujet (required), corps (required), toggle aperçu (rendu final avec footer désabonnement), bouton « Envoyer à X clients » → `useAction(api.campaigns.sendCampaign)` avec les `marketingId` du segment. Toast résultat (`sonner`, `Toaster` monté dans `RestaurantLayout`). `restaurantName` vient de `useRestaurant()?.name`.

`sendCampaign` (action `"use node"`) **revérifie côté backend** pour chaque client `email` non vide + `marketingConsent === true` (le front n'est jamais la seule barrière RGPD), envoie via Resend (`from: "Splitzy <noreply@splitzy.fr>"`), template HTML inline (header dark `#0A0A0A` + nom resto, corps gérant échappé, footer gris 12px avec lien `https://www.splitzy.fr/unsubscribe?id=<customerId>`), retourne `{ sent, failed }`. `/unsubscribe` appelle `api.customers.unsubscribe` (patch `marketingConsent: false`, sans auth).

### "Simuler commande" (test feature)

Located in `Tables.tsx`. Each table card has a dashed amber `[TEST] Simuler commande` button that:
1. Queries `menuItems.listByRestaurant` for the restaurant
2. Randomly picks 2–4 items (quantity 1–2 each) via `generateOrder()`
3. Shows a breakdown + total in a modal with a ↺ re-roll button
4. On confirm: calls `tables.updateStatus(tableId, status='dining', guests=totalQty, amountCents=total)`

---

## Design tokens (Tailwind)

```
brand / brand-dark / brand-light / brand-bg / brand-glow  — orange palette (#E8920A = --splitzy-orange)
ink-900 (#18181B)     — dark section backgrounds (replaces dark-hero)
muted (#9CA3AF)       — secondary text
shadow-glow           — orange ring for selected states
```

**Marketing pages** : utiliser `bg-ink-900`, `text-brand`, `border-brand` etc. (Tailwind aliases). Ne jamais hardcoder `#E8920A` dans les pages marketing.  
**Consumer pages** (flow client) : `#E8920A` hardcodé en inline style est **intentionnel** — pas de Tailwind dans le flow client.

---

## Marketing site

Le site marketing (`src/pages/marketing/`) est un ensemble de pages React avec Framer Motion. Toutes sont des named exports (pas default) pour correspondre aux lazy imports dans `App.tsx`.

### Règles Framer Motion marketing

- Toujours `m.*` (jamais `motion.*`) — `LazyMotion` est dans `App.tsx`
- Hero animations : `initial` + `animate` (au mount)
- Sections sous la fold : `whileInView` + `viewport={{ once: true }}`
- `useMotionValue` / `useSpring` importables directement depuis `framer-motion` indépendamment de `LazyMotion`
- `AnimatePresence` pour accordion open/close

### Règles TypeScript marketing

- Les strings contenant des apostrophes françaises (`l'`, `d'`, `qu'`) doivent utiliser des guillemets doubles comme délimiteurs : `"avant qu'elle arrive"`
- Toutes les dépendances utilisées doivent être dans `package.json` — le build local peut passer si elles sont en `node_modules` orpheline, mais le build Vercel (fresh install) échouera avec TS2307

### Pattern TextReveal (word-by-word animation)

L'espace entre mots doit être un **nœud texte frère** du `m.span`, pas à l'intérieur :

```tsx
// ❌ Bug — trailing space strippé par le browser dans un inline-block
<m.span style={{ display: 'inline-block' }}>{word}{' '}</m.span>

// ✅ Fix — espace HORS du span animé
<span key={i}>
  <m.span style={{ display: 'inline-block' }}>{word}</m.span>
  {i < words.length - 1 ? ' ' : ''}
</span>
```

### Pattern Marquee (défilement infini)

```tsx
// ✅ Marquee correct — width:max-content + shrink-0 obligatoires
<div style={{ overflow: 'hidden' }}>
  <m.div
    style={{ display: 'flex', gap: '3rem', width: 'max-content' }}  // width:max-content critique
    animate={{ x: ['0%', '-50%'] }}
    transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
  >
    {[...ITEMS, ...ITEMS].map((item, i) => (
      <div key={i} className="shrink-0">{/* shrink-0 critique */}
        {item}
      </div>
    ))}
  </m.div>
</div>
```

Sans `width: max-content`, le `m.div` prend la largeur du parent `overflow-hidden` et les flex items se compressent (`flex-shrink: 1` par défaut).

### Composants marketing clés

| Fichier | Rôle |
|---|---|
| `Navbar.tsx` | Navbar fixe, fond transparent → opaque au scroll |
| `Footer.tsx` | Footer avec `<Link to>` (jamais `<a href>`) + scroll-to-top |
| `shared.tsx` | `fadeInUp`, `useFadeInView` (Intersection Observer) |
| `Logos.tsx` | Bande logos desktop grid + mobile marquee |
| `blogData.ts` | 10 articles, système block-based, `getArticleBySlug` |
| `src/components/Fonctionnalites/FonctionnalitesHero.tsx` | Hero /fonctionnalites avec MagneticButton |

---

## Monetary formatting

**Always** use `formatEur(cents: number)` from `src/utils/formatCurrency.ts`.
Produces `57€` (no decimal) or `62,70€` (comma, no space before `€`). Implémenté via `toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` — garantit la virgule sur tous les iOS quelle que soit la langue système (le `.toFixed(2).replace('.', ',')` précédent n'était pas garanti). Never `.toFixed()` directly. Never store amounts as floats — always integer cents.

---

## Animations

`src/utils/animations.ts`: `pageVariants` (page slide + `AnimatePresence`), `slideDown`, `springPop`, `checkAnimation`, `starStagger` + `starItem`.

---

## PhoneWrapper

On desktop (>768px) the client app renders inside an iPhone 15 Pro frame (390px, radius 44px). On real mobile it's transparent. **All client UI modifications must target real mobile** — do not use the desktop PhoneWrapper as reference.

---

## Avatar system

`src/components/ui/Avatar.tsx` — 6 emoji avatars: `['🦊','🐻','🐸','🐙','🦄','🐯']` (indexed 0–5). Each has a paired background color.

Dans `Profile.tsx` (flow consumer), seuls les 4 premiers avatars sont exposés en grille 2×2 :
```
{ id: 0, emoji: '🦊', bg: '#E8920A', label: 'Léo' }
{ id: 1, emoji: '🐻', bg: '#3B82F6', label: 'Mia' }
{ id: 2, emoji: '🐸', bg: '#8B5CF6', label: 'Alex' }
{ id: 3, emoji: '🐙', bg: '#10B981', label: 'Sam' }
```
L'index `userAvatarIndex` (0–3) est stocké dans `SessionState` et utilisé dans `Table.tsx` (convives) et autres.

---

## Design system consumer (mobile)

Source de vérité : `../Splitzy Interface Restaurateur/uploads/splitzy_mockup (1).html`

### CSS contraintes mobiles obligatoires
- `min-height: 100dvh` sur `#root` (pas `svh` ni `vh` — le `dvh` exclut l'UI du navigateur iOS)
- `height: 100%; overscroll-behavior: none` sur `html, body`
- Tous les inputs ont `font-size: 16px` minimum (en dessous → iOS zoom automatique)
- Touch targets : `min-height: 44px`, `min-width: 44px` sur tous les boutons interactifs
- Zones scrollables : `WebkitOverflowScrolling: 'touch'` + `overscrollBehavior: 'contain'`
- CTAs en bas de page : `paddingBottom: 'max(Xpx, calc(Ypx + env(safe-area-inset-bottom)))'`
- `viewport-fit=cover` déjà en place dans `index.html`

### Palette (ne jamais hardcoder en dehors des pages consumer)
```
--brand:    #E8920A   (orange principal)
--brand-dk: #B45309   (orange hover / texte actif)
--brand-lt: #FEF3C7   (fond sélectionné)
--brand-bg: #fffbf2
--dark:     #111827
--mid:      #374151
--muted:    #9CA3AF
--border:   #E5E7EB
--bg:       #F4F4F5
```

NB : dans les pages consumer le `#E8920A` hardcodé en inline style est intentionnel (pas de Tailwind dans le flow client).

### Pages consumer — design attendu (sauvegarde v5)

| Page | Hero | Contenu sheet |
|---|---|---|
| `Landing` | Fond `#18181B`, pill animée « Table X · Restaurant », logo Splitzy | Restaurant card avec icône 🍽, 3 steps, bouton « C'est parti → » |
| `Profile` | Fond `#18181B`, step dots, carte preview identité (avatar + prénom live) | 2×2 avatar grid (🦊🐻🐸🐙), input prénom 17px, chips suggestion, CTA→/items |
| `Items` | Header dark `#18181B` + progress bar | Toggle 2 modes (par article / parts égales), scroll `-webkit-overflow-scrolling: touch` |
| `Tip` | Header dark + progress bar | 4 boutons (Aucun/10%/15%/20%) en grid, recap card, CTA→/payment |
| `Payment` | Fond dark, montant en grand | Carousel cartes, Apple Pay / Google Pay, CTA payer |
| `Confirmation` | Fond dark, checkmark animé | Receipt card, progress bar → /feedback (8s) |
| `Feedback` | Fond dark, étoile icon | Privacy badge, StarRating, tags, textarea **font-size 16px**, CTA |
| `FeedbackSent` | Centré, check vert | Note privé, download PDF, bouton reset session |

## Known issues fixed (context for future sessions)

- **Reçu PDF convive + feature Factures dashboard + Tiime** (session 2026-06-02) :
  - **Tiime** : compte créé sur `apps.tiime.fr` (company ID 576580, email `splitzy.contact@gmail.com`). Société : Splitzy, SAS, adresse temporaire 123 Rue de l'Innovation 75001 Paris (à mettre à jour dès réception SIRET). Numérotation factures : `2026-000001`. SIRET et TVA : N/C — à compléter dès immatriculation. Tiime est la plateforme d'émission des factures Splitzy → restaurants (commission mensuelle 1,5%). PDP agréée e-facturation sept. 2026.
  - **Légal factures** : seule facture à émettre = Splitzy → Restaurant (commission 1,5% + TVA). Les convives reçoivent un reçu PDF (justificatif de paiement, pas une facture TVA). Pas d'obligation de facture B2C. Worldline = PSP agréé qui couvre réglementairement la collecte de fonds pour compte de tiers (PSD2).
  - **`src/utils/generateInvoice.ts`** — reçu PDF convive refait :
    - Nouveaux champs dans `SessionState` (`src/context/types.ts`) : `paymentMethod: string`, `paymentRef: string`, `paymentTimestamp: number`, `paidSubtotalCents: number`, `paidTipCents: number`, `paidTotalCents: number` — tous initialisés à `''`/`0`, remis à 0 dans `RESET_SESSION`.
    - Nouvelle action : `SET_PAYMENT_DETAILS` avec payload `{ method, ref, timestamp, subtotalCents, tipCents, totalCents }` — dispatchée dans `Payment.tsx` → `handlePay` avant `CONFIRM_PAYMENT`.
    - `calcAmounts` utilise les montants gelés (`paidSubtotalCents` etc.) plutôt que de recalculer depuis `cachedOrderItems` (qui contient toute la table) ou `selectedItems` statiques.
    - Articles affichés depuis `state.selectedItems` (ce que le convive a choisi), fallback "Part du repas" si vide.
    - Footer complet : `Ref`, heure, méthode de paiement, mention légale TVA ("Ce document est un justificatif de paiement et ne constitue pas une facture TVA. Pour une facture de votre repas, contactez le restaurant directement.").
    - Commission Splitzy supprimée du PDF (info interne, pas utile pour le convive).
    - Nom fichier : `recu-{slug}-table{N}-{date}.pdf`.
  - **`src/restaurant/pages/Factures.tsx`** — système d'onglets ajouté :
    - Tab "Transactions" → contenu existant inchangé (historique paiements clients).
    - Tab "Factures Splitzy" → factures commission Splitzy → restaurant. Contient : bandeau SIRET, 3 KPIs (Total facturé TTC / Payé / En attente), table (Numéro · Période · HT · TVA · TTC · Statut · PDF).
    - `SPLITZY_COMPANY_CONFIG` en haut du fichier : `{ siret: 'En cours d\'immatriculation', tvaNumber: '', commissionRate: 0.015, tvaRate: 0.20 }` — **à mettre à jour dès réception SIRET**.
    - `MOCK_SPLITZY_INVOICES` : tableau de `SplitzyInvoice[]` — **à remplacer par query Convex + Tiime API** quand SIRET obtenu. Chaque entrée : `{ id, number, period, issuedAt, dueAt, amountHT, tva, amountTTC, status, tiimePdfUrl }`.
    - Bouton PDF → `window.open(tiimePdfUrl)` si URL non null, sinon grisé ("PDF disponible après émission").
  - **Bug drawer Factures** : "Sous-total HT" et "TVA 10%" s'affichaient vides — les spans valeur n'avaient ni classe couleur ni `color` explicite. Fix : `ds-text-secondary` ajouté sur les spans non-bold.

- **Page /privacy + refonte CRM confirmation + campagne email** (branche `c1`) :
  - `/privacy` (`PrivacyPage.tsx`, structure CNIL) + lien footer marketing (`Footer.tsx`) et footer discret des écrans client (`PrivacyFooterLink.tsx` dans Confirmation/Feedback/Profile, ouvre `target="_blank"`). Ajouté à `sitemap.xml`, non bloqué par `robots.txt`.
  - `Confirmation.tsx` : section CRM refondue — 2 champs (tel + email) toujours visibles, **1 seule** checkbox opt-in (jamais pré-cochée, apparaît dès qu'un champ est rempli), **1 seul** bouton « Enregistrer » → un seul `httpMutation('customers:saveContact', …)` ; état « Enregistré ✓ » vert après save. `canSave = (validPhone || validEmail) && consent && !saved`.
  - Campagne email : `convex/campaigns.ts` (`sendCampaign`, Resend), `customers.unsubscribe` + `getManyForCampaign`, page `/unsubscribe`, modale dans `Clients.tsx`. Voir « Clients — campagne email » et « Deps des actions Convex ».
  - **Splitzy/ n'est PAS un repo git** : les changements `Splitzy/convex/` ne sont pas versionnés là ; seul le mirror `splitzy-client/convex/` est poussé (suffit pour capturer le code des fonctions).
- **Flow client iOS résilient au WS lent** (sauvegarde v11) : refonte complète du chemin critique pour ne plus dépendre du WebSocket Convex (cold start 15-30 s sur iOS). Voir section « iOS Safari — résilience réseau ». En résumé :
  - `payments:create` cassé en prod : `{ ...args }` dans `ctx.db.insert("payments", …)` incluait `paidItemNames` (absent du schema `payments`) → Convex rejetait **tous** les inserts → « Erreur de paiement ». Fix : `const { paidItemNames, ...paymentData } = args` avant l'insert ; `paidItemNames` sert ensuite à marquer `orderItems[].paid` (partiel géré via consommation de `remaining[]` pour les qty > 1).
  - Mutations `payments:create` / `tables:updateStatus` / `feedbacks:create` basculées sur `httpMutation` (`src/utils/convexHttp.ts`, `fetch keepalive`) — sinon perdues si l'onglet se ferme avant l'établissement du WS → le gérant ne voyait rien.
  - `TableEntry` : `useQuery` WS → fetch HTTP (`window.__tableBootstrap` puis `POST /api/query`, retry 1×), `navigate('/welcome')` (et non `/items`, qui est `ProtectedRoute`), états d'erreur + `console.error`.
  - `Landing.tsx` : suppression du spinner « Vérification état de la table » (`tableLoading = false`) qui moulinait 15-30 s ; `paidCents` fallback sur `state.cachedPaidCents`.
  - `Items.tsx` : `sourceItems = liveTable?.orderItems ?? state.cachedOrderItems` (le cache reste le fallback même quand `liveTable` est défini sans `orderItems`).
  - `formatEur` : `toFixed(2).replace('.', ',')` → `toLocaleString('fr-FR', …)`.
- **Bugs texte landing page + marquee logos** (sauvegarde v10) : (1) `TextReveal` dans `CtaFinal.tsx`, `Testimonials.tsx`, `Solution.tsx` : le trailing `' '` à l'intérieur d'un `span` `display:inline-block` est strippé par le browser. Fix documenté dans la section "Marketing site" ci-dessus. (2) Marquee logos mobile (`Logos.tsx`) : le `m.div` flex prenait la largeur du parent `overflow-hidden` (= viewport), les items se compressaient → gaps invisibles. Fix : `style={{ width: 'max-content' }}` + `shrink-0` sur chaque item.
- **Marketing pages redesign + FonctionnalitesHero** (sauvegarde v9) : Refonte complète des pages secondaires (Changelog, Presse, Aide, Sécurité) + `FonctionnalitesHero.tsx` dans `src/components/Fonctionnalites/`. `package.json` : ajout `"sonner": "^2.0.7"` — manquait (existait en node_modules orphelin → build Vercel échouait avec TS2307). Règle : toujours vérifier que les dépendances sont dans `package.json`, le build local peut passer si elles sont en node_modules orphelin.
- **Homepage sections 1.5-1.9 + blog routing** (sauvegarde v8) : `Stats.tsx`, `Solution.tsx`, `Testimonials.tsx`, `PricingPreview.tsx`, `CtaFinal.tsx` réécrits. `blogData.ts` + `BlogArticlePage.tsx` créés (route `/blog/:slug`). `Footer.tsx` : liens internes convertis en `<Link to>` + scroll-to-top.
- **Bouton "Payer" sans réponse sur Safari iOS** (sauvegarde v7, _superseded par v11_) : `handlePay` était `async await` sur mutation Convex — quand la WS est suspendue par Safari iOS, la Promise reste pending indéfiniment. v7 : fire-and-forget synchrone. **v11** : `createPayment` (WS) remplacé par `httpMutation('payments:create', …)`. `touchAction: 'manipulation'` + `WebkitTapHighlightColor: 'transparent'` toujours d'actualité sur les boutons.
- **Cold start WebSocket Safari iOS sur /t/ routes** (sauvegarde v6, _étendu en v11_) : Scan QR → spinner 5-10 s → "Problème de connexion". Corrigé : (1) `<link rel="preconnect">` vers Convex URL dans `index.html`, (2) `<script>` inline HTTP bootstrap (`POST /api/query`) avant le bundle JS → résultat dans `window.__tableBootstrap`, (3) `TableEntry` import statique (plus `lazy()`). Format Convex HTTP API : `{ path: "module:fn", format: "json", args: [{...}] }` (args dans array). **v11** : `TableEntry` consomme désormais lui-même `__tableBootstrap` + fetch HTTP (plus de `useQuery` WS du tout).
- **LazyMotion + m.*** (sauvegarde v5) : `motion.*` → `m.*` dans tous les composants + `<LazyMotion features={domAnimation}>` dans `App.tsx`. ~150 kB évités sur le chemin critique.
- **Clerk chargeait sur /t/ routes** (sauvegarde v5) : `ClerkProvider` déplacé dans `src/restaurant/RestaurantRoot.tsx` (lazy-importé). Le bundle initial ne contient plus de référence Clerk.
- **TableEntry naviguait avant données prêtes** (sauvegarde v5, _superseded par v11_) : guards dans l'effet de navigation : `!context`, `context.restaurant.slug !== slug`, `!context.table`, `navigated.current`. **v11** : même logique de guards mais sur le résultat HTTP (plus de `context === undefined` car plus de `useQuery`), chacun mappé sur un `LoadState` distinct.
- **Footer liens en `<a href>`** (sauvegarde v5) : rechargement complet. Tous remplacés par `<Link to>`.
- **Vercel déployait pas depuis sauvegarde-v4** (sauvegarde v5) : Vercel déploie depuis `main` uniquement. Fix : merger dans `main` + `vercel --prod`.
- **QR Codes flash "Aucune table configurée"** (sauvegarde v4) : `rawTables ?? []` → `[]` pendant le chargement. Règle : ne jamais passer `undefined ?? []` à un composant qui affiche un état vide — garder `undefined` pour afficher un spinner.
- **VITE_CONVEX_URL prod** : Vercel prod pointe sur `https://mellow-chinchilla-481.eu-west-1.convex.cloud` (défini via `vercel env add`).
- **Infinite spinner sur /t/ routes** (_superseded par v11_) : `TableEntry` timeout 20 s → écran "Problème de connexion" avec bouton Réessayer (`retryKey` state, pas `window.location.reload()`). **v11** : plus de timeout long — retry HTTP auto (1×, +1 s) puis `LoadState='fetch_error'` avec bouton Réessayer (`retryKey` conservé).
- **Dashboard/client out of sync** : pointaient vers des documents restaurant différents. Fix : merger les doublons de restaurants pour utiliser le même `_id`.
- **Square prices 0€** : items sandbox utilisent `VARIABLE_PRICING`. URL production + token requis.
- **Duplicate restaurant slugs** : `restaurants.create` vérifie slug existant avant insert. `getTableContext` utilise `.first()` pas `.unique()`.

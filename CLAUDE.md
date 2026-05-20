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
```

These must also be set on the prod deployment.

### Routing overview (current single-repo)

```
/restaurant/*         → RestaurantApp (Clerk-protected dashboard)
/t/:slug/:tableNumber → TableEntry (public — customer QR entry point)
/                     → Landing (marketing homepage)
/welcome              → Landing (consumer — après scan QR)
/profile              → Profile (avatar + prénom)
/items → /tip → /payment → /confirmation → /feedback → /feedback/sent
```

Les routes `/table` et `/recap` ont été supprimées (sauvegarde v3). Le flow est désormais : `TableEntry → /welcome → /profile → /items → /tip → /payment → /confirmation → /feedback → /feedback/sent`.

All client routes after `/profile` are protected by `ProtectedRoute` (redirects to `/welcome` if `userName` is empty). Session resets on `/feedback/sent`.

### Auth guard logic (`src/App.tsx`)

`ConsumerAppGuard` wraps the client app. Key rules:
- `window.location.pathname.startsWith('/t/')` is checked **first** (before Clerk state) to prevent auth redirects on hard refresh — `useLocation()` can lag during Clerk re-initialization.
- If Clerk is loaded + user is signed in + `state.restaurantName` is empty → redirect to `/restaurant/onboarding` (restaurant owner flow).
- `flushSync` wraps `dispatch(SET_TABLE_CONTEXT)` in `TableEntry` before `navigate('/')` to prevent a race where the guard sees `restaurantName = ''` at the new path.

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
| `payments.ts` | `list`, `create`, `getOverviewStats` |
| `feedbacks.ts` | `list`, `create`, `markRead` |
| `posIntegrations.ts` | `getByProvider`, `upsert`, `syncLive` |

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
```

`*` = indexed. `tables.status` values: `"free" | "dining" | "payment" | "paid"`.

---

## Realtime — Convex reactive queries

**There are no channels to manage.** `useQuery` hooks re-render automatically when underlying data changes. A `payments.create` mutation triggers all active `useQuery(api.payments.list, ...)` calls across all connected clients instantly.

Dashboard tables live, admin feed, client diner list — all reactive with zero subscription code.

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

Key pages:
- `Overview` — KPIs (CA du jour, tables actives, note moy., pourboires), tables live grid, revenus semaine, activité récente
- `Tables` — live table grid with status filter, table detail modal, **"Simuler commande" (TEST)** button
- `Feedbacks`, `Factures`, `Settings` (POS config, menu sync, QR codes, table setup)

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
dark-hero (#18181B)   — dark section backgrounds
muted (#9CA3AF)       — secondary text
shadow-glow           — orange ring for selected states
```

Never hardcode `#E8920A` — always use `var(--splitzy-orange)` or the `brand` Tailwind alias.

---

## Monetary formatting

**Always** use `formatEur(cents: number)` from `src/utils/formatCurrency.ts`.
Produces `57€` (no decimal) or `62,70€` (comma, no space before `€`). Never `.toFixed()` directly. Never store amounts as floats — always integer cents.

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

### Pages consumer — design attendu (sauvegarde v4)

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

- **Duplicate restaurant slugs**: `restaurants.create` now checks for existing slug before inserting. `getTableContext` uses `.first()` not `.unique()`. If `.unique()` errors appear, there are duplicate restaurant documents — merge them by keeping the one with `clerkUserId`.
- **Refresh redirect on /t/ routes**: Fixed with `window.location.pathname` check in `ConsumerAppGuard` + `flushSync` in `TableEntry` before `navigate('/')`.
- **Square prices 0€**: Sandbox items use `VARIABLE_PRICING`. Production URL + token required. Fixed.
- **Dashboard/client out of sync**: Were pointing to different restaurant documents. Fixed by merging duplicate restaurants so both use the same `_id`.
- **Infinite spinner sur /t/ routes** : `TableEntry` a un timeout de 10 s → écran "Problème de connexion" avec bouton Réessayer.
- **VITE_CONVEX_URL prod** : Vercel prod pointe explicitement sur `https://mellow-chinchilla-481.eu-west-1.convex.cloud` (défini via `vercel env add`).
- **QR Codes flash "Aucune table configurée"** (sauvegarde v4) : `rawTables ?? []` passait `[]` à `QRCodesSection` pendant le chargement Convex → état vide affiché par erreur. Corrigé avec un spinner si `rawTables === undefined`, cohérent avec le pattern de `MenuSection`. Règle générale : ne jamais passer `undefined ?? []` à un composant qui affiche un état vide — toujours garder le `undefined` pour afficher un spinner.

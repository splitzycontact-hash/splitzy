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
| `apps/admin` | deployed — `admin-zeta-gilt-86.vercel.app` | Dark theme internal tool for Splitzy team |

All three apps share **one Convex deployment** (one schema, one set of functions). The Convex backend is the single source of truth — no HTTP calls between apps, only Convex queries/mutations.

### Infrastructure

| Service | Dev | Prod |
|---|---|---|
| Convex backend | `scintillating-viper-372` (`.env.local`) | `mellow-chinchilla-481` (Convex deploy) |
| Vercel frontend | `http://localhost:5173` | `https://www.splitzy.fr` |
| Clerk auth | `pk_test_bm92ZWwtY291Z2FyLTg4…` (dev instance) | `pk_live_Y2xlcmsuc3BsaXR6eS5mciQ` (prod instance, activée 2026-05-22) |
| Square POS | `connect.squareup.com` (production) | same |
| Stripe Connect | Stripe Connect Express | platform: Splitzy, 1.5% commission |

The Vercel production deployment points to **Convex prod** (`mellow-chinchilla-481`). Local dev points to **Convex dev** (`scintillating-viper-372`). Changes to Convex functions must be deployed to both if you want them in prod.

### Clerk — contraintes de domaine (important)

Clerk a deux types d'instances :
- **Dev instance** (`pk_test_...`) — supporte n'importe quel domaine si ajouté dans **Allowed origins**. Utilisée en local ET sur Vercel pour l'instant.
- **Prod instance** (`pk_live_...`) — nécessite un domaine custom vérifié. Les domaines `.vercel.app` ne sont **pas** supportés en prod Clerk.

**État actuel (2026-05-22)** : instance Clerk **prod** activée sur Vercel.
- `VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuc3BsaXR6eS5mciQ` sur Vercel Production
- `CLERK_SECRET_KEY=sk_live_*` (rotatée 2026-05-22) sur Convex prod `mellow-chinchilla-481`
- `allowedRedirectOrigins: ['https://www.splitzy.fr', 'https://splitzy-client.vercel.app']` dans `RestaurantRoot.tsx`

**Si le domaine custom change** : mettre à jour `allowedRedirectOrigins` dans `RestaurantRoot.tsx` + vérifier Clerk dashboard → Domains.

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
| `schema.ts` | Full DB schema (all tables incl. admin) |
| `restaurants.ts` | `getTableContext`, `getByClerkId`, `getBySlug`, `getById`, `create`, `update`, `setSuspended`, `deleteAll`, `listAll`, `listWithLastActivity`, `suspend`, `unsuspend` |
| `tables.ts` | `list`, `createBulk`, `updateStatus`, `resetToFree`, `importAmounts` |
| `menuItems.ts` | `listByRestaurant`, `addItem`, `updateItem`, `deleteItem`, `replaceAll`, `syncFromSquare` |
| `payments.ts` | `list`, `create`, `getOverviewStats` |
| `feedbacks.ts` | `list`, `create`, `markRead`, `markAllRead`, `getNewCount` |
| `posIntegrations.ts` | `getByProvider`, `upsert`, `syncLive` |
| `dependencyStatus.ts` | `list`, `upsert` |
| `users.ts` | `getByClerkId`, `upsert`, `list`, `updateRole` |
| `bugs.ts` | `listOpen`, `listByRestaurant`, `create`, `resolve` |
| `tickets.ts` | `list`, `createFromEmail`, `reply`, `listMessages`, `resolve` |
| `auditLogs.ts` | `list` — read-only, no patch/delete (immutable) |
| `featureFlags.ts` | `list`, `evaluate`, `update` |
| `restaurantNotes.ts` | `list`, `create`, `remove` |
| `admin.ts` | `kpis`, `alerts`, `newTicketsCount`, `impersonate`, `logImpersonation`, `verifyImpersonationToken` |
| `transactions.ts` | `listRecent`, `listByRestaurant`, `countRecentByRestaurant`, `countRecentByIp`, `getOverviewStats`, `markFailed` |

### Files still to add (future phases)

| File | Purpose |
|---|---|
| `http.ts` | HTTP actions — Stripe webhook (`/stripe-webhook`), Mailgun inbound (`/mailgun-inbound`) |
| `crons.ts` | Scheduled jobs — `deliverMorningFeedbacks` (8h Paris), `checkDependencies` (every 30s) |
| `auth.config.ts` | Clerk → Convex JWT config |
| `restaurantMembers.ts` | membership queries |
| `sessions.ts` | `openSession`, `listOpenByRestaurant`, `close` |
| `diners.ts` | `join`, `listBySession` |
| `dinerItems.ts` | `lock`, `markPaid` |
| `stripeWebhooks.ts` | `dispatch`, `getByEventId`, `listRecent`, `retryDeadLetter` |
| `gdprRequests.ts` | `create`, `resolve` |
| `subscriptions.ts` | `list`, `listPastDue`, `incrementDunning` |
| `broadcasts.ts` | `create`, `send` |

> **Note transactions.ts** : `create` et `markSucceeded` sont intentionnellement absents — ils dépendent de la table `sessions` (flow diners non encore implémenté côté client). Les tables `sessions` et `diners` existent dans le schéma mais sont vides en prod.

---

## DB schema (`convex/schema.ts`)

Full schema — all tables, all indexes. `_id` and `_creationTime` are auto-generated by Convex (never declare them).

```
restaurants         slug*, clerkUserId*, plan?, status?, suspended?, type, address, phone, email, name
users               clerkUserId*, role*, email, firstName?, lastName?, avatarUrl?, totpEnabled?
tables              restaurantId*, number, capacity, status, guests?, amountCents?, paidCents?, paidTipCents?, orderItems?, alert?
menuItems           restaurantId*, name, category, priceCents, emoji, description?
payments            restaurantId*, tableId, tableNumber, guests, subtotalCents, tipCents, commissionCents, totalCents, paymentMethod, status, createdAt, dateLabel
feedbacks           restaurantId*, tableId, tableNumber, stars, tags[], text, isNew*, deliveredAt?, createdAt, timeLabel
posIntegrations     restaurantId*, restaurantId+provider*, provider, apiKey, locationId?, extraKey?, status, lastSyncAt?, lastError?, syncedTableCount?
dependencyStatus    service*, status, latencyMs?
sessions            restaurantId*, tableId*, status, closedAt?, totalCents?        [vide en prod]
diners              sessionId*, firstName, avatar?, joinedAt                        [vide en prod]
transactions        restaurantId*, sessionId*, stripePaymentIntentId?, status, amountCents, tipCents?, commissionCents?, succeededAt?, failureCode?, paymentMethod?, ipAddress*   [vide en prod]
disputes            transactionId*, amountCents, status, stripeDisputeId?, reason?, evidenceDueBy?   [vide en prod]
subscriptions       restaurantId*, status*, plan, stripeSubscriptionId?, dunningAttempts?            [vide en prod]
stripeWebhookEvents eventId*, processedAt, status, failureCount?                   [vide en prod]
tickets             restaurantId?, status*, priority, assignedTo?, createdBy?, resolvedAt?          [vide en prod]
ticketMessages      ticketId*, authorId?, body, isInternal?                        [vide en prod]
bugs                status+severity*, restaurantId?, assignedTo?, severity, title, description?, isPinned?, resolvedAt?   [vide en prod]
auditLogs           actorId*, resourceType+resourceId*, action, isImpersonation?, diff?             [vide en prod]
featureFlags        key*, status, rolloutType, rolloutValue?                        [vide en prod]
restaurantNotes     restaurantId*, authorId, body                                  [vide en prod]
```

Tables marquées `[vide en prod]` = schéma déployé mais aucun document écrit par le client actuel. Ajout de documents sans risque.

> **Règle deploy** : ne JAMAIS déployer depuis `Splitzy/convex/` — cela écraserait le schéma et casserait `splitzy.fr`. Toujours depuis `splitzy-client/` uniquement.

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
- `orderItems: OrderItem[]` — real items from `tables.orderItems` (set by simulation/POS); mapped in `SET_TABLE_CONTEXT` with synthetic IDs `order-${index}`. The `/items` page renders these, NOT the full menu.
- `splitMode: 'item' | 'equal' | 'custom'`
- `selectedItems: SelectedItem[]` — each has `menuItemId` + `splitFactor` (1–4); `menuItemId` matches `OrderItem.id`
- `tipPercent: number` — default **10** (changed from 0), range 0–30
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
4. On confirm: calls `tables.updateStatus(tableId, status='dining', guests=totalQty, amountCents=total, orderItems=[...])` — persists the simulated order items so the consumer `/items` page can display them (not the full menu).

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
- CTAs en bas de page : `position: fixed; bottom: 0; left: 0; width: 100%; zIndex: 50` + `paddingBottom: 'max(Xpx, calc(Ypx + env(safe-area-inset-bottom)))'`. Le container scrollable doit avoir un padding-bottom suffisant (≥140–160px) pour ne pas être masqué par le CTA fixe. Ne pas utiliser `position: sticky` dans un flex column `minHeight: 100%` — ça ne fonctionne pas.
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

- **Admin app fonctionnel sans toucher splitzy.fr** (v8, 2026-05-23) : `bugs:listOpen` crashait l'admin (`admin-zeta-gilt-86.vercel.app`) car les tables admin n'existaient pas dans `splitzy-client/convex/`. Solution : ajout de 13 tables dans le schéma (`users`, `sessions`, `diners`, `transactions`, `disputes`, `subscriptions`, `stripeWebhookEvents`, `tickets`, `ticketMessages`, `bugs`, `auditLogs`, `featureFlags`, `restaurantNotes`) + création des fichiers `users.ts`, `bugs.ts`, `tickets.ts`, `auditLogs.ts`, `featureFlags.ts`, `restaurantNotes.ts`, `admin.ts`, `transactions.ts` + ajout de `getById`, `listAll`, `listWithLastActivity`, `suspend`, `unsuspend` dans `restaurants.ts`. Déployé sur `mellow-chinchilla-481`. **JAMAIS déployer depuis `Splitzy/convex/`** — l'historique montre que ça casse `splitzy.fr` (schéma incompatible sur `restaurants.create`).

- **Clerk prod + fixes CSS/feedbacks** (v6, 2026-05-22) : (1) Basculé sur instance Clerk prod (`pk_live_*`) — `VITE_CLERK_PUBLISHABLE_KEY` mis à jour sur Vercel, `CLERK_SECRET_KEY` (`sk_live_*`, rotatée) mis à jour sur Convex prod. `allowedRedirectOrigins` ajouté dans `RestaurantRoot.tsx`. (2) `index.css` : `.marketing-site` `min-height: 100vh` → `100dvh`. (3) `Feedbacks.tsx` : fallback mocks statiques supprimé — skeleton `animate-pulse` affiché pendant le chargement Convex ; import `FEEDBACKS` supprimé.

- **Sync paiements client↔dashboard + déploiement Convex prod** (v5, 2026-05-22) : (1) `payments.create` réconcilie désormais la table — cumule `paidCents` (Σ `subtotalCents`) et `paidTipCents` (Σ `tipCents`), passe `status` à `payment` puis `paid` dès que `paidCents >= amountCents`, **sans jamais modifier `amountCents`** (total de la commande figé pendant la session). `tables.updateStatus` (quand `amountCents` est fourni), `resetToFree` et `importAmounts` remettent `paidCents`/`paidTipCents` à zéro (nouvelle sitting / libération). Le dashboard `Tables.tsx` + `Overview.tsx` lisent payé/restant en réactif. (2) **Leçon déploiement critique** : un fix qui ne change que le *corps d'un handler* Convex reste cassé en prod tant que `npx convex deploy --yes` n'est pas lancé depuis `splitzy-client/` — `vercel --prod` ne déploie QUE le frontend, jamais les fonctions Convex. Les deux déploiements sont indépendants et tous deux requis. Piège diagnostic : `npx convex function-spec --prod` ne révèle PAS un handler périmé quand les args sont inchangés. Vérifier le comportement réel via `npx convex run --prod <module>:<fn> '{...}'` ; pour tester sans polluer la prod, créer un resto jetable (`restaurants:create` + `tables:createBulk`) puis `restaurants:deleteAll` — les tables `payments`/`feedbacks` n'ont **pas** de mutation delete (un test sur un vrai resto laisse des résidus permanents dans le ledger CA).

- **CTAs fixes + /items articles commandés + schéma Convex** (sauvegarde v11) : (1) Tous les CTAs consumer passés en `position: fixed; bottom: 0; left: 0; width: 100%` (Landing, Profile, Items, Tip, Payment, Confirmation, Feedback) — `sticky` ne fonctionnait pas dans flex column. (2) Page `/items` : suppression du menu complet, affichage des seuls articles commandés (`state.orderItems`) issus de `tables.orderItems` en Convex. Pipeline complet : `Tables.tsx` (dashboard) → `tables.updateStatus` (avec `orderItems`) → `TableEntry` → `SET_TABLE_CONTEXT` → `state.orderItems`. (3) `/confirmation` simplifiée : boutons PDF et email supprimés, CTA fixé. (4) Schéma Convex : dérive pré-existante corrigée — `feedbacks.deliveredAt`, `restaurants.plan`, `restaurants.status` ajoutés en `v.optional(...)` pour valider les docs existants. Le push échouait doc par doc. (5) `tipPercent` initialisé à 10 (était 0). (6) Bug `TABLE_TOTAL_CENTS = 0` dans `generateInvoice.ts` corrigé (mode equal utilisait la constante au lieu de `state.tableTotalCents`).

- **Bugs texte landing page + marquee logos** (sauvegarde v10) : (1) `TextReveal` dans `CtaFinal.tsx`, `Testimonials.tsx`, `Solution.tsx` : le trailing `' '` à l'intérieur d'un `span` `display:inline-block` est strippé par le browser. Fix documenté dans la section "Marketing site" ci-dessus. (2) Marquee logos mobile (`Logos.tsx`) : le `m.div` flex prenait la largeur du parent `overflow-hidden` (= viewport), les items se compressaient → gaps invisibles. Fix : `style={{ width: 'max-content' }}` + `shrink-0` sur chaque item.
- **Marketing pages redesign + FonctionnalitesHero** (sauvegarde v9) : Refonte complète des pages secondaires (Changelog, Presse, Aide, Sécurité) + `FonctionnalitesHero.tsx` dans `src/components/Fonctionnalites/`. `package.json` : ajout `"sonner": "^2.0.7"` — manquait (existait en node_modules orphelin → build Vercel échouait avec TS2307). Règle : toujours vérifier que les dépendances sont dans `package.json`, le build local peut passer si elles sont en node_modules orphelin.
- **Homepage sections 1.5-1.9 + blog routing** (sauvegarde v8) : `Stats.tsx`, `Solution.tsx`, `Testimonials.tsx`, `PricingPreview.tsx`, `CtaFinal.tsx` réécrits. `blogData.ts` + `BlogArticlePage.tsx` créés (route `/blog/:slug`). `Footer.tsx` : liens internes convertis en `<Link to>` + scroll-to-top.
- **Bouton "Payer" sans réponse sur Safari iOS** (sauvegarde v7) : `handlePay` était `async await` sur mutation Convex — quand la WS est suspendue par Safari iOS, la Promise reste pending indéfiniment. Corrigé en synchrone fire-and-forget : `void createPayment({...}).catch(() => {})` + navigate immédiat. `touchAction: 'manipulation'` + `WebkitTapHighlightColor: 'transparent'` sur les boutons.
- **Cold start WebSocket Safari iOS sur /t/ routes** (sauvegarde v6) : Scan QR → spinner 5-10 s → "Problème de connexion". Corrigé : (1) `<link rel="preconnect">` vers Convex URL dans `index.html`, (2) `<script>` inline HTTP bootstrap (`POST /api/query`) avant le bundle JS → résultat dans `window.__tableBootstrap`, (3) `TableEntry` import statique (plus `lazy()`). Format Convex HTTP API : `{ path: "module:fn", format: "json", args: [{...}] }` (args dans array).
- **Bouton "Payer" sans réponse sur Safari iOS** (sauvegarde v7) : `handlePay` était `async await` sur mutation Convex — quand la WS est suspendue par Safari iOS, la Promise reste pending. Fix : fire-and-forget synchrone.
- **LazyMotion + m.*** (sauvegarde v5) : `motion.*` → `m.*` dans tous les composants + `<LazyMotion features={domAnimation}>` dans `App.tsx`. ~150 kB évités sur le chemin critique.
- **Clerk chargeait sur /t/ routes** (sauvegarde v5) : `ClerkProvider` déplacé dans `src/restaurant/RestaurantRoot.tsx` (lazy-importé). Le bundle initial ne contient plus de référence Clerk.
- **TableEntry naviguait avant données prêtes** (sauvegarde v5) : 4 guards dans l'effet de navigation : `context === undefined`, `!context`, `context.restaurant.slug !== slug`, `!context.table`, `navigated.current`.
- **Footer liens en `<a href>`** (sauvegarde v5) : rechargement complet. Tous remplacés par `<Link to>`.
- **Vercel déployait pas depuis sauvegarde-v4** (sauvegarde v5) : Vercel déploie depuis `main` uniquement. Fix : merger dans `main` + `vercel --prod`.
- **QR Codes flash "Aucune table configurée"** (sauvegarde v4) : `rawTables ?? []` → `[]` pendant le chargement. Règle : ne jamais passer `undefined ?? []` à un composant qui affiche un état vide — garder `undefined` pour afficher un spinner.
- **VITE_CONVEX_URL prod** : Vercel prod pointe sur `https://mellow-chinchilla-481.eu-west-1.convex.cloud` (défini via `vercel env add`).
- **Infinite spinner sur /t/ routes** : `TableEntry` timeout 20 s → écran "Problème de connexion" avec bouton Réessayer (`retryKey` state, pas `window.location.reload()`).
- **Dashboard/client out of sync** : pointaient vers des documents restaurant différents. Fix : merger les doublons de restaurants pour utiliser le même `_id`.
- **Square prices 0€** : items sandbox utilisent `VARIABLE_PRICING`. URL production + token requis.
- **Duplicate restaurant slugs** : `restaurants.create` vérifie slug existant avant insert. `getTableContext` utilise `.first()` pas `.unique()`.

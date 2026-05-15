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

Splitzy is a **restaurant bill-splitting app** with two surfaces:

1. **Client app** (`/`, `/profile`, `/table`, …) — mobile-first, accessed via QR code
2. **Restaurant dashboard** (`/restaurant/*`) — desktop, for restaurant owners

### Infrastructure

| Service | Dev | Prod |
|---|---|---|
| Convex backend | `scintillating-viper-372` (`.env.local`) | `mellow-chinchilla-481` (Convex deploy) |
| Vercel frontend | `http://localhost:5173` | `https://splitzy-client.vercel.app` |
| Clerk auth | `pk_test_bm92ZWwtY291Z2FyLTg4…` (test) | same key used on Vercel |
| Square POS | `connect.squareup.com` (production) | same |

The Vercel production deployment points to **Convex prod** (`mellow-chinchilla-481`). Local dev points to **Convex dev** (`scintillating-viper-372`). Changes to Convex functions must be deployed to both if you want them in prod.

### Convex env vars (set on dev deployment)

```
SQUARE_ACCESS_TOKEN   # Square production token (EAAAl_b44btPH…)
SQUARE_LOCATION_ID    # LS3JS5QB97NV8
```

These must also be set on the prod deployment if Square sync is needed there.

### Routing overview

```
/restaurant/*         → RestaurantApp (Clerk-protected dashboard)
/t/:slug/:tableNumber → TableEntry (public — customer QR entry point)
/                     → Landing
/profile              → Profile (set name + avatar)
/table → /items → /recap → /tip → /payment → /confirmation → /feedback → /feedback/sent
```

All client routes after `/profile` are protected by `ProtectedRoute` (redirects to `/` if `userName` is empty). Session resets on `/feedback/sent`.

### Auth guard logic (`src/App.tsx`)

`ConsumerAppGuard` wraps the client app. Key rules:
- `window.location.pathname.startsWith('/t/')` is checked **first** (before Clerk state) to prevent auth redirects on hard refresh — `useLocation()` can lag during Clerk re-initialization.
- If Clerk is loaded + user is signed in + `state.restaurantName` is empty → redirect to `/restaurant/onboarding` (restaurant owner flow).
- `flushSync` wraps `dispatch(SET_TABLE_CONTEXT)` in `TableEntry` before `navigate('/')` to prevent a race where the guard sees `restaurantName = ''` at the new path.

### Convex backend (`convex/`)

| File | Key exports |
|---|---|
| `schema.ts` | Full DB schema (see below) |
| `restaurants.ts` | `getTableContext`, `getByClerkId`, `getBySlug`, `create`, `update`, `setSuspended`, `deleteAll` |
| `tables.ts` | `list`, `createBulk`, `updateStatus`, `resetToFree`, `importAmounts` |
| `menuItems.ts` | `listByRestaurant`, `addItem`, `updateItem`, `deleteItem`, `replaceAll`, `syncFromSquare` |
| `payments.ts` | `list`, `create`, `getOverviewStats` |
| `feedbacks.ts` | `list`, `create`, `markRead` |
| `posIntegrations.ts` | `getByProvider`, `upsert`, `syncLive` |

### DB schema

```
restaurants   slug (indexed), clerkUserId (indexed), name, address, phone, email, type, suspended?
tables        restaurantId (indexed), number, capacity, status, guests?, durationMinutes?, amountCents?, alert?
payments      restaurantId (indexed), tableId, tableNumber, guests, subtotalCents, tipCents, commissionCents, totalCents, paymentMethod, status, createdAt, dateLabel
feedbacks     restaurantId (indexed), tableId, tableNumber, stars, tags[], text, isNew, createdAt, timeLabel
posIntegrations restaurantId (indexed+provider), provider, apiKey, locationId?, status, lastSyncAt?, lastError?
menuItems     restaurantId (indexed), name, category, priceCents, emoji, description?
```

`tables.status` values: `"free" | "dining" | "payment" | "paid"`

### Client flow — state management

Single global context: `src/context/SessionContext.tsx` — `useReducer` with `SessionState`/`SessionAction` (defined in `src/context/types.ts`).

**Key state fields:**
- `restaurantName`, `tableNumber`, `tableCapacity` — set by `SET_TABLE_CONTEXT` when a QR code is scanned (via `TableEntry`)
- `convexRestaurantId`, `convexTableId` — Convex IDs for the active restaurant/table
- `tableTotalCents` — amount from `tables.amountCents` (set by POS or simulation), used in equal/custom split
- `splitMode: 'item' | 'equal' | 'custom'`
- `selectedItems: SelectedItem[]` — each has `menuItemId` + `splitFactor` (1–4)
- `tipPercent: number` — 0–30
- `convives: Convive[]` — other people at the table (populated by real scan context, not mock)

**Derived values** (never stored in state, computed in `src/hooks/useSessionCalcs.ts`):
- `subtotal` — depends on splitMode
- `tipAmount = subtotal × tipPercent / 100`
- `splitzyFee = subtotal × 1.5%` (display only, not added to total)
- `total = subtotal + tipAmount`

### Mock / seed data

- `src/data/menu.ts` — 14 static menu items for the client demo (not synced from Convex). Items with `takenBy` are greyed out.
- `src/data/session.ts` — **cleaned**: `TABLE_TOTAL_CENTS = 0`, `MOCK_SESSION.convives = []`, `restaurantName = ''`. `MOCK_CARDS` (Visa/Mastercard) still present for the payment carousel demo.
- Real menu data lives in Convex `menuItems` table, synced from Square via `syncFromSquare`.

### Square POS integration

`convex/menuItems.ts → syncFromSquare` action:
- Calls `connect.squareup.com/v2/catalog/list?types=ITEM,CATEGORY` (production, not sandbox)
- Token priority: `process.env.SQUARE_ACCESS_TOKEN` (Convex env var) → DB (`posIntegrations.apiKey`)
- Maps `item_data.variations[0].item_variation_data.price_money.amount` → `priceCents`
- Items with `pricing_type: "VARIABLE_PRICING"` get `priceCents: 0` — they must be set to Fixed Pricing in Square dashboard
- Categories mapped to: `entrees | plats | desserts | boissons`

### Restaurant dashboard (`src/restaurant/`)

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

This simulates what a real POS would send and is the primary way to test the client QR flow end-to-end.

### Design tokens (Tailwind)

```
brand / brand-dark / brand-light / brand-bg / brand-glow  — orange palette (#E8920A)
dark-hero (#18181B)   — dark section backgrounds
muted (#9CA3AF)       — secondary text
shadow-glow           — orange ring for selected states
```

### Monetary formatting

**Always** use `formatEur(cents: number)` from `src/utils/formatCurrency.ts`.
Produces `57€` (no decimal) or `62,70€` (comma, no space before `€`). Never `.toFixed()` directly.

### Animations

`src/utils/animations.ts`: `pageVariants` (page slide + `AnimatePresence`), `slideDown`, `springPop`, `checkAnimation`, `starStagger` + `starItem`.

### PhoneWrapper

On desktop (>768px) the client app renders inside an iPhone 15 Pro frame (390px, radius 44px). On real mobile it's transparent. **All client UI modifications must target real mobile** — do not use the desktop PhoneWrapper as reference.

### Avatar system

`src/components/ui/Avatar.tsx` — 6 emoji avatars: `['🦊','🐻','🐸','🐙','🦄','🐯']` (indexed 0–5). Each has a paired background color.

## Known issues fixed (context for future sessions)

- **Duplicate restaurant slugs**: `restaurants.create` now checks for existing slug before inserting. `getTableContext` uses `.first()` not `.unique()`. If `.unique()` errors appear, there are duplicate restaurant documents — merge them by keeping the one with `clerkUserId`.
- **Refresh redirect on /t/ routes**: Fixed with `window.location.pathname` check in `ConsumerAppGuard` + `flushSync` in `TableEntry` before `navigate('/')`.
- **Square prices 0€**: Sandbox items use `VARIABLE_PRICING`. Production URL + token required. Fixed.
- **Dashboard/client out of sync**: Were pointing to different restaurant documents. Fixed by merging duplicate restaurants so both use the same `_id`.

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

## Architecture

This is a **no-backend demo app** — all data is hardcoded in `src/data/`. There are no API calls. The goal is a convincing interactive pitch for investors and pilot restaurants.

### User flow (10 screens in order)

```
/ → /profile → /table → /items → /recap → /tip → /payment → /confirmation → /feedback → /feedback/sent
```

All routes after `/profile` are protected by `ProtectedRoute` (redirects to `/` if `userName` is empty). Session resets via `RESET_SESSION` on `/feedback/sent`.

### State management

Single global context: `src/context/SessionContext.tsx` — a `useReducer` with `SessionState` and `SessionAction` (defined in `src/context/types.ts`). No external state library.

**Key state fields:**
- `splitMode: 'item' | 'equal' | 'custom'` — drives the Items screen logic
- `selectedItems: SelectedItem[]` — each has `menuItemId` + `splitFactor` (1–4, divides the price)
- `tipPercent: number` — 0–30, applied to subtotal in `useSessionCalcs`
- `equalSplitCount` / `customAmount` — used when splitMode is not `'item'`

**Derived values** are never stored in state — always computed in `src/hooks/useSessionCalcs.ts`:
- `subtotal` depends on `splitMode` (item prices × split factors, or table total ÷ N, or custom)
- `tipAmount = subtotal × tipPercent / 100`
- `splitzyFee = subtotal × 1.5%` (displayed in invoice, not added to total)
- `total = subtotal + tipAmount`

### Mock data

- `src/data/menu.ts` — 14 menu items; items with `takenBy` are already claimed by other convives (greyed out on the Items screen)
- `src/data/session.ts` — restaurant name/table, 3 convives (Alice/Marc/Léa), `MOCK_CARDS` for the payment carousel, `TABLE_TOTAL_CENTS = 8740` used for equal-split mode

### Design tokens

Custom Tailwind tokens in `tailwind.config.js`:
- `brand` / `brand-dark` / `brand-light` / `brand-bg` / `brand-glow` — orange palette
- `dark-hero` (`#18181B`) — dark section backgrounds
- `muted` (`#9CA3AF`) — secondary text
- `shadow-glow` — orange ring for selected states

### Monetary formatting

**Always** use `formatEur(cents: number)` from `src/utils/formatCurrency.ts`. It produces `57€` (no decimal) or `62,70€` (comma decimal, no space before `€`). Never call `.toFixed()` directly on prices.

### Animations

Reusable Framer Motion variants in `src/utils/animations.ts`: `pageVariants` (page slide transitions used with `AnimatePresence` in `App.tsx`), `slideDown` (accordion/SplitStrip), `springPop` (avatar selection), `checkAnimation` (confirmation circle), `starStagger` + `starItem` (star rating).

### PhoneWrapper

On desktop (>768px), the entire app renders inside an iPhone 15 Pro frame (`390px` wide, `border-radius: 44px`). On mobile it's transparent. This is purely cosmetic for pitch demos.

### Avatar system

`src/components/ui/Avatar.tsx` — 6 emoji avatars indexed 0–5: `['🦊','🐻','🐸','🐙','🦄','🐯']`. `avatarIndex` in `Convive` and `userAvatarIndex` in `SessionState` reference this array. Each has a paired background color.

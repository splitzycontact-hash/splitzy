# Splitzy — Memory technique (sessions mai–juin 2026)

## Problèmes résolus

### 1. Tables 4+ ne fonctionnaient pas pour le paiement
**Cause** : `confirmSimulation()` dans `Tables.tsx` générait `simItems` mais ne les passait jamais à `updateStatus` → `orderItems` jamais écrit dans Convex.  
**Fix** : ajout de `orderItems: simItems` dans l'appel `updateStatus` (`src/restaurant/pages/Tables.tsx`).

### 2. iOS Safari — spinner infini / "Connexion lente"
**Cause** : `liveTable === undefined` pendant 15-30s sur iOS (WebSocket Convex lent à s'établir). La page attendait Convex avant d'afficher quoi que ce soit.  
**Fix** : `cachedOrderItems` stockés dans `SessionContext` dès le scan QR (via HTTP bootstrap dans `TableEntry`). Items.tsx utilise le cache immédiatement sans attendre Convex.

### 3. `paidCents` non trackés → re-présentation du total entier
**Cause** : `useSessionCalcs` faisait `liveTable?.paidCents ?? 0` → 0 si WebSocket pas établi.  
**Fix** : `paidCents = liveTable?.paidCents ?? state.cachedPaidCents`. `cachedPaidCents` est mis à jour dans `SessionContext` après chaque paiement via `ADD_CACHED_PAID_CENTS`.

### 4. Double paiement possible (ex : 130€ payés sur 114€)
**Cause** : après paiement, les articles restaient visibles → un deuxième paiement était possible sur les mêmes items.  
**Fix** :
- `Payment.tsx` : dispatch `MARK_CACHED_ITEMS_PAID` quand `subtotal >= remainingCents` → tous les articles du cache marqués `paid: true`
- `Items.tsx` : early return `if (isFullyPaid)` → affiche "Table entièrement réglée ✅" et bloque structurellement tout nouveau paiement

### 5. Articles payés visibles après "Bonne soirée"
**Cause** : `RESET_SESSION` remettait `cachedOrderItems: []` → au retour sur `/welcome` les items reprenaient leur état initial depuis `tableTotalCents`.  
**Fix** : `RESET_SESSION` préserve `cachedOrderItems` et `cachedPaidCents` (comme il préserve `restaurantName`, `tableNumber`, etc.).

### 6. Articles payés (mode "par article") restaient visibles après paiement partiel
**Cause** : Convex ne marquait `orderItems[].paid = true` que lorsque la table était **entièrement** réglée. Pour un paiement partiel en mode "par article", les articles payés conservaient `paid: false` → ils continuaient à s'afficher dans `Items.tsx` (qui filtre sur `!i.paid`). Le bandeau "Déjà payé / Reste" était correct, mais les articles ne disparaissaient pas.  
**Fix** (session 2026-05-27) :
- `convex/payments.ts` : `payments.create` accepte `paidItemNames?: string[]`. Quand présent, marque ces articles spécifiques `paid: true` dans `orderItems` immédiatement (sans attendre le paiement total). Gère correctement `qty > 1` : réduit la `qty` si seulement une partie est payée.
- `src/context/types.ts` : `SelectedItem` a un champ `name: string`. `TOGGLE_ITEM` payload inclut `name`. Nouvelle action `MARK_SPECIFIC_ITEMS_PAID: string[]`.
- `src/context/SessionContext.tsx` : `TOGGLE_ITEM` stocke `name` dans `SelectedItem`. Nouveau reducer `MARK_SPECIFIC_ITEMS_PAID` (même logique qty que Convex, pour le cache iOS).
- `src/pages/Items.tsx` : dispatch `TOGGLE_ITEM` passe `name: it.name`.
- `src/pages/Payment.tsx` : après paiement en mode "item", envoie `paidItemNames` (articles à `splitFactor === 1` uniquement) à Convex et dispatche `MARK_SPECIFIC_ITEMS_PAID` dans le cache.

**Note splitFactor** : les articles partagés (`splitFactor > 1`) ne sont PAS marqués `paid` — ils restent visibles pour que les autres convives puissent payer leur part.

---

## Architecture état client

### SessionContext (`src/context/SessionContext.tsx`)
State global via `useReducer`. Champs clés ajoutés :
```typescript
cachedOrderItems: CachedOrderItem[]  // rempli au scan QR depuis TableEntry
cachedPaidCents: number              // cumulé après chaque paiement
```

### Actions (`src/context/types.ts`)
```typescript
| { type: 'ADD_CACHED_PAID_CENTS'; payload: number }
| { type: 'MARK_CACHED_ITEMS_PAID' }                      // tout payer d'un coup
| { type: 'MARK_SPECIFIC_ITEMS_PAID'; payload: string[] } // paiement partiel par article
```

### SelectedItem (mis à jour)
```typescript
export interface SelectedItem {
  menuItemId: string
  splitFactor: 1 | 2 | 3 | 4
  priceCents: number
  name: string   // ← ajouté session 2026-05-27
}
```

### Stratégie iOS Safari
Pas de dépendance au WebSocket pour l'affichage initial. Toutes les données critiques sont cachées dans SessionContext au moment du scan QR (via le HTTP bootstrap de `TableEntry` qui fonctionne avant même que le bundle JS soit parsé).

---

## Flux de données — paiement partiel (mis à jour)

```
TableEntry (scan QR)
  → dispatch SET_TABLE_CONTEXT
    → cachedOrderItems = table.orderItems
    → cachedPaidCents = table.paidCents

Items.tsx
  → sourceItems = liveTable?.orderItems ?? state.cachedOrderItems
  → tableUnpaidItems = sourceItems.filter(i => !i.paid)
  → if (isFullyPaid) → écran "Table réglée" (early return)
  → TOGGLE_ITEM dispatch inclut name: it.name

Payment.tsx (après paiement réussi)
  → paidItemNames = selectedItems.filter(splitFactor===1).map(i=>i.name)
  → Convex createPayment({ ..., paidItemNames })
  → dispatch ADD_CACHED_PAID_CENTS(subtotal)
  → si total réglé → dispatch MARK_CACHED_ITEMS_PAID
  → sinon si mode item → dispatch MARK_SPECIFIC_ITEMS_PAID(paidItemNames)

Convex payments.create
  → paidCents += subtotalCents
  → si table entièrement réglée → tous orderItems paid: true
  → sinon si paidItemNames → marquer ces items spécifiques paid: true (ou réduire qty)

useSessionCalcs.ts
  → paidCents = liveTable?.paidCents ?? state.cachedPaidCents
  → remainingCents = max(0, billCents - paidCents)
  → isFullyPaid = billCents > 0 && remainingCents === 0
```

---

## Convex backend — points importants

### `tables.ts`
- `getOne` : query réactive utilisée par `useSessionCalcs` pour `paidCents` en temps réel
- `updateStatus` : patch conditionnel — ne réinitialise pas `amountCents`/`orderItems` si déjà présents
- `orderItems` schema : `{ name, qty, unitCents, paid?: boolean }`

### `payments.ts`
- `payments.create` : cumule `paidCents` sur la table
  - Si table entièrement soldée → tous les items `paid: true`
  - Si paiement partiel "par article" (`paidItemNames` présent) → marque ces items spécifiques `paid: true` (ou réduit `qty` si partiel)
  - Jamais de throw si la table a disparu (robustesse)

### Ordre de déploiement (TOUJOURS respecter)
1. `npx convex deploy --yes` (depuis `~/Downloads/test/Splitzy/`)
2. `vercel --prod` (depuis `~/Downloads/test/splitzy-client/`)

---

## Infrastructure

| Service | Dev | Prod |
|---|---|---|
| Convex | `scintillating-viper-372` | `mellow-chinchilla-481` |
| Vercel | `localhost:5173` | `www.splitzy.fr` |
| Clerk | `pk_test_...` | `pk_test_...` (même clé, splitzy-client.vercel.app autorisé) |

---

## Commandes utiles

```bash
export PATH="$HOME/.local/node/bin:$PATH"

# Dev
npm run dev

# Deploy Convex prod
cd ~/Downloads/test/Splitzy && npx convex deploy --yes

# Deploy Vercel prod
cd ~/Downloads/test/splitzy-client && vercel --prod

# TypeScript check local (sans build Rollup)
cd ~/Downloads/test/splitzy-client && npx tsc --noEmit

# Git workflow (toujours merger sauvegarde-vX dans main avant vercel --prod)
git checkout main
git merge sauvegarde-vX --no-ff -m "merge: description"
vercel --prod
git push origin main
```

---

## Bugs connus résiduels / points de vigilance

- **HEAD.lock** : git crée parfois un `.git/HEAD.lock` dans le sandbox Claude. Si `git checkout` échoue avec "File exists", supprimer manuellement : `rm -f /path/to/.git/HEAD.lock`
- **Vercel déploie depuis `main` uniquement** : les branches `sauvegarde-*` ne déclenchent que des previews
- **`npm run build` échoue dans le sandbox Claude** : erreur `@rollup/rollup-linux-arm64-gnu` (architecture). Utiliser `npx tsc --noEmit` pour vérifier le TypeScript localement
- **iOS Safari WebSocket** : Convex prend 15-30s à s'établir. Toujours tester les features critiques sur iPhone réel, pas seulement Chrome desktop
- **Apostrophes françaises** dans les strings TSX : utiliser guillemets doubles comme délimiteurs (`"avant qu'il arrive"`)
- **`font-size: 16px` minimum** sur tous les inputs — en dessous iOS zoome automatiquement
- **splitFactor > 1** : articles partagés ne sont pas marqués `paid` après paiement partiel — ils restent visibles pour les autres convives. Comportement intentionnel à date (v1).

---

## Fichiers modifiés (toutes sessions)

| Fichier | Changement |
|---|---|
| `src/context/types.ts` | `CachedOrderItem`, `cachedOrderItems`, `cachedPaidCents`, `ADD_CACHED_PAID_CENTS`, `MARK_CACHED_ITEMS_PAID`, `MARK_SPECIFIC_ITEMS_PAID` ; `name` dans `SelectedItem` et `TOGGLE_ITEM` |
| `src/context/SessionContext.tsx` | initialState + handlers pour toutes les actions ci-dessus, RESET_SESSION préserve le cache |
| `src/hooks/useSessionCalcs.ts` | `paidCents` fallback sur `state.cachedPaidCents` |
| `src/pages/TableEntry.tsx` | dispatch `cachedOrderItems` + `cachedPaidCents` au scan QR |
| `src/pages/Items.tsx` | fallback cache iOS + early return `isFullyPaid` + `name` dans TOGGLE_ITEM |
| `src/pages/Payment.tsx` | `ADD_CACHED_PAID_CENTS` + `MARK_CACHED_ITEMS_PAID` + `MARK_SPECIFIC_ITEMS_PAID` + `paidItemNames` envoyés à Convex |
| `src/restaurant/pages/Tables.tsx` | `orderItems: simItems` dans `confirmSimulation` |
| `convex/payments.ts` (Splitzy monorepo) | `paidItemNames` optionnel dans `create` ; logique de marquage partiel des articles |

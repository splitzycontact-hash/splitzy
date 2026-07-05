# GOAL — Corriger le reliquat de convives entre deux installations (suite à GOALS_GUESTS_REEL.md)

Contexte : la feature "convives réels" (commit d650233) ne fabrique plus de faux chiffre, mais elle a un trou trouvé en prod (Table 4, "Le Comptoir de Michel") : quand une table redevient libre puis qu'un **client scanne le QR pour une nouvelle installation**, rien ne vide l'ancien compteur de convives — il reste affiché tel quel alors qu'il s'agit du service précédent. Seuls `resetToFree` (bouton gérant) et `addOrderItems` (staff, "Ajouter un article") nettoient correctement aujourd'hui ; le chemin scan-client (`tables:updateStatus`) et le chemin POS (`updateTableFromPOS`) ne le font pas.

Règle absolue : ne toucher qu'aux 2 fonctions Convex citées ci-dessous + un ajustement additif dans `computeGuestsPatch`. Ne touche à AUCUNE logique d'argent (`paidCents`, `amountCents`, `totalCents`).

---

## GOAL A — Nettoyer les transitions "nouvelle installation"

**`convex/tables.ts` → `updateStatus`** (~ligne 113-114) : quand `existing.status === "free"` ET `status === "dining"` (= ouverture d'une nouvelle installation, que ce soit via scan client ou staff) ET qu'aucun `guests` n'est fourni dans cet appel → forcer `patch.guests = undefined` et `patch.sittingStartedAt = Date.now()`, exactement comme le fait déjà `addOrderItems` (~ligne 215-217) pour son propre cas `opening`. Si `guests` EST fourni dans l'appel, garder le comportement actuel (ligne 114 inchangée pour ce cas).

**`convex/tables.ts` → `updateTableFromPOS`** (~ligne 92-111) : quand le patch calculé fixe `status: "free"` (car `amountCents <= 0`), ajouter aussi `guests: undefined, sittingStartedAt: undefined` au patch — symétrique à `resetToFree`. Ne rien changer à la branche `amountCents > 0` (le nettoyage se sera déjà fait au passage précédent par "free").

**`convex/payments.ts` → `computeGuestsPatch`** (créée aujourd'hui, GOAL 1 de `GOALS_GUESTS_REEL.md`) : si `table.sittingStartedAt` est défini, filtrer les paiements "Encaissé" comptés par `createdAt >= table.sittingStartedAt` (borne exacte) au lieu de l'heuristique par cumul de `paidCents`. Si `sittingStartedAt` est absent (anciennes tables non encore passées par le nouveau code), garder l'heuristique existante en fallback — ne pas la supprimer.

---

## GOAL B — Validation dev puis déploiement

1. Sur Convex dev (`scintillating-viper-372`) : simuler le cycle complet sur une table de test — installation 1 (3 payeurs distincts, payer, `guests` doit valoir 3) → table réglée → `updateTableFromPOS` ou nouveau scan simulé la remet à "free" → nouvelle installation 2 démarre (`updateStatus` free→dining sans `guests`) → **vérifier que `table.guests` est bien `undefined`/0 à ce stade, PAS 3**. Puis simuler 2 payeurs sur cette installation 2 → vérifier `guests === 2`, pas de reliquat de "3".
2. Ajouter ce scénario à `VALIDATION_GUESTS_REEL.md` (append, ne pas écraser l'existant).
3. Si pass : `npm run build`, commit (`convex/tables.ts convex/payments.ts`), push, **`npx convex deploy --yes`** (obligatoire, `convex/` modifié).
4. Si fail : STOP, documenter l'écart exact, ne pas déployer.

# GOAL — Corriger le reliquat `paidCents` après libération POS (suite à GOAL_FIX_GUESTS_STALE.md)

Contexte : en corrigeant le reliquat de convives, on a trouvé un bug plus grave, documenté mais volontairement non corrigé par discipline de périmètre : `updateTableFromPOS` (`convex/posIntegrations.ts:92-119`) purge déjà `guests`/`sittingStartedAt` quand le POS libère une table (`amountCents <= 0`), mais **ne purge pas `paidCents`/`paidTipCents`**. Seul `resetToFree` (bouton manuel du gérant) le fait.

**Conséquence réelle sur l'argent** : si une table encaisse 90€ (`paidCents = 9000`), puis le POS la libère sans que le gérant clique "Libérer la table", puis une nouvelle installation démarre — `payments.create` (`convex/payments.ts:88-91`) plafonne le sous-total au "restant dû" = `amountCents - paidCents`. Avec `paidCents` resté à 9000€ par erreur, un vrai client de la nouvelle installation peut se voir plafonné à un montant à payer trop bas, voire 0. C'est un vrai risque de perte d'argent pour le restaurant, pas un problème d'affichage.

Règle absolue, différente des GOALs précédents : ce GOAL touche VOLONTAIREMENT `paidCents`/`paidTipCents`. C'est justifié et sûr car on ne fait QUE reproduire, sur un chemin qui l'oubliait, ce que `resetToFree` (fonction déjà en prod, déjà de confiance) fait déjà pour ces mêmes champs. On ne touche à AUCUNE logique de crédit (`confirmPayment` reste l'unique endroit qui AUGMENTE `paidCents` — inchangé).

---

## GOAL A — Fix

**`convex/posIntegrations.ts`**, dans `updateTableFromPOS`, bloc `if (amountCents <= 0) { ... }` (~ligne 112-115) : ajouter au patch existant :
```ts
patch.paidCents = undefined
patch.paidTipCents = undefined
```
Juste à côté de `patch.guests = undefined` et `patch.sittingStartedAt = undefined` déjà présents. Ne rien changer d'autre dans ce fichier.

---

## GOAL B — Validation dev puis déploiement

1. Sur Convex dev, scénario exact du bug : table avec `amountCents = 9000, paidCents = 9000` (sitting 1 soldée). Appeler `updateTableFromPOS` avec `amountCents: 0` (libération POS) → vérifier `paidCents` et `paidTipCents` bien `undefined` après. Puis simuler une nouvelle installation : `amountCents: 5000` (nouvelle addition 50€), créer un paiement de `subtotalCents: 5000` → vérifier qu'il n'est PAS plafonné (doit rester 5000, pas 0 ni une valeur réduite par l'ancien `paidCents`).
2. Append le résultat à `VALIDATION_GUESTS_REEL.md`.
3. Si pass : `npm run build`, commit (`convex/posIntegrations.ts` uniquement), push, **`npx convex deploy --yes`**.
4. Si fail : STOP, documenter, ne pas déployer. Rappel : ne mirror ce commit dans `Splitzy/` que si son `posIntegrations.ts` a la même fonction à corriger.

# Plan — Nombre de convives réel, sans nouvel écran (avant GOALs)

Date : 2026-07-03. Ce fichier est une réflexion d'implémentation, pas un GOAL exécutable — à valider avant de découper en GOALs.

## Rappel du problème

`tables.guests` est aujourd'hui soit inventé (capacité de la table au scan QR — `TableEntry.tsx:132`), soit fixé à 4 par défaut à l'envoi de l'addition (`Tables.tsx:666`). Conséquence : les KPIs par couvert (panier moyen, rotation, Insights service) sont potentiellement faux, silencieusement, sur toute table où personne ne l'a corrigé à la main.

## Solution retenue : dériver le vrai chiffre de ce que l'app sait déjà

Deux signaux existent déjà dans le produit, sans rien ajouter à l'UX :

1. **Partage équitable** (`Items.tsx:371-394`, "Nombre de personnes", stepper 2-12) : `state.equalSplitCount`, envoyé aujourd'hui sur chaque paiement (`Payment.tsx:53`). C'est une déclaration volontaire et fiable — mais **seulement en mode équitable**.
2. **Paiement par article** : pas de compteur déclaré, mais chaque personne qui paie sa part crée son propre paiement avec `firstName`/`avatarIndex`. Le nombre de **payeurs distincts** sur la sitting en cours est donc calculable après coup — c'est exactement ce que fait déjà `Landing.tsx` (`sittingPayers`, lignes 55-65) pour l'écran client.

**Règle** : à chaque paiement confirmé, `table.guests = max(valeur actuelle, signal du paiement)`. On ne fait jamais diminuer, on ne fait jamais deviner — seulement remonter au fil des vraies infos.

## Bug caché trouvé en creusant (à corriger dans le même lot)

`Payment.tsx:53` envoie `guests: state.equalSplitCount ?? 1` **inconditionnellement**, même en mode "par article". Comme `equalSplitCount` vaut 2 par défaut (`SessionContext.tsx:18`) et n'est modifié que par le stepper du mode équitable, un paiement "par article" transporte aujourd'hui une valeur `guests` non pertinente (2, ou un reliquat si l'utilisateur a touché au stepper avant de changer de mode). Il ne faut PAS utiliser ce champ tel quel comme signal en mode item — seulement en mode equal.

## Fichiers concernés et changement exact

1. **`src/pages/Payment.tsx`** (ligne 53) — n'envoyer `guests` que si `state.splitMode === 'equal'` ; sinon `undefined` (le backend calculera via payeurs distincts).
2. **`src/pages/TableEntry.tsx`** (lignes 129-134) — retirer `guests: ctx.table!.capacity ?? 4` de l'appel `updateStatus` au scan. Garder le passage en statut `dining`, ne plus jamais y écrire un `guests` inventé.
3. **`convex/payments.ts`** — `confirmPayment` (ligne ~223) ET `backfillDemoPending` (ligne ~142, même logique de réconciliation à dupliquer) : après le patch argent existant (`reconcileTablePatch`, **intouché**), calculer et patcher `table.guests` séparément :
   - Si `pmt.guests` est défini (mode équitable) → candidat = `pmt.guests`.
   - Sinon → compter les payeurs distincts (`firstName`+`avatarIndex`, ou `customerId` si présent) parmi les paiements `"Encaissé"` de cette table appartenant à la sitting en cours — même technique que `Landing.tsx` (cumuler les paiements les plus récents jusqu'à atteindre `paidCents`, pas de notion de "sitting" explicite en base aujourd'hui).
   - `table.guests = Math.max(table.guests ?? 0, candidat)`.
4. **`src/restaurant/pages/Tables.tsx`** (ligne 666, "Envoyer l'addition") — retirer le `?? 4` : envoyer `sendModal.guests` tel quel (peut être `undefined`, le backend ne le touchera pas si absent — cf. `tables.ts:114` `if (guests !== undefined)`).
5. **Ne pas toucher** : `AddItemModal` (le stepper "Couverts" à l'ouverture d'une table libre reste un signal manuel valable, coexiste bien avec le reste) ; `convex/tables.ts` (déjà compatible, `guests` optionnel) ; tout ce qui touche `paidCents`/`amountCents`/`totalCents`/signature webhook/`requireRestaurantAccess` — strictement hors périmètre.

## Ce qui change de comportement (à assumer consciemment)

Avant le premier paiement confirmé sur une nouvelle sitting, `table.guests` restera `0`/inconnu au lieu d'afficher un chiffre inventé dès le scan. L'UI gère déjà ce cas proprement (`Tables.tsx` affiche "Convives —" quand `guests === 0`, confirmé lors de l'audit du 2026-07-03). Donc pas de régression visuelle attendue, juste un chiffre honnête plus tardif.

## Risques identifiés à vérifier avant d'écrire les GOALs

- **Notion de "sitting" approximative** : le code n'a pas de marqueur explicite de début de sitting en base ; la technique de reconstitution (cumul décroissant jusqu'à `paidCents`) est un existant repris de `Landing.tsx`, pas une nouvelle invention, mais reste une approximation à documenter comme telle.
- **Double lecture nécessaire avant de coder** : vérifier qu'aucun autre endroit du code (Analytics, Insights, exports) ne suppose `table.guests` toujours non-nul pendant le service (avant tout paiement) — l'audit du 2026-07-03 suggère que non, mais à reconfirmer précisément, fichier par fichier, avant d'écrire le code.
- **Périmètre `confirmPayment`** : c'est la fonction qu'on a durcie aujourd'hui pour la sécurité (Vuln 1/H1 : seul point de crédit d'argent). Le nouveau code doit s'ajouter strictement APRÈS le patch argent existant, sans modifier une seule ligne de la logique de crédit/vérification déjà en place.

## Séquence d'exécution proposée

1. **GOAL de reconnaissance (lecture seule)** — confirmer les 2 risques ci-dessus avant de coder : lister tous les lecteurs/écrivains de `tables.guests` dans tout le repo, et vérifier qu'aucun ne suppose une valeur non-nulle en cours de service.
2. **GOAL d'implémentation** — les 4 fichiers listés ci-dessus, périmètre strictement limité au champ `guests`.
3. **Validation** — réutiliser le test de bout en bout déjà préparé (`GOAL_E2E_TEST_FABLE5.md`) en y ajoutant une vérification explicite : le nombre de convives affiché doit correspondre exactement au nombre de payeurs simulés (ou au split déclaré), pas à la capacité de la table.
4. **Déploiement** — build, commit, push (frontend), **`npx convex deploy`** obligatoire puisque `convex/payments.ts` est modifié (leçon du jour : le push seul ne suffit pas pour le backend).

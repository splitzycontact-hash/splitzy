# GOAL — Test de bout en bout (création restaurant → paiements concurrents → cohérence des données)

Repo : `~/Downloads/test/splitzy-client/`
**Cible : PROD (`splitzy.fr`, Convex `mellow-chinchilla-481`)** — c'est le seul environnement où admin+client+dashboard sont réellement branchés ensemble aujourd'hui. Le restaurant de test doit être nommé explicitement `"TEST E2E 2026-07-03"` et **supprimé en toute fin de scénario** (étape 6 obligatoire, jamais sautée même en cas d'échec d'une étape précédente — prévoir un `try/finally` ou équivalent).

Outils existants à réutiliser TELS QUELS, ne rien modifier dedans :
- `convex/seed.ts` → `backfillDemoPending` (confirme les paiements "En attente" sans provider — remplace le webhook PSP absent)
- `convex/restaurants.ts` → `deleteAll` (nettoyage complet, nécessite d'être owner du restaurant créé)
- `e2e/` + `playwright.config.ts` déjà présents dans le repo — s'appuyer dessus pour la partie navigateur.

Livrable : script(s) dans `e2e/` (garder si utile en régression future) + rapport `E2E_TEST_FABLE5_2026-07-03.md` à la racine.

---

## Étape 1 — Créer le restaurant de test (vrai flow, navigateur)
Via Playwright, passer par `RestaurantOnboarding.tsx` (inscription réelle sur splitzy.fr) pour créer un restaurant nommé `"TEST E2E 2026-07-03"`. Noter le `restaurantId` retourné (nécessaire pour toute la suite).

## Étape 2 — Configurer 4 tables
Via Settings > Tables (UI réelle), créer 4 tables. Noter leurs `tableId`/numéros.

## Étape 3 — Paiements simultanés (script, pas UI)
Écrire un script Node (ex. `e2e/scripts/simulate-concurrent-payments.ts`, `ConvexHttpClient` depuis `convex/browser`, pointé sur `VITE_CONVEX_URL` de prod) qui :
- Définit à l'avance une liste fixe de paiements attendus (montants en centimes, table cible, méthode) — **c'est la vérité de référence**, à consigner explicitement dans le rapport final.
- Envoie plusieurs `payments.create` **en vrai parallèle** (`Promise.all`, pas de boucle séquentielle) sur au moins 2 tables différentes, dont une avec 2 paiements concurrents sur la même table (pour tester une vraie course critique sur `paidCents`).
- Calcule et note les totaux attendus : CA total, pourboires totaux, nombre de paiements, répartition par méthode.

## Étape 4 — Confirmation
Appeler `backfillDemoPending` (via `npx convex run seed:backfillDemoPending '{"restaurantId":"<id>"}' --prod`) pour faire passer tous ces paiements à "Encaissé" et créditer les tables.

## Étape 5 — Vérification de cohérence (le cœur du test)
Comparer, chiffre par chiffre, la vérité de référence de l'étape 3 à ce qui est réellement affiché/calculé pour CE restaurant :
- KPIs Overview (`getOverviewStats`) : CA jour, pourboires, nb paiements
- Analytics (graphique CA, répartition moyens de paiement, panier moyen)
- CRM/Clients : si un `firstName`/contact a été fourni, vérifier que la fiche client existe avec les bons montants cumulés
- Insights IA : si `generateInsights` ne tourne pas automatiquement en temps réel, le déclencher manuellement et vérifier qu'il reflète les nouveaux chiffres (pas d'anciennes valeurs en cache)

Tout écart, même de 1 centime, est un échec à consigner avec le détail du calcul attendu vs observé.

## Étape 6 — Nettoyage (OBLIGATOIRE)
Appeler `restaurants.deleteAll` sur le restaurant de test. Vérifier ensuite qu'il n'apparaît plus dans `admin.splitzy.fr`.

## Rapport final
`E2E_TEST_FABLE5_2026-07-03.md` : vérité de référence utilisée, résultat étape par étape, liste des écarts trouvés (fichier/fonction en cause si identifiable), confirmation que le nettoyage a bien eu lieu.

## Vérification finale
```bash
cd ~/Downloads/test/splitzy-client
git status --short
```
Doit montrer le rapport + éventuels scripts `e2e/` neufs. Ne pas commit/push le rapport avant relecture ; les scripts `e2e/` peuvent être commités séparément si jugés utiles à garder.

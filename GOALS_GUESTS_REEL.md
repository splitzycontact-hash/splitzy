# GOALs — Convives réels (dérivés, pas inventés)

Contexte complet : lire `PLAN_GUESTS_REEL.md` d'abord, il explique le pourquoi. Ce fichier contient 4 GOALs à exécuter **dans l'ordre strict**, un par un. Ne jamais sauter à l'implémentation avant que la reconnaissance (GOAL 0) soit validée. Si un GOAL trouve un blocage, **STOP**, écris-le dans un rapport, n'improvise pas de contournement seul.

Règle absolue transversale : ne JAMAIS toucher `paidCents`, `amountCents`, `totalCents`, la vérification de signature webhook (`http.ts`), ou `requireRestaurantAccess`. Seul le champ `guests` est concerné. Tout ajout vient STRICTEMENT après la logique argent existante, jamais avant, jamais à la place.

---

## GOAL 0 — Reconnaissance (lecture seule, zéro fichier code modifié)

1. Grep tout le repo pour chaque lecture/écriture de `guests` sur une table (`tables.guests`, pas `payments.guests`) : `src/`, `convex/`. Liste exhaustive fichier:ligne.
2. Pour chaque lecture trouvée dans `Analytics.tsx`, `Overview.tsx`, `convex/actions/generateInsights.ts`, `SallePage.tsx` : vérifie que le code gère déjà proprement le cas `guests === 0` / `undefined` (empty state, pas de crash, pas de division par zéro). Cite chaque garde trouvée.
3. Relis `Landing.tsx` lignes 55-65 (`sittingPayers`) : confirme précisément l'algorithme de reconstitution de la sitting en cours (cumul décroissant des paiements jusqu'à `paidCents`), pour pouvoir le reproduire côté backend à l'identique dans `convex/payments.ts`.
4. Vérifie s'il existe un marqueur explicite de début de sitting en base (`sittingStartedAt` ou équivalent) — si oui, l'utiliser plutôt que l'approximation par cumul.
5. Écris `RECON_GUESTS_REEL.md` : liste des lecteurs/écrivains, confirmation ou alerte sur chaque risque du plan, verdict final "GO" ou "GO avec ajustements (lesquels)". Aucun fichier de code touché. Ne pas commit.

---

## GOAL 1 — Implémentation

Préalable : lire `RECON_GUESTS_REEL.md`. Si verdict "GO avec ajustements", applique les ajustements signalés avant de coder.

1. **`src/pages/Payment.tsx`** ligne ~53 : `guests: state.equalSplitCount ?? 1` → n'envoyer `guests` que si `state.splitMode === 'equal'`, sinon `undefined`.
2. **`src/pages/TableEntry.tsx`** lignes ~129-134 : retirer `guests: ctx.table!.capacity ?? 4` de l'appel `updateStatus`. Garder `status: 'dining'`.
3. **`convex/payments.ts`** : créer une fonction interne partagée `computeGuestsPatch(ctx, table, pmt)` (évite la duplication) :
   - Si `pmt.guests` défini → candidat = `pmt.guests`.
   - Sinon → compte les payeurs distincts (`firstName`+`avatarIndex`) parmi les paiements "Encaissé" de cette table, reconstitution de sitting identique à `Landing.tsx` (GOAL 0.3).
   - Retourne `Math.max(table.guests ?? 0, candidat)`.
   Appeler cette fonction dans `confirmPayment` (~ligne 223) ET `backfillDemoPending` (~ligne 142), juste après le patch argent existant (`reconcileTablePatch`), jamais avant, jamais en remplacement.
4. **`src/restaurant/pages/Tables.tsx`** ligne ~666 : `guests: sendModal.guests ?? 4` → `guests: sendModal.guests` (undefined si inconnu, le backend ignore déjà ce cas).
5. Ne touche à AUCUN autre fichier.

Vérification : `npm run build` doit passer. **Ne pas commit, ne pas push** — attendre GOAL 2.

---

## GOAL 2 — Validation locale (avant tout déploiement prod)

Utiliser l'environnement DEV (`.env.local`, Convex `scintillating-viper-372`), pas prod — zéro risque de données réelles.

1. Lancer le serveur local (`npm run dev`).
2. Écrire un script de test (`e2e/scripts/verify-guests.ts` ou test Playwright dans `e2e/`) qui, sur un restaurant de dev existant :
   - Scénario A (mode équitable) : simule 3 paiements avec `equalSplitCount = 3` sur une même table → vérifie `table.guests === 3` après confirmation (via `backfillDemoPending` sur dev).
   - Scénario B (mode par article) : simule 2 paiements de 2 payeurs distincts (`firstName` différents, pas de `guests`) → vérifie `table.guests === 2`.
   - Scénario C (régression) : vérifie qu'un `guests` déjà à 3 ne redescend jamais à 2 si un signal plus faible arrive après.
3. Écrire `VALIDATION_GUESTS_REEL.md` : résultat des 3 scénarios, pass/fail précis.

**Si un scénario échoue : STOP, ne pas passer au GOAL 3, documenter précisément l'écart.**

---

## GOAL 3 — Déploiement (uniquement si GOAL 2 = 3/3 pass)

```bash
cd ~/Downloads/test/splitzy-client
git add src/pages/Payment.tsx src/pages/TableEntry.tsx convex/payments.ts src/restaurant/pages/Tables.tsx
git commit -m "feat: convives réels dérivés (split équitable + payeurs distincts), plus jamais inventés"
git push origin main
npx convex deploy --yes
```
Le push seul ne suffit pas pour le backend Convex — `npx convex deploy` est obligatoire ici (leçon du jour, `convex/payments.ts` est modifié). Confirme ensuite que le build Vercel est "Ready" et que le déploiement Convex prod ne montre aucune erreur.

# VALIDATION — Convives réels (GOAL 2)

Date : 2026-07-03. Environnement : **dev Convex uniquement** (`scintillating-viper-372`), restaurant dédié « Resto Owner E2E » (`jd73fccbqc79hpeh4g43nc6pj589dgpm`, slug `resto-owner-e2e`). Zéro contact prod.

## Méthode

Script : `e2e/scripts/verify-guests.ts` (exécution `npx tsx e2e/scripts/verify-guests.ts`).

- Setup gérant (`tables:resetToFree`, `tables:updateStatus` + `amountCents`) via `npx convex run --identity '{"subject":"<clerkUserId owner>"}'` (mock d'identité, possible sur dev seulement).
- Paiements convive via `payments:create` **sans identité** — chemin anonyme réel de prod.
- Confirmation via `internal payments:backfillDemoPending` (même `computeGuestsPatch` que `confirmPayment`, seul chemin déclenchable hors webhook PSP signé).
- Le code testé est le port dans `Splitzy/convex/payments.ts` (source du déploiement dev), **identique ligne à ligne** à `splitzy-client/convex/payments.ts` (diff vérifié sur `computeGuestsPatch` + les 3 points d'appel).

## Résultats : 3/3 scénarios PASS (6/6 assertions)

| Scénario | Setup | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| A — partage équitable | Note 90€, 3 paiements de 30€ avec `guests: 3` | `table.guests === 3` | 3 | **PASS** |
| A — argent intouché | — | `paidCents === 9000` | 9000 | **PASS** |
| B — par article | Note 40€, 2 paiements de 20€, payeurs distincts (Léo/0, Mia/1), **sans** `guests` | `table.guests === 2` | 2 | **PASS** |
| B — argent intouché | — | `paidCents === 4000` | 4000 | **PASS** |
| C — jamais diminué | Gérant ouvre à `guests: 3`, note 40€, puis signal faible (2 payeurs distincts) | `table.guests === 3` (pas de descente à 2) | 3 | **PASS** |
| C — argent intouché | — | `paidCents === 4000` | 4000 | **PASS** |

Sortie backfill : A `{"confirmed":3,"reconciled":3}`, B `{"confirmed":2,"reconciled":2}`, C `{"confirmed":2,"reconciled":2}`. Tables relâchées (`resetToFree`) en fin de script.

## Notes

- **Ajustement A1 confirmé en pratique** : en mode article, `payments.guests` est inséré à 1 (défaut serveur, borné 1-99) — aucune `ArgumentValidationError`, et le candidat `max(pmt.guests, payeursDistincts)` donne bien 2 au scénario B.
- **Dérive découverte au déploiement dev** (hors périmètre guests) : `rateLimits` (table + index `by_key`) existe dans `splitzy-client/convex/schema.ts` mais n'a jamais été mirroré dans `Splitzy/convex/schema.ts` → le deploy dev depuis `Splitzy/` a supprimé l'index `by_key` sur dev. Sans impact ici (`rateLimits` n'est utilisé que par `campaigns.ts` côté client, jamais par `payments`/`tables`), mais **le rate limiting campagnes n'est pas actif sur dev** tant que le mirror n'est pas fait. À traiter séparément.

## Verdict : GO pour GOAL 3 (déploiement)

---

# Validation GOAL_FIX_GUESTS_STALE — reliquat de convives entre deux installations

Date : 2026-07-03. Environnement : **dev Convex uniquement** (`scintillating-viper-372`), restaurant « Resto Owner E2E » (`jd73fccbqc79hpeh4g43nc6pj589dgpm`), table de test n°97. Zéro contact prod.

## Fix testé

- `tables:updateStatus` : transition `free→dining` sans `guests` fourni → `patch.guests = undefined` + `patch.sittingStartedAt = Date.now()` (aligné sur le cas `opening` d'`addOrderItems`).
- `posIntegrations:updateTableFromPOS` : branche `amountCents <= 0` (→ `status: "free"`) → ajoute `guests: undefined, sittingStartedAt: undefined` (symétrique à `resetToFree`). Branche `> 0` inchangée.
- `computeGuestsPatch` (`payments.ts`) : **aucune modification nécessaire** — le filtre `createdAt >= sittingStartedAt` avec fallback heuristique demandé par le GOAL était déjà en place (commit d650233).

⚠ Le GOAL situait `updateTableFromPOS` dans `convex/tables.ts` ; la fonction vit en réalité dans `convex/posIntegrations.ts:92` (les lignes ~92-111 citées correspondent). Fichier committé en conséquence.

## Méthode

Cycle complet via `npx convex run` sur dev (source déployée : `Splitzy/convex/`, mirror ligne à ligne vérifié par diff) :
installation 1 (scan anonyme `free→dining` sans guests → note POS 90€ → 3 payeurs distincts Alice/Bob/Chloe via `payments:create` anonyme + `internal payments:confirmPayment`) → POS libère (`amountCents: 0`) → installation 2 (nouveau scan sans guests → note POS 40€ → 2 payeurs distincts Dan/Eva).

## Résultats : 7/7 assertions PASS

| Étape | Attendu | Obtenu | Verdict |
|---|---|---|---|
| Install 1, après 3 paiements | `guests === 3` | 3 | **PASS** |
| Install 1, scan | `sittingStartedAt` posé | 1783090393542 | **PASS** |
| POS free | `guests` purgé (null) | null | **PASS** |
| POS free | `sittingStartedAt` purgé (null) | null | **PASS** |
| **Nouveau scan (bug prod Table 4)** | `guests` null/0, **PAS 3** | null | **PASS** |
| Nouveau scan | `sittingStartedAt` reposé (nouvelle valeur) | 1783090407233 | **PASS** |
| Install 2, après 2 paiements | `guests === 2`, pas de reliquat | 2 | **PASS** |

## Notes

- **Argent intouché** (règle absolue respectée) : `paidCents` reste à 9000 après la libération POS (ni `updateTableFromPOS` ni le nouveau scan ne le purgent — seul `resetToFree` le fait, comportement préexistant). Conséquence observée : les `payments:create` de l'installation 2 ont un `subtotalCents` plafonné à 0 (`amountCents 4000 − paidCents 9000 < 0`). Le comptage de payeurs distincts n'en dépend pas → `guests === 2` correct. Reliquat argent à traiter séparément si souhaité.
- Dérive `rateLimits` (schema non mirroré dans `Splitzy/convex/schema.ts`) toujours présente — inchangée par cette session, voir note de la validation précédente.

## Verdict : GO pour déploiement prod

---

# Validation GOAL_FIX_PAIDCENTS_STALE — reliquat `paidCents` après libération POS

Date : 2026-07-03. Environnement : **dev Convex uniquement** (`scintillating-viper-372`), restaurant « Resto Owner E2E » (`jd73fccbqc79hpeh4g43nc6pj589dgpm`), table de test n°1. Zéro contact prod. Script : `e2e/scripts/verify-paidcents.ts`.

## Fix testé

`posIntegrations:updateTableFromPOS`, branche `amountCents <= 0` (libération POS) : ajoute `paidCents: undefined, paidTipCents: undefined` au patch existant (`guests`/`sittingStartedAt` déjà purgés). Symétrique à `resetToFree`, qui purge déjà ces mêmes champs. **Aucune logique de crédit touchée** : `confirmPayment` reste l'unique endroit qui augmente `paidCents` (inchangé). Branche `amountCents > 0` inchangée. Aucun autre changement dans le fichier.

## Méthode

Scénario exact du bug documenté (note de la validation précédente : « subtotalCents plafonné à 0 ») :
sitting 1 (note POS 90€ → paiement anonyme 90€ + tip 5€ → confirmation via `internal payments:backfillDemoPending`) → libération POS (`updateTableFromPOS amountCents: 0`) → nouvelle installation (`amountCents: 5000`) → paiement anonyme `subtotalCents: 5000`.

## Résultats : 8/8 assertions PASS

| Étape | Attendu | Obtenu | Verdict |
|---|---|---|---|
| Sitting 1 soldée | `paidCents === 9000` | 9000 | **PASS** |
| Sitting 1 soldée | `paidTipCents === 500` | 500 | **PASS** |
| Libération POS | `status === "free"` | free | **PASS** |
| Libération POS | `paidCents` purgé (undefined) | undefined | **PASS** |
| Libération POS | `paidTipCents` purgé (undefined) | undefined | **PASS** |
| Libération POS | `guests` purgé (comportement existant intact) | undefined | **PASS** |
| Install 2 | paiement sitting 2 inséré | true | **PASS** |
| **Install 2 (bug corrigé)** | `subtotalCents === 5000`, **PAS plafonné à 0** | 5000 | **PASS** |

## Notes

- Le reliquat « argent » documenté dans la validation précédente (paiements de l'installation 2 plafonnés à 0 par l'ancien `paidCents`) est désormais corrigé : le plafond « restant dû » de `payments.create` repart d'un `paidCents` vierge après libération POS.
- Mirror `Splitzy/convex/posIntegrations.ts` : même fonction, même bug → fix appliqué ligne à ligne et déployé sur dev avant validation.

## Verdict : GO pour déploiement prod

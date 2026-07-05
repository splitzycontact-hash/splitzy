# GOAL — Audit de câblage données (hardcode/mock résiduel) avant tests réels

Repo : `~/Downloads/test/splitzy-client/`
Contexte : un audit similaire existe (`AUDIT-mock-data.md`, 2026-06-11, 30 trouvailles) + un addendum ayant corrigé 9 items de plus (#31-39, non présents dans le fichier principal). Le statut des 30 items d'origine n'a jamais été reconfirmé et du code a changé depuis (ex : `Confirmation.tsx` semble déjà réécrit). Avant de commencer des tests de paiement réels où on doit voir les KPIs/Insights IA/CRM bouger, on veut confirmer que toute la chaîne est branchée sur de vraies données, sans reliquat de mock qui fausserait les résultats de test.

**Mode LECTURE SEULE : aucun fichier de code modifié. Uniquement un nouveau rapport.**

## GOAL 1 — Reconfirmer l'audit existant
Pour chaque ligne de `AUDIT-mock-data.md` (#1 à #30), vérifier dans le code ACTUEL si le problème est : Corrigé / Toujours présent / Obsolète (fichier supprimé, route changée). Donner le fichier:ligne actuel pour ce qui reste présent.

## GOAL 2 — Tracer la chaîne bout-en-bout d'un paiement réel
Suivre, étape par étape, ce qui doit se passer quand un convive paie réellement :
1. Flow convive (`src/pages/` : sélection plats, paiement, confirmation)
2. `convex/payments.ts` (`create`, `confirmPayment`) + `convex/tables.ts` (crédit `paidCents`)
3. KPIs gérant (`restaurant/pages/Overview.tsx`, `Analytics.tsx`)
4. Insights IA (`convex/actions/generateInsights.ts`)
5. CRM (`convex/customers.ts`, `restaurant/pages/Clients.tsx`)

Pour chaque étape : les données viennent-elles bien de Convex réel, sans fallback silencieux (`x || valeur_en_dur`) ni mock affiché sans étiquette « démo » ?

## GOAL 3 — Repérer tout nouveau hardcode non listé dans l'audit d'origine

## Rapport
Écrire uniquement dans `AUDIT_WIRING_FABLE5_2026-07-03.md`, 3 sections :
(a) statut des 30 items d'origine (tableau Corrigé/Présent/Obsolète)
(b) nouvelles trouvailles (fichier + ligne + sévérité)
(c) verdict par étape de la chaîne paiement→KPI→Insights→CRM : « prêt pour tester » ou « bloquant, pourquoi »

## Vérification finale
```bash
cd ~/Downloads/test/splitzy-client
git status --short
```
Doit afficher uniquement `AUDIT_WIRING_FABLE5_2026-07-03.md` en untracked. Ne pas commit, ne pas push.

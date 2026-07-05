# GOAL — Audit sécurité complet pré-lancement (lecture seule)

Repo : `~/Downloads/test/splitzy-client/`
Contexte : pas de pentest externe (budget refusé pour l'instant, Strix bloqué). Cet audit sert de compensation partielle avant le lancement public. **Mode LECTURE SEULE : ne modifie, ne crée et ne supprime AUCUN fichier de code. Tu produis uniquement un rapport.**

## Scope prioritaire (surface d'attaque publique + argent réel)
- `convex/payments.ts` + `convex/http.ts` : création paiement, webhook PSP, signature HMAC, `confirmPayment` (seul point de passage à "Encaissé")
- `convex/authz.ts` et tout fichier RBAC (rôles owner/manager/viewer, invitations équipe, `requireRestaurantAccess`)
- `convex/schema.ts` : cohérence des rôles/index, notamment vérifier s'il existe encore une incohérence entre schémas de rôles (ex: gerant/manager/viewer vs owner/manager/staff)
- Toute mutation/query publique appelable sans auth : flux convive anonyme (`/welcome`, `/table/:slug`, `payments.create`, `payments.listByTable`)
- Panel admin : impersonation, bypass admin, accès cross-tenant entre restaurants
- Secrets : clés API POS stockées en clair (risque documenté, vérifier si toujours vrai), variables d'env exposées côté client, webhooks non vérifiés

## Consignes
1. Pour chaque fichier du scope, identifie des vulnérabilités réelles et exploitables — pas de suppositions théoriques génériques. Cherche spécifiquement : contournement d'auth, IDOR, falsification de montant, race conditions sur paiements concurrents, fuite de PII cross-tenant, injection.
2. Priorise par impact sur un lancement public réel : client anonyme malveillant > gérant malveillant > admin interne.
3. Pour chaque trouvaille, donne : fichier + ligne précise, scénario d'exploitation concret (comment un attaquant s'en sert), sévérité (Critique/Haute/Moyenne/Basse), fix recommandé — sans l'appliquer toi-même.
4. Si un risque est déjà documenté comme accepté dans un commentaire `// SECURITY` existant, ne le re-signale que si tu constates que la protection décrite n'est en fait pas correctement appliquée dans le code.
5. Écris uniquement le résultat dans un nouveau fichier `SECURITY_AUDIT_FABLE5_2026-07-03.md` à la racine du repo.

## Vérification finale
```bash
cd ~/Downloads/test/splitzy-client
git status --short
```
Doit afficher uniquement `SECURITY_AUDIT_FABLE5_2026-07-03.md` en untracked, aucun fichier de code modifié. **Ne pas commit, ne pas push** — le rapport doit d'abord être relu.

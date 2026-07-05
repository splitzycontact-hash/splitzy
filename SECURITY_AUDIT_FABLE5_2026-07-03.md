# Audit sécurité pré-lancement — Splitzy (backend Convex)

**Date :** 2026-07-03
**Auditeur :** Claude Fable 5 (revue de code statique, lecture seule)
**Périmètre :** `convex/` (surface publique + argent réel), avec accent sur paiements/webhooks, RBAC, flux convive anonyme, panel admin, secrets.
**Méthode :** revue manuelle de l'intégralité des 40 modules `convex/*.ts` + recoupement des appelants côté `src/`.
**Déploiement concerné :** `splitzy-client/convex/` = **prod `mellow-chinchilla-481`** (toutes les fonctions listées ci-dessous sont donc dans l'API publique prod).

> Rappel Convex : **toute** `query`/`mutation`/`action` exportée est un endpoint HTTP public (`POST /api/query|mutation|action`). Seules les `internalMutation`/`internalQuery`/`internalAction` sont hors d'atteinte d'un client. L'autorisation doit donc être **dans le handler**, jamais côté UI.

---

## Résumé exécutif

Le socle sensible (paiements PSP, impersonation admin, cœur RBAC via `requireRestaurantAccess`) est **solide** : les corrections documentées de l'audit du 2026-06-09 tiennent (paiement jamais « Encaissé » sans webhook signé, token d'impersonation signé HMAC, projections anti-fuite sur le flux convive). 

Cependant, **la couche "admin app" (`convex/lib.ts` + fonctions `authEmail`) contient un défaut d'autorisation structurel** qui rouvre plusieurs bypass, et **le module `transactions.ts` n'a aucun garde d'accès** — ce qui expose les chiffres d'affaires de tous les restaurants à un appelant anonyme.

| # | Sévérité | Fichier | Résumé |
|---|---|---|---|
| 1 | **Haute** | `transactions.ts` | Fuite financière cross-tenant anonyme (aucun garde d'auth) |
| 2 | **Haute** | `config.ts` + `lib.ts` | Élévation de privilège gérant → contrôle des feature flags / config **globale** de la plateforme |
| 3 | **Moyenne** | `communications.ts`, `tickets.ts`, `restaurantNotes.ts` | Même faille de rôle : un gérant agit comme admin cross-tenant |
| 4 | **Moyenne** | `tickets.ts` | `createFromEmail` : mutation 100% publique, injection de tickets/messages non authentifiée |
| 5 | **Basse→Moyenne** | `tables.ts` | Convive anonyme force les transitions de statut de table (marquer « payé » sans payer) + spam de tables |
| 6 | **Basse** | `customers.ts` | Convive anonyme écrase le profil CRM d'un tiers / force le consentement marketing |
| 7 | **Info** | `posIntegrations.ts`, `featureFlags.ts`, schéma | Clés POS en clair au repos (non exposées) ; flags listables ; vocabulaire de rôles éclaté |

---

## 1. [HAUTE] Fuite financière cross-tenant anonyme — `transactions.ts`

**Fichier / lignes :** `convex/transactions.ts:37` (`listByRestaurant`), `:57` (`countRecentByRestaurant`), `:71` (`countRecentByIp`), `:82` (`getOverviewStats`).

**Problème :** ces quatre fonctions sont des `query` **publiques sans aucun appel à `requireRestaurantAccess` ni à `isAdminAccess`**. `listByRestaurant` renvoie les transactions du restaurant demandé et, si la table `transactions` est vide (cas prod actuel — PSP non branché), **retombe sur la table `payments`** et renvoie `amountCents`, `tipCents`, `commissionCents`, `paymentMethod`, `succeededAt` pour chaque paiement.

À comparer : `payments.list` (`payments.ts:19`) et `payments.getOverviewStats` (`payments.ts:260`) sont, eux, protégés par `requireRestaurantAccess`. `transactions.listByRestaurant`/`getOverviewStats` exposent **les mêmes données** sans le garde → contournement direct de cette protection.

**Scénario d'exploitation :**
1. L'attaquant lit un slug public (énumérable, ex. `splitzy.fr/t/le-comptoir/3`).
2. `restaurants.getBySlug` ou `getTableContext` (publics) lui renvoient `restaurant._id`.
3. `POST /api/query { path: "transactions:listByRestaurant", args:[{restaurantId}] }` → **historique complet du CA, pourboires, méthodes de paiement et horodatages** du restaurant, sans authentification.
4. `getOverviewStats` donne le volume/pourboires/nb de transactions **du jour** ; `countRecentByRestaurant` un compteur d'activité. En bouclant sur tous les slugs, l'attaquant reconstruit le CA de toute la base clients.

**Impact :** divulgation non authentifiée de données business sensibles (revenus par établissement) pour **n'importe quel** restaurant. Pas de PII personnelle dans la projection (ni téléphone ni email), mais un chiffre d'affaires par établissement fuité publiquement est critique pour un lancement.

**Fix recommandé :** ajouter `await requireRestaurantAccess(ctx, args.restaurantId)` en tête de `listByRestaurant`, `countRecentByRestaurant`, `getOverviewStats`. Pour `countRecentByIp` (usage anti-fraude interne), la passer en `internalQuery` ou la garder derrière `isAdminAccess`. Aligner sur `payments.list`.

---

## 2. [HAUTE] Élévation de privilège gérant → config **globale** plateforme — `config.ts` + `lib.ts`

**Fichiers / lignes :**
- Racine : `convex/lib.ts:27` — `resolveAdminUser` renvoie **le doc `users` de N'IMPORTE quel utilisateur authentifié, sans vérifier son rôle** (`lib.ts:33` : `if (user) return user;`).
- Exploitation : `convex/config.ts:30` `toggleFlag`, `:53` `createFlag`, `:89` `seedDefaultFlags`, `:155` `saveGlobalConfig` — ces mutations ne vérifient que la **présence** de l'acteur (`if (!actor) throw`, ex. `config.ts:38`), **jamais son rôle**.

**Problème :** un restaurateur qui se connecte au dashboard est un utilisateur Clerk authentifié. Il peut se doter d'un doc `users` (rôle `gerant`) en appelant lui-même la mutation **publique** `users.upsert` (`users.ts:13`) — laquelle exige seulement `clerkUserId === identity.subject` et écrit `role: "gerant"` (`users.ts:51`). Dès lors, `resolveAdminUser` renvoie ce doc, `!actor` est faux, et le gérant franchit le garde des mutations `config.*`.

Contrairement aux **lectures** du même fichier (`listFeatureFlags`, `getGlobalConfig`, `auditLogs`) qui utilisent `isAdminAccess` (lequel vérifie `role ∈ {super_admin, admin_support, viewer}`), les **écritures** utilisent `resolveAdminUser` + test de vérité. C'est l'incohérence exploitable.

**Scénario d'exploitation :**
1. Attaquant crée un compte restaurateur (inscription gérant ouverte sur l'instance prod Clerk) → JWT valide accepté par `mellow-chinchilla-481`.
2. `POST /api/mutation { path: "users:upsert", args:[{clerkUserId:<son subject>, email:<le sien>}] }` → doc `users` rôle `gerant`.
3. `POST /api/mutation { path: "config:saveGlobalConfig", args:[{archiveDelayMin, maxTables}] }` ou `config:toggleFlag`/`createFlag` → écriture sur la table **globale** `featureFlags` (partagée par toute la plateforme), y compris le flag `MAINTENANCE_MODE` décrit comme « bloque tous les clients » (`config.ts:11`). Les entrées `auditLogs` sont écrites à son nom (`actorLabel: actor.email`) → **pollution/usurpation du journal d'audit**.

**Impact :** rupture de contrôle d'accès permettant à l'acteur authentifié le moins privilégié (un gérant, voire un attaquant s'étant simplement inscrit) de modifier la configuration et les feature flags de **toute** la plateforme et de forger des lignes d'audit. Blast radius **runtime** aujourd'hui limité (aucun consommateur des flags trouvé côté `src/` — `MAINTENANCE_MODE` n'est pas encore câblé à une application réelle), mais c'est un bypass admin structurel à corriger **avant** que les flags ne pilotent le comportement client.

**Fix recommandé :**
- Corriger la racine : dans `lib.ts`, `resolveAdminUser` ne devrait renvoyer un acteur **que** si `role ∈ ADMIN_ROLES` (ou fournir un `requireAdminRole(ctx)` dédié).
- Court terme, faire vérifier explicitement le rôle par les 4 mutations `config.*` (comme le font déjà `team.ts`, `bugs.ts` : `!["super_admin","admin_support"].includes(user.role)`).

---

## 3. [MOYENNE] Même faille de rôle → actions admin cross-tenant par un gérant

Même cause racine que #2 (`resolveAdminUser` sans filtre de rôle). Trois autres surfaces l'exploitent :

- **`communications.ts:54` `sendNote`** — garde `if (!actor) throw` (`:64`) uniquement. Un gérant peut insérer des `restaurantNotes` (`[type] sujet\ncontenu`) sur **une liste arbitraire de `restaurantIds`** et écrire une ligne d'audit `communication.sent`. → injection de notes internes/spam admin sur n'importe quel établissement.
- **`tickets.ts:42` `reply`** — garde `if (!user) throw` (`:51`) uniquement. Un gérant peut poster un `ticketMessages` avec `isAdminReply: true` sur **n'importe quel ticket** (y compris ceux d'autres restaurants). → usurpation de réponse « support Splitzy » cross-tenant.
- **`restaurantNotes.ts:5` `requireEditor`** — n'exclut que `role === "viewer"` (`:7`). Comme un gérant a le rôle `gerant` (≠ `viewer`), il **passe** : `create` (`:22`) et `remove` (`:34`) lui permettent d'écrire/supprimer des notes internes sur tout restaurant.

**Impact :** un gérant authentifié agit avec des privilèges admin, en écriture, hors de son propre tenant. Pas de vol d'argent, mais violation d'isolation + pollution des outils internes/audit.

**Fix recommandé :** router **toutes** les écritures « admin app » via un unique helper `requireAdminRole(ctx)` exigeant `role ∈ {super_admin, admin_support}` (les endpoints réservés `super_admin` gardant leur test spécifique). Ne jamais autoriser sur la seule vérité de `resolveAdminUser`.

---

## 4. [MOYENNE] `tickets.createFromEmail` — mutation 100% publique non authentifiée

**Fichier / lignes :** `convex/tickets.ts:19-40`.

**Problème :** aucune vérification (`ni identity, ni secret, ni signature`). N'importe qui peut appeler `POST /api/mutation { path: "tickets:createFromEmail", args:[{subject, body, fromEmail, restaurantId}] }` et insérer un `tickets` (`status:"new"`) + un `ticketMessages`. C'est manifestement destiné à un futur webhook Mailgun inbound (`/mailgun-inbound`, cf. CLAUDE.md « à ajouter »), mais tel quel c'est un endpoint ouvert.

**Scénario d'exploitation :** flood de tickets (remplissage de la file support / bruit / éventuel coût), `fromEmail` et `restaurantId` arbitraires (attribution mensongère), contenu stocké affiché ensuite dans l'UI admin (`body` inséré tel quel — vecteur de contenu piégé selon le rendu admin).

**Impact :** spam/DoS applicatif de la file support + injection de contenu attribué à un restaurant tiers. Pas d'argent.

**Fix recommandé :** convertir en `httpAction` derrière vérification de signature Mailgun (comme les webhooks PSP de `http.ts`), ou en `internalMutation` appelée par cette httpAction. Borner/échapper `subject`/`body`.

---

## 5. [BASSE→MOYENNE] Convive anonyme : forçage du statut de table + création de tables — `tables.ts`

**Fichiers / lignes :** `convex/tables.ts:65` `updateStatus` (branche convive `:102-111`) ; `convex/tables.ts:433` `ensureForRestaurant` (aucune auth).

**Problème :**
- `updateStatus` autorise un appelant **non authentifié** à faire progresser une table le long du flux `free→dining→payment→paid` (`ALLOWED`, `:103`). Rien n'impose que la table soit *sa* table (le flux convive n'a pas de secret par QR — résidu documenté). Un anonyme connaissant `slug`+numéro peut donc **marquer une table `paid` sans paiement** (`payment→paid`) ou perturber la vue temps réel de la salle (`free→dining` sur des tables vides). Les montants restent protégés (`amountCents` réservé au staff, `paidCents` crédité uniquement par `confirmPayment`), donc pas de vol direct — mais un `status:"paid"` sans encaissement peut tromper le personnel.
- `ensureForRestaurant` insère une table dans **n'importe quel** `restaurantId` sans auth (création paresseuse au scan). Un anonyme peut créer en masse des tables fantômes.

**Impact :** griefing/désynchro de la salle live et incohérence table↔paiement ; pollution de données. Faible valeur pour l'attaquant, mais nuisance réelle en exploitation.

**Fix recommandé :** ceci est la conséquence directe du **résidu documenté** « flux convive 100% public, pas de `qrToken` ». Vrai correctif = porter un secret par QR (token de table) ou une auth convive légère, et exiger ce secret dans `updateStatus`/`ensureForRestaurant`. À défaut, borner `ensureForRestaurant` (ex. n'auto-créer que si le numéro ≤ nombre de tables déclarées) et journaliser les transitions `→paid` d'origine convive pour réconciliation.

---

## 6. [BASSE] Convive anonyme : écrasement de profil CRM / forçage de consentement — `customers.ts`

**Fichier / lignes :** `convex/customers.ts:92` `saveContact` (dédup `:134-143`) ; `:19` `unsubscribe`.

**Problème :** `saveContact` est publique (flux convive, par design). La déduplication cherche une row existante par `(restaurantId, phone)` puis `(restaurantId, email)` et **patch** cette row (`:174`). Un attaquant qui connaît le téléphone ou l'email d'un client d'un restaurant peut donc écraser `firstName`/`avatarIndex` et, surtout, **remettre `marketingConsent: true`** (`:153`) sur le profil d'un tiers → forgeage de consentement marketing (enjeu RGPD) ou ré-abonnement d'un désabonné. Le cross-tenant est correctement bloqué (`:118-129` vérifient `customerId`/`paymentId` ⊂ restaurant), et aucune donnée n'est **relue** en retour (pas de fuite de lecture). `unsubscribe` ne prend qu'un `customerId` sans auth (lien email, acceptable) — impact minimal (met `marketingConsent:false`).

**Impact :** intégrité/consentement CRM d'un client identifié par un attaquant connaissant son contact. Faible (nécessite de connaître le contact ; pas de lecture).

**Fix recommandé :** ne pas laisser un appel convive **relever** `marketingConsent` de `false→true` sur une row préexistante (n'autoriser le passage à `true` que lors de la création, ou exiger le `customerId` de session). Journaliser les changements de consentement avec source.

---

## 7. [INFO] Points à connaître (pas des défauts exploitables en l'état)

- **Clés API POS en clair au repos** — `posIntegrations.ts:32/58` stocke `apiKey`/`extraKey` en clair dans la table `posIntegrations`. **Bonne nouvelle :** aucune query publique ne les renvoie (`listByRestaurant`/`getByProvider` redactent → `hasApiKey` seulement, `:14`/`:27`) ; seules des `internalQuery`/actions serveur les lisent. Le risque est donc **au repos** (dump DB / accès Convex privilégié), conforme au « risque documenté ». Recommandation : chiffrer au repos (KMS) ou déléguer à OAuth quand le PSP le permet. **Toujours vrai**, mais pas de vecteur client.
- **`featureFlags.list` (`featureFlags.ts:4`) et `evaluate` (`:10`) publiques** — `list` renvoie tous les flags (clés + statuts) à un anonyme. Divulgation mineure ; `update` (`:33`) est, lui, correctement gardé (`super_admin`/`admin_support`). Passer `list` derrière `isAdminAccess`.
- **`menuItems.listByRestaurant` (`menuItems.ts:6`) publique sans auth** — attendu (le menu est public pour le convive). Pas de données sensibles. OK.
- **Vocabulaire de rôles éclaté** (question explicite du goal) : `members.role` = `owner|manager|staff` (`schema.ts:78`), `restaurantInvitations.role` = `gerant|manager|viewer` (`:97`), `users.role` = `super_admin|admin_support|viewer|gerant` (`:396`). Les traductions sont **gérées** (`invitations.inviteRoleToMemberRole`, `RestaurantGuard.memberRoleToAppRole`) → pas d'incohérence fonctionnelle directe. **Mais** ce chevauchement (`viewer`/`gerant` présents dans plusieurs vocabulaires) est précisément ce qui rend les gardes #2/#3 dangereux : `role !== "viewer"` ou `if (user)` traitent un `gerant` comme privilégié. Recommandation transverse : un helper d'autorisation admin unique et un jeu de rôles admin distinct, non confondable avec les rôles restaurant.
- **`members.inviteMember` (`members.ts:16`)** autorise un `manager` à insérer une ligne `members` de rôle `owner` (contrairement à `invitations.create` qui réserve l'invitation « gerant » à l'owner). La ligne créée est `status:"pending"` **sans `clerkUserId`** → inerte (n'octroie aucun accès tant qu'aucun flux ne pose son `clerkUserId`, et `invitations.accept` réécrirait le rôle depuis le rôle d'invitation). Non exploitable pour une escalade en l'état, mais incohérence à aligner.

---

## Ce qui est correct (vérifié)

- **Paiements PSP** : `payments.create` (`payments.ts:60`) ne crée que « En attente », recalcule `totalCents` serveur, plafonne le sous-total au restant dû, refuse les montants négatifs et vérifie `table.restaurantId === args.restaurantId`. `confirmPayment` (`:223`) est bien `internalMutation`, idempotent, avec contrôle `amountCents === totalCents`. Seul `http.ts` (webhooks signés HMAC, fail-closed 401) y accède. Le `provider`/`providerRef` fourni par le client ne constitue pas un vecteur de forge (la confirmation exige un webhook signé + montant concordant).
- **Webhooks `http.ts`** : vérification HMAC-SHA256 en temps constant (`timingSafeEqual`), fail-closed si secret absent, avant tout traitement. Endpoints publics extra/manager en confirmation 2 temps (anti-préfetch SafeLinks), tokens `randomUUID` non devinables, HTML échappé.
- **Impersonation admin** (`admin.ts:57`/`:111`) : token signé HMAC-SHA256, `IMPERSONATION_JWT_SECRET` fail-closed (≥32 chars), signature vérifiée **avant** de faire confiance au payload, exp contrôlée, `logImpersonation` en `internalMutation`. Rôle acteur vérifié (`super_admin`/`admin_support`).
- **`lib.isAdminAccess`** (`lib.ts:15`) et `resolveAdminUser` **ignorent** bien l'`authEmail` client (param neutralisé) — l'ancienne faille C1 (email en preuve d'auth) ne réapparaît pas. Le défaut #2/#3 est *ailleurs* : l'absence de filtre de **rôle** dans `resolveAdminUser` et chez ses appelants.
- **Cœur RBAC** `requireRestaurantAccess` (`authz.ts:10`) : identité Clerk réelle + propriété (`restaurant.clerkUserId`) ou ligne `members` active avec rôle autorisé. Correctement appliqué dans `payments`, `feedbacks`, `menuItems`, `tables` (hors #5), `zones`, `shifts`, `planning`, `extras`, `closures`, `insights`, `analytics`, `members` (dont `updateMemberRole`/`removeMember` : anti self-escalade, `owner` requis).
- **Projections anti-fuite convive** : `getTableContext`/`getBySlug` strippent `clerkUserId`/`kycStatus`/`siret`/`stripeAccountId`/`posProvider` ; `payments.listByTable` strippe PII + détails PSP ; `tables.getOne` ne projette que les champs du flux convive.
- **Isolation cross-tenant** confirmée sur les chemins gérant : `campaigns.sendCampaign` et `posIntegrations.syncTables` (actions) revérifient la propriété via `restaurants.getByClerkId` ; `customers.getManyForCampaign` refiltre par `restaurantId` ; `messages.*` vérifie la participation aux threads 1:1.
- **`seed.ts`** : les 6 fonctions sont bien des `internalMutation` (injection/suppression de données non atteignable depuis un client public).

---

## Recommandations priorisées (avant lancement public)

1. **Ajouter `requireRestaurantAccess` à `transactions.listByRestaurant`/`getOverviewStats`/`countRecentByRestaurant`** et interniser `countRecentByIp` (**#1, Haute**).
2. **Corriger `resolveAdminUser`** pour n'accorder qu'aux rôles admin, et/ou faire vérifier le rôle explicitement par `config.*`, `communications.sendNote`, `tickets.reply`, `restaurantNotes.requireEditor` (**#2/#3, Haute/Moyenne**).
3. **Authentifier `tickets.createFromEmail`** (signature webhook / internalMutation) (**#4, Moyenne**).
4. Traiter le résidu du flux convive anonyme (`tables.updateStatus`/`ensureForRestaurant`) via un secret par QR (**#5**).
5. Durcir `customers.saveContact` (ne pas relever `marketingConsent` sur row existante) (**#6**).
6. Chiffrer les clés POS au repos ; passer `featureFlags.list` derrière l'auth admin (**#7**).

---

*Audit statique, sans exécution ni test dynamique. Les sévérités « exploitable » supposent l'instance prod Clerk ouverte à l'inscription gérant (à confirmer côté configuration Clerk pour #2/#3). Aucun fichier de code n'a été modifié.*

# Audit de câblage données — reconfirmation avant tests réels

Date : 2026-07-03 · Auditeur : Claude (Fable 5) · Mode : lecture seule (aucun fichier de code modifié)
Référence : `AUDIT-mock-data.md` (2026-06-11, items #1–#30). Les lignes citées sont celles du code au 2026-07-03.

Légende : ✅ Corrigé · ❌ Toujours présent · ⚫ Obsolète (fichier supprimé) · 🟡 Partiellement corrigé / réserve

---

## (a) Statut des 30 items d'origine

| # | Item (résumé) | Statut | Constat actuel (fichier:ligne) |
|---|---|---|---|
| 1 | PrintReport 100 % mock (`mockData`) | ✅ Corrigé | `PrintReport.tsx` réécrit : 100 % Convex (`payments.list` + `tables.list` + `feedbacks.list` filtrés par plage, lignes 62-64), état « Chargement… » ligne 75, empty states explicites |
| 2 | Overview `feedbacks… \|\| 12` | ✅ Corrigé | `Overview.tsx:414` — `negCount = feedbacks.filter(f => f.stars <= 3).length`, sans fallback |
| 3 | Overview `\|\| 4` (5★) | ✅ Corrigé | `Overview.tsx:415` — `topCount` réel, sans fallback |
| 4 | Score réputation 87/100 + barres hardcodées | ✅ Corrigé | `Overview.tsx:417-419` — `repScore = avg × 20`, `notePct`, `interceptPct` dérivés des feedbacks ; `—` si aucun (`Overview.tsx:578`) |
| 5 | Croissance fabriquée `caTotal/0.88` | ✅ Corrigé | `Overview.tsx:405-411` — vrai delta vs CA d'hier ; `null` → « Pas de CA hier pour comparer » (`:499`) |
| 6 | `DEMO_ACTIVITIES` (fausse activité) | ✅ Corrigé | Constante supprimée ; 0 paiement → message vide honnête `Overview.tsx:839-841` |
| 7 | `DEMO_ORDER` tables 3/4 | ✅ Corrigé | Constante supprimée de `Tables.tsx` |
| 8 | `PAID_ORDER` + faux feedback 5★ | ✅ Corrigé | Constante supprimée |
| 9 | `FREE_SINCE` (« Libre depuis 1h08 ») | ✅ Corrigé | Constante supprimée |
| 10 | Fallbacks `63 €` / `12,60 €` | ✅ Corrigé | Montants = `table.amountCents ?? 0` (`Tables.tsx:120-121`), plus aucun montant inventé |
| 11 | `guests ?? 4` (affichage) | ✅ Corrigé | `Tables.tsx:124` — `guests ?? 0` + commentaire « ne jamais inventer un nombre de convives » ; affiche « Convives — » si 0 (`:213`). ⚠ Résiduel apparenté en écriture : voir nouvelle trouvaille N5 |
| 12 | Stats strip `48 min` / `24 €` inventés | ✅ Corrigé | `Tables.tsx:398-402` — `avgDur = null` si pas de données → « — » |
| 13 | `DEMO_ROWS` Factures (flash au chargement) | ✅ Corrigé | `Factures.tsx:592-593` — « Données réelles uniquement — pas de lignes démo » ; chargement → skeleton (`isLoadingPayments`) |
| 14 | Réf `SPZ-` fabriquée sur index de boucle | ✅ Corrigé | `Factures.tsx:600` — `SPZ-${p._id.slice(-8).toUpperCase()}` : stable, dérivée de l'id Convex réel |
| 15 | `MOCK_SPLITZY_INVOICES` (fausses factures commission) | ✅ Corrigé | `Factures.tsx:38` — `SPLITZY_INVOICES: SplitzyInvoice[] = []` + commentaire « ne jamais remettre de fausses factures » ; onglet affiche 0 facture |
| 16 | `MOCK_INVOICES` abonnement (Settings) | ✅ Corrigé | `Settings.tsx:1372` — `SUBSCRIPTION_INVOICES = []` ; empty state « Aucune facture pour le moment » (`:1704`) |
| 17 | Carte ROI : date activation + gains fabriqués sans mention | 🟡 Partiellement corrigé | `Analytics.tsx:528-543` — date d'activation désormais réelle (`firstPaymentAt` = 1ᵉʳ paiement encaissé), badge « Estimation » affiché 2× (`:1239`, `:1250`). MAIS les formules restent heuristiques et hardcodées : abonnement `99 €/mois` (`:534`), baseline pourboires `6,2 %` (`:538`), `+10 %` rotation (`:539`), `30 €/avis` (`:541`). Acceptable pour tester (étiqueté estimation), à ne pas confondre avec un vrai chiffre |
| 18 | MenuPage KPI « disponibles » = total démo | ✅ Corrigé | `MenuPage.tsx:881` — `hasLive ? okCount : demoTotal`, avec sub « données démo » quand mode démo |
| 19 | Reçu Confirmation résolu contre menu statique | ✅ Corrigé | `Confirmation.tsx:44-47` — articles depuis `state.selectedItems` (nom + prix réels), plus d'import `MENU_ITEMS` |
| 20 | `INITIAL_VOTES` intégrations (142/98/76) | ❌ Toujours présent | `Integrations.tsx:11` + affichage `:369`. Compteurs inventés, vote non persisté (seul le flag « a voté » va en localStorage). Cosmétique, page owner-only |
| 21 | Plan/tarifs hardcodés (Sidebar + Settings) | 🟡 Partiellement corrigé | Le badge lit maintenant `restaurant.plan` réel (`Sidebar.tsx:258`), mais libellés/prix restent statiques (59 €/99 €, `Sidebar.tsx:279-284`). Aggravation : deux grilles tarifaires contradictoires dans Settings — voir nouvelle trouvaille N3 |
| 22 | Panneau réputation fixe (doublon #4) | ✅ Corrigé | Couvert par #4 ; « Réputation rapide » = `avgRating`/`negCount`/`topCount` réels ; « Note Google : — · non connecté » honnête (`Overview.tsx:732-738`) |
| 23 | `DEMO_ITEMS` MenuPage étiquetés | ✅ Conforme (inchangé, intentionnel) | Bannière « Mode démo » toujours là (`MenuPage.tsx:903`). Même convention reprise par `DEMO_MENU` dans `Tables.tsx:64` (modal ajout article, bannière `:857`) |
| 24 | `MOCK_CARDS` carrousel Payment | ✅ Conforme (intentionnel, tant que pas de PSP) | `Payment.tsx:9,20,155` — toujours le carrousel Visa/Mastercard factice. Voir verdict chaîne : c'est le symptôme du bloquant PSP |
| 25 | `MOCK_SESSION` nettoyé | ✅ Conforme | `src/data/session.ts` — valeurs vides/0, inchangé |
| 26 | `Feedbacks.tsx` code mort | ⚫ Obsolète — supprimé | Fichier absent de `src/restaurant/pages/` |
| 27 | `restaurant/data/mockData.ts` | ⚫ Obsolète — supprimé | Répertoire `src/restaurant/data/` n'existe plus ; plus aucun import `mockData` dans `src/` |
| 28 | `Recap.tsx` / `Table.tsx` | ⚫ Obsolète — supprimés | Fichiers absents |
| 29 | `MenuModal.tsx` | ⚫ Obsolète — supprimé | Fichier absent |
| 30 | `src/data/menu.ts` | ⚫ Obsolète — supprimé | Fichier absent ; plus aucun import `data/menu` / `MENU_ITEMS` |

**Bilan** : 19 corrigés, 5 obsolètes (fichiers supprimés), 3 conformes/intentionnels, 2 partiels (#17, #21), 1 toujours présent (#20).

---

## (b) Nouvelles trouvailles (non listées dans l'audit d'origine)

| # | Fichier:ligne | Sévérité | Problème |
|---|---|---|---|
| N1 | `src/restaurant/pages/Analytics.tsx:1170` | 🔴 | Badge **« +2,3 pts »** hardcodé dans le header du panneau Pourboires — affiché dès que `tipsTotal > 0`, jamais calculé. Faux chiffre à côté de vrais chiffres, sans étiquette |
| N2 | `src/restaurant/pages/Factures.tsx:599` | 🟠 | `method: 'card' as PayMethod` — **toutes** les transactions affichées « carte » quel que soit le `paymentMethod` réel (renvoyé par `payments.list` mais ignoré). Apple Pay / Google Pay / espèces faussés + filtre « moyen de paiement » de la page inopérant. La page Analytics, elle, utilise bien le vrai `paymentMethod` (donut) — incohérence entre pages |
| N3 | `src/restaurant/pages/Settings.tsx:1333-1367` vs `:3698-3700` | 🟠 | **Deux grilles tarifaires contradictoires** dans le même fichier : modale BillingSection = Starter 0 € / Pro **29 €**/mois / Entreprise sur devis ; section « Plan & abonnement » = Gratuit / Essentiel 59 € / Pro **99 €**/mois. La Sidebar (`Sidebar.tsx:279-284`) suit la seconde. Un gérant peut voir deux prix différents pour « Pro » |
| N4 | `src/restaurant/pages/Integrations.tsx:11,369` | 🟠 | = item #20 reconfirmé (INITIAL_VOTES inventés) |
| N5 | `src/restaurant/pages/Tables.tsx:666` | 🟠 | Modal « Passer en paiement » : `guests: sendModal.guests ?? 4` — **écrit 4 en base** quand le nombre de convives est inconnu. Fausse ensuite « x/4 convives ont payé », €/couvert et les couverts des Insights |
| N6 | `src/pages/TableEntry.tsx:132` + `src/pages/Payment.tsx:53` | 🟠 | Conventions « guests » : au scan QR, `tables.guests = capacity ?? 4` (capacité, pas le nombre réel de convives) ; à la création du paiement, `payments.guests = equalSplitCount ?? 1` (nombre de parts, pas de personnes). Pas un mock, mais les KPIs « couverts »/« rotation » (Insight service, Analytics) mesurent en réalité capacité et parts — à savoir en interprétant les tests |
| N7 | `src/pages/Payment.tsx:293` | 🟠 | Mention « Paiement sécurisé · **Stripe** · 3D Secure » alors qu'aucun PSP n'est branché (Stripe abandonné, cf. `convex/payments.ts:92` « Pas de commission pour l'instant (Stripe abandonné) »). Allégation visible convive |
| N8 | `src/restaurant/pages/Analytics.tsx:51,1154` | 🟢 | Fenêtre de service hardcodée : heatmap limitée à 11h→22h (`HEAT_HOURS`) et label « Service : 11h — 23h ». Les paiements hors fenêtre existent dans les KPIs mais sont invisibles dans la heatmap |
| N9 | `src/restaurant/pages/Overview.tsx:505-513` + `Analytics.tsx:822-830` | 🟢 | Sparklines SVG **décoratives** à chemins hardcodés (fausses mini-courbes de tendance) posées à côté de vrais chiffres (carte « CA du jour », cartes Occupation/Rotation). Purement cosmétique mais suggère une tendance qui n'existe pas |
| N10 | `src/pages/Confirmation.tsx:189-197` | 🟢 | Bouton « Par e-mail » sans `onClick` — bouton mort visible convive |
| N11 | `src/restaurant/pages/Analytics.tsx:525,1165,1188` | 🟢 | Baseline secteur pourboires 6,2 % hardcodée, mais étiquetée « vs. moyenne du secteur (6,2 %) » / « vs. avant Splitzy » — heuristique assumée, OK tant qu'étiquetée |
| N12 | `src/restaurant/pages/Overview.tsx:796-800` | 🟢 | Label « Transformés en 5★ Google » = en réalité le compte de feedbacks 5★ **Splitzy** (aucune intégration Google). Le chiffre est réel, le label survend |

---

## (c) Verdict par étape — chaîne paiement → KPIs → Insights → CRM

### 1. Flow convive (`src/pages/`) — ✅ prêt pour tester
Sélection plats → tip → paiement : montants dérivés de `useSessionCalcs` sur la table Convex live (fallback documenté sur `cachedOrderItems`/`cachedPaidCents` du scan QR — cache de résilience iOS, pas un mock). `Payment.tsx` envoie `payments:create` en HTTP direct (`keepalive`). Le reçu Confirmation affiche les vrais articles du state (#19 corrigé). Réserves cosmétiques : cartes factices (#24, assumé), mention « Stripe » (N7), bouton e-mail mort (N10).

### 2. `convex/payments.ts` + crédit table — ⛔ **BLOQUANT pour « voir les KPIs bouger »**
Le backend est correctement câblé **et c'est précisément pour ça que rien ne bougera** :
- `payments.create` (`payments.ts:60-134`) : insert **« En attente »** uniquement, montants bornés serveur (plafonnés au restant dû), table passée en `payment` **sans créditer `paidCents`**.
- Le seul passage à **« Encaissé »** + crédit `paidCents`/`paidTipCents` (via `reconcileTablePatch`) est `confirmPayment` (`payments.ts:223-248`), `internalMutation` appelée exclusivement par les webhooks PSP signés de `http.ts` (fail-closed 401 si secret absent).
- Or : (a) `Payment.tsx` ne crée **aucune charge PSP** — aucun `provider`/`providerRef` PSP réel n'est transmis, donc aucun webhook ne matchera jamais la ref générée serveur ; (b) les `WEBHOOK_SECRET_*` sont des placeholders (cf. CLAUDE.md) ; (c) le dashboard ne permet que « Remboursé » (`Factures.tsx:248`), pas « Encaissé ».
- **Conséquence** : un paiement de test via le flow convive restera « En attente » pour toujours. CA du jour, pourboires, Analytics, Insights financiers/service, CRM (visites/total client) — tous filtrent `status === 'Encaissé'` → **zéro mouvement**.
- **Chemins de déblocage pour les tests** : soit brancher un vrai PSP (création de charge côté client + `providerRef` + vraie clé de signature webhook), soit après chaque salve de test exécuter en CLI :
  `npx convex run payments:backfillDemoPending '{"restaurantId": "..."}'` (internalMutation, `payments.ts:142-168` — confirme les « En attente » sans provider et réconcilie les tables). Le seul flux visible sans confirmation : la table passe en statut `payment` (visible sur Tables live) et la transaction apparaît « En attente » dans Factures.

### 3. KPIs gérant (`Overview.tsx`, `Analytics.tsx`) — ✅ prêt pour tester (une fois l'étape 2 débloquée)
- Overview : KPIs héros = `getOverviewStats` (100 % payments Encaissé), croissance vs hier réelle, score/réputation réels, activité récente = payments réels, alertes temps réel dérivées. Aucun fallback chiffré restant.
- Analytics : graphe CA, heatmap (paiements réels des 28 derniers jours), donut moyens de paiement, top tables, deltas vs période précédente — tout payments réels avec états vides honnêtes (`—`).
- Réserves : badge « +2,3 pts » hardcodé (N1 — à ignorer ou corriger avant les tests), carte ROI = estimation étiquetée (#17), sparklines décoratives (N9).

### 4. Insights IA (`convex/actions/generateInsights.ts`) — ✅ prêt pour tester (mêmes conditions)
Rule-based (pas de LLM), 100 % données réelles via `internal.*.listAll`, chaque insight a son cas « pas de données » explicite. Financier/service = fenêtre 7 jours filtrée « Encaissé » → dépend du déblocage étape 2. **Attention timing** : les insights sont matérialisés (table `insights`), régénérés par cron quotidien (3h UTC) ou bouton manuel (`Reputation.tsx:92`, action `generateInsightsForRestaurant`). Après confirmation des paiements de test, cliquer « régénérer » pour voir bouger — ce n'est pas temps réel.

### 5. CRM (`convex/customers.ts`, `Clients.tsx`) — ✅ prêt pour tester (mêmes conditions)
- `saveContact` : upsert dédupliqué (phone/email/customerId), garde cross-tenant, `consentAt` posé serveur, backfill du contact sur le paiement (`lastPaymentId`). Câblé depuis Confirmation (opt-in jamais pré-coché).
- `Clients.tsx:570-572` : 100 % `payments.list` (filtré Encaissé) + `feedbacks.list` + `customers.getByRestaurant`, agrégation réelle. Plus d'identités fixes.
- Donc : la fiche client (visites, total dépensé, statut vip/régulier) ne bouge **qu'après** confirmation des paiements (étape 2) ; l'enregistrement du contact, lui, bouge immédiatement.

### Verdict global
**Chaîne branchée sur Convex réel de bout en bout, sans fallback chiffré silencieux visible** (hors N1 et les items étiquetés). **Un seul bloquant structurel** : aucun chemin de production ne fait passer un paiement du flow convive à « Encaissé » (PSP non branché, secrets webhook placeholders). Prévoir dans le protocole de test soit le branchement PSP réel, soit l'étape CLI `backfillDemoPending` entre « payer » et « vérifier les KPIs ». Corriger N1 (+2,3 pts) et idéalement N2 (méthode de paiement Factures) avant les tests pour ne pas polluer la lecture des résultats.

---

## Vérification finale

`git status --short` au moment de l'audit : le rapport `AUDIT_WIRING_FABLE5_2026-07-03.md` est le **seul fichier créé par cet audit**. Le working tree contenait déjà, avant l'audit, des modifications non commitées (marketing : `index.html`, `src/index.css`, `src/pages/marketing/*`, `LogoMarquee.tsx`) et d'autres fichiers `GOAL_*.md` / `SECURITY_AUDIT_*.md` untracked — non touchés. Aucun commit, aucun push.

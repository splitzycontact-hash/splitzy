# Audit données hardcodées / mock / fallbacks — splitzy-client

Date : 2026-06-11. Périmètre : `src/restaurant/` (dashboard gérant) + `src/` (flow convive).
Légende risque : 🔴 = faux chiffre affiché à un utilisateur réel en prod · 🟠 = trompeur mais contexte atténuant · 🟢 = étiqueté/intentionnel · ⚪ = code mort.

## 🔴 Critique — faux chiffres visibles en prod

| # | Fichier:ligne | Extrait | Problème |
|---|---|---|---|
| 1 | `restaurant/components/PrintReport.tsx:4-6,41-44,101,118-119` | `import { TABLES, FEEDBACKS, INVOICE_ROWS, WEEKLY_REVENUE_DAYS, WEEKLY_SUMMARY, RESTAURANT_INFO } from '../data/mockData'` | Le rapport imprimable (« Imprimer rapport », bouton présent sur TOUTES les pages via PageHeader) est 100 % mock : « Le Comptoir Parisien », CA 8 947 €, 14 tables, KPI `value="8 / 14"` en dur. Un vrai gérant imprime un rapport entièrement inventé. |
| 2 | `restaurant/pages/Overview.tsx:655` | `{feedbacks.filter(f => f.stars <= 3).length \|\| 12}` | 0 feedback intercepté → affiche **12**. |
| 3 | `restaurant/pages/Overview.tsx:667` | `{feedbacks.filter(f => f.stars >= 5).length \|\| 4}` | 0 feedback 5★ → affiche **4**. |
| 4 | `restaurant/pages/Overview.tsx:460-470` | `87` `/ 100` + `{ label: 'Note', pct: 84 }, { Google: 78 }, { Intercep.: 92 }` | Score réputation 87/100 et 3 barres entièrement hardcodés, jamais reliés aux feedbacks réels. |
| 5 | `restaurant/pages/Overview.tsx:383` | `+{Math.round((caTotal / Math.max(caTotal * 0.88, 1) - 1) * 100)}%` + « vs hier » | Croissance fabriquée : la formule renvoie ~+14 % quel que soit le CA (caTotal/0.88). Aucune comparaison réelle avec hier. |
| 6 | `restaurant/pages/Overview.tsx:158-165,694-696` | `DEMO_ACTIVITIES` (T2 52,80 €, T1 22 € sur 46 €, feedback 2★…) | Quand 0 paiement réel : « Activité récente » affiche 6 opérations inventées, sans mention démo. |
| 7 | `restaurant/pages/Tables.tsx:29-33` | `DEMO_ORDER` (tables 3 & 4 : « 3 entrées 21 € », « proposer dessert ? ») | Une vraie table n°3/4 en repas sans orderItems affiche des lignes de commande inventées. |
| 8 | `restaurant/pages/Tables.tsx:33` | `PAID_ORDER` (« Plats 54 € », « Feedback laissé · 5 ★ · "parfait" ») | Toute table réglée affiche ce détail inventé + un faux feedback 5★. |
| 9 | `restaurant/pages/Tables.tsx:34,268` | `FREE_SINCE = {5:'1h08', 6:'2h14', …}` | « Libre depuis 1h08 » inventé pour les tables 5-10. |
| 10 | `restaurant/pages/Tables.tsx:218,222` | `: '63 €'` et `: '12,60 €'` / couvert | Table en repas sans montant → affiche 63 € / 12,60 € inventés. |
| 11 | `restaurant/pages/Tables.tsx:93` | `const guests = table.guests ?? 4` | Convives inconnus → affiche 4 (segments payeurs, « x/4 convives ont payé », €/couvert faux). |
| 12 | `restaurant/pages/Tables.tsx:380,384` | `: 48` (durée moy.) et `: 24` (panier moy.) | Stats strip : aucune table avec durée → « 48 min » ; aucun convive → panier « 24 € ». |
| 13 | `restaurant/pages/Factures.tsx:83-95,604` | `DEMO_ROWS` (10 fausses transactions) ; `rawPayments != null ? … : DEMO_ROWS` | Pendant le chargement (et si query skip), la page affiche 10 fausses transactions et calcule les 4 KPIs dessus. Flash systématique à chaque visite. |
| 14 | `restaurant/pages/Factures.tsx:596` | `ref: 'SPZ-' + String(i).padStart(8,'0')` | Référence de paiement fabriquée (index de boucle) affichée pour les VRAIES transactions, change selon l'ordre. |
| 15 | `restaurant/pages/Factures.tsx:36,428` | `MOCK_SPLITZY_INVOICES` | Onglet « Factures Splitzy » : fausses factures commission (numéros, montants, PDF). Documenté « en attente Tiime » mais l'utilisateur les voit comme réelles. |
| 16 | `restaurant/pages/Settings.tsx:1365-1370,1698` | `MOCK_INVOICES` (INV-2025-001…004, 29 €/mois) | Facturation : 4 fausses factures d'abonnement, téléchargeables en PDF. |
| 17 | `restaurant/pages/Analytics.tsx:442-451,966` | `invest = moSince * 99` ; `'2025-10-01'` ; `aSub * 0.062` ; `aTot * 0.10` ; `posAvis * 30` ; « Activation le 1ᵉʳ oct. 2025 » | Carte « CA généré depuis Splitzy » : date d'activation hardcodée, abonnement 99 € hardcodé, gains fabriqués (baseline 6,2 %, +10 % rotation, 30 €/avis) affichés en € sans la moindre mention « estimation ». |
| 18 | `restaurant/pages/MenuPage.tsx:807` | `value: String(okCount \|\| demoTotal)` | Carte réelle dont 0 article dispo → KPI « Articles disponibles » affiche le total DÉMO (6). Manque le garde `hasLive`. |
| 19 | `src/pages/Confirmation.tsx:6,45-48` | `MENU_ITEMS.find(m => m.id === sel.menuItemId)` | Le reçu résout les articles contre le menu statique de démo ; les vrais ids sont `order-…` → **aucune ligne d'article ne s'affiche dans le vrai flux** (les données name/priceCents sont pourtant dans `state.selectedItems`). |

## 🟠 Moyen — trompeur, contexte atténuant

| # | Fichier:ligne | Extrait | Problème |
|---|---|---|---|
| 20 | `restaurant/pages/Integrations.tsx:11,347-349` | `INITIAL_VOTES = { Pennylane: 142, Tiller: 98, Mailchimp: 76 }` | Compteurs de votes inventés sur les intégrations « à venir ». Cosmétique mais faux (et le vote n'est pas persisté). |
| 21 | `restaurant/layout/Sidebar.tsx:244-249` + `Settings.tsx:1329,2823-2824` | « Plan Essentiel », `59€ /mois`, `99€ /mois` | Tarifs/plan hardcodés (pas de billing réel). Acceptable tant que le pricing est statique, mais le badge « Plan Essentiel » ne reflète pas `restaurants.plan`. |
| 22 | `restaurant/pages/Overview.tsx` (panel insights) | `latestInsights` géré, mais le panneau réputation (= #4) reste fixe | Couvert par #4. |

## 🟢 Étiqueté / intentionnel (ne pas « corriger » sans décision produit)

| # | Fichier | Détail |
|---|---|---|
| 23 | `restaurant/pages/MenuPage.tsx:86-97,829-839` | `DEMO_ITEMS` affichés UNIQUEMENT si 0 article Convex, avec bannière explicite « Mode démo ». OK. |
| 24 | `src/data/session.ts` → `Payment.tsx` | `MOCK_CARDS` (carrousel Visa/Mastercard) : démo intentionnelle tant que provider=demo (cf. auto-confirm). |
| 25 | `src/data/session.ts` | `MOCK_SESSION` nettoyé (valeurs vides/0) — état initial légitime. |

## ⚪ Code mort (à supprimer)

| # | Fichier | Raison |
|---|---|---|
| 26 | `restaurant/pages/Feedbacks.tsx` | Plus routé (`/restaurant/feedbacks` → redirect Reputation). Importe les mocks. |
| 27 | `restaurant/data/mockData.ts` | Plus consommé que par PrintReport (#1) et Feedbacks (#26). À supprimer après réécriture de PrintReport. |
| 28 | `src/pages/Recap.tsx`, `src/pages/Table.tsx` | Routes supprimées (sauvegarde v3). |
| 29 | `src/components/features/MenuModal.tsx` | Monté nulle part. |
| 30 | `src/data/menu.ts` | Après fix #19, plus aucun usage vivant. |

## Vérifications « 100 % Convex » par page

- **Vue d'ensemble** : KPIs héros = `getOverviewStats` ✅ ; activité = payments ✅ sauf fallback démo (#6) ; réputation panel ❌ (#2-4) ; croissance ❌ (#5).
- **Tables live** : statuts/montants = `tables.list` ✅ ; détails commande/fallbacks ❌ (#7-12).
- **Clients/CRM** : 100 % dérivé payments+feedbacks+customers ✅ (deltaPct réel).
- **Analytics** : graphe CA, heatmap, pourboires, top tables = payments réels ✅ ; carte ROI ❌ (#17).
- **Factures** : transactions = payments ✅ après chargement ; loading + refs + factures Splitzy ❌ (#13-15).
- **Réputation** : 100 % feedbacks réels ✅.
- **Menu/Carte** : Convex + mode démo étiqueté ✅ sauf #18.
- **Intégrations** : statuts POS réels ✅ ; votes ❌ (#20).
- **Rapport imprimé** : 0 % réel ❌ (#1).

## Données seed/mock en base prod

- `payments` : purge faite le 2026-06-11 (`purgeTestPayments`, 7 lignes) ✅.
- `customers` / `feedbacks` / `tables` prod : à vérifier en Phase 2 (queries protégées par auth — inspection via fonction interne ou dashboard Convex).

## Splitzy admin (`Splitzy/apps/admin`)

Outil interne (équipe Splitzy uniquement, déployé sur Convex dev) — hors périmètre utilisateur final. Non audité en détail ici ; à traiter séparément si besoin.

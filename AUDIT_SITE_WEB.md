# AUDIT_SITE_WEB — Site marketing vs produit réel

> GOAL_WEB_00 — audit lecture seule, 2026-07-08.
> Méthode : chaque module vérifié dans le code (`src/restaurant/pages/`, `convex/`, routes `RestaurantApp.tsx`), jamais depuis la doc seule.

---

## 1. Modules réels — vérification code

| # | Module (spec app manager) | Statut code | Preuve (fichier / route) |
|---|---|---|---|
| 1 | KPIs & Analytics temps réel | ✅ Disponible | `src/restaurant/pages/Overview.tsx` (CA jour, tables actives, note moy., pourboires, alertes) + `Analytics.tsx` (graphes, heatmap, périodes) — routes `/restaurant`, `/restaurant/analytics` |
| 2 | Insights IA | ✅ Disponible — **réservé plan Pro** | `Analytics.tsx:279-288` (`isPro = restaurant?.plan === 'pro'`, sinon CTA "Passer au Plan Pro") + `convex/insights.ts` |
| 3 | Planning équipe (shifts) | ✅ Disponible | `Planning.tsx` + `convex/planning.ts`, `convex/shifts.ts` — route `/restaurant/planning` (owner+manager). Créé 0723f36 (2026-06-14), complété M11 (2026-06-24) |
| 4 | Extras / renforts (pool, convocations, notation) | ✅ Disponible | `ExtrasPage.tsx` + `convex/extras.ts`, `convex/extraConvocations.ts` — route `/restaurant/extras`. Commit 96799c1 (2026-06-24) + page publique `/extra-response-confirmation` |
| 5 | Plan de salle interactif | ✅ Disponible | `SallePage.tsx` (drag & drop, zones, badges VIP, timer inactivité ≥30 min, forcer paiement QR, clôturer sans paiement) + `convex/zones.ts` — route `/restaurant/salle`. Commit 5eecb80 (2026-06-23), M5 badges/force (2026-06-24) |
| 6 | Chat & communication live | ✅ Disponible | `ChatPage.tsx` + `FloatingChat.tsx` + `convex/messages.ts` (broadcast + DMs, notifications, filtrage par service) — route `/restaurant/chat`. Commits 745d561→d465548 (2026-06-23→26) |
| 7 | Feedback client (inbox privée, tags, alerte note basse) | ✅ Disponible | `Reputation.tsx` + `convex/feedbacks.ts` (tags), alerte avis ≤2★ dans `Overview.tsx:358`, préférence "Alerte feedback négatif" dans `Settings.tsx:4566` — route `/restaurant/reputation` |
| 8 | Gestion menu en direct (86, prix, plat du jour) | ✅ Disponible | `MenuPage.tsx` : toggle `isAvailable` (86, l.310/577), édition prix live, toggle "plat du jour" (l.387) — route `/restaurant/menu` |
| 9 | Alertes manager | ✅ Disponible | `Overview.tsx:371-395` : paiement bloqué >4 min, "Aucun paiement depuis X — problème QR ?", avis négatifs non lus. Préférences dans Settings §notifications |
| 10 | Clôture de service | ✅ Disponible | `SallePage.tsx:265-285` : récap paiements du jour, `convex/closures.ts` (`getTipDistribution`, `sendTipReport` email), export CSV, répartition pourboires (`tipSettings` M11, 2026-06-24) |
| 11 | Multi-établissements | ❌ **À VENIR** — aucun code | Aucune vue agrégée, benchmark ou switch multi-restaurants dans `src/restaurant/` ni `convex/`. `getByMembership` = 1 restaurant |
| 12 | Paiement fractionné (3 modes + splitFactor + verrou) | ✅ Disponible | `splitMode: 'item'\|'equal'\|'custom'` (`src/context/types.ts:54`), splitFactor ÷2/÷3/÷4 (`SplitStrip.tsx`, `Items.tsx`), grand livre + holds (c527629, 2026-07-06), verrou mode par table flag `VERROU_MODE_PAIEMENT` (`convex/featureFlags.ts:74`, 86d603f, 2026-07-07) |
| — | Réservations & liste d'attente (spec §9) | ❌ À VENIR — aucun code | Ni page ni module convex |

**Découverte importante — plans backend** : `convex/schema.ts:499` ne connaît que `plan: "free" | "pro"`. Le site vend 3 plans (Gratuit / Essentiel 59€ / Pro 99€). Aucune limite "3 tables" ou "10 feedbacks/mois" du plan Gratuit n'est appliquée en code. Seule gate réelle trouvée : Insights IA (Pro). ⚠ À garder en tête pour la page Pricing : ne rien promettre de gated qui ne l'est pas, ni l'inverse.

**Intégrations POS réelles** : `convex/posIntegrations.ts` implémente sync Square, SumUp, **Lightspeed** (l.249), **Tiller** (l.158) → la mention "Lightspeed" sur le site est OK ; "Tiller en cours" (Changelog v1.0) est en fait livré côté sync.

---

## 2. Écarts page par page

### 2.1 `Homepage.tsx` + composants
- **Meta SEO** : `title` = "Splitzy — Partagez l'addition, encaissez plus vite" ; description 100 % paiement QR. ❌ Aucune mention pilotage.
- **`Hero.tsx`** : H1 "Fini les additions qui traînent. Vos clients paient en 30 secondes." + sous-titre partage d'addition. Produit présenté = paiement uniquement. Mockup = flow convive seul. Badge "Nouveau — Insights IA v1.1" pointe `href="#changelog"` → **ancre inexistante sur la homepage** (devrait être `/changelog`).
- **`HowItWorks.tsx`** : 2 onglets (restaurant / client) mais le parcours "restaurant" = configurer menu → QR → encaisser. ❌ Aucun parcours pilotage gérant (dashboard → vue d'ensemble → salle live).
- **`Features.tsx`** : 6 cartes, toutes paiement/QR/dashboard basique ("Partage intelligent", "QR codes", "Dashboard temps réel", "Sans app", "Notifications", "Paiements sans friction"). ❌ Absents : plan de salle, planning, extras, chat, clôture, IA, menu live.
- **`Stats.tsx`** : 93 % / 59 % / +9 % (études avis Google, Harvard). Chiffres génériques sourcés, pas de claim client fictif → OK. Les stats fictives (240+ restos, testimonials) sont déjà commentées/HIDDEN → OK.
- **`Solution.tsx`** : 3 blocs — interception avis, réputation temps réel, paiement 30 s. Positionne Splitzy = anti-mauvais-avis + paiement. ❌ Aucun des piliers pilotage/équipe/IA.
- **Bilan piliers GOAL_01** : (a) Paiement ✅ omniprésent ; (b) Pilotage temps réel ⚠ réduit à "dashboard feedbacks" ; (c) IA ⚠ un badge héro seulement ; (d) Équipe ❌ absent.

### 2.2 `Fonctionnalites.tsx` (646 l.) + `FonctionnalitesHero.tsx`
- Hero H1 : "Payez en 10 sec. Interceptez l'insatisfaction. Protégez votre note." Sous-titre : "Paiement QR, feedback interception, analytics temps réel. **La seule solution qui…**". Pills : Paiement / Interception / Analytics.
- 4 sections seulement : 01 Paiement QR, 02 Interception feedback, 03 Dashboard réputation, 04 Partage d'addition (3 modes — noms UI "Par article / Par personnes / Montant libre", conformes au code `item|equal|custom`).
- ❌ Modules absents de la page : plan de salle, chat, planning, extras, clôture de service, menu live (86/plat du jour), alertes manager, insights IA (mentionnés nulle part), verrou de mode de paiement, multi-établissements (à venir).
- Meta description : "QR code par table, paiement sans contact, dashboard temps réel, intégration Square" — restrictif.
- Incohérence interne : hero dit "10 sec", sections disent "30 secondes", badge mockup "Payé en 8 sec".

### 2.3 `PricingPage.tsx` / `PricingPreview.tsx`
- 3 plans : Gratuit 0€ / Essentiel 59€ (highlight) / Pro 99€. (Prix : ne pas toucher sans validation user.)
- **Gratuit** : "Jusqu'à 3 tables", "10 feedbacks / mois", "Dashboard basique" — ❌ **aucune de ces limites n'existe en code**. Survendu à l'envers (le plan gratuit réel n'est pas limité) mais surtout : promesse de mécanique produit inexistante.
- **Essentiel** : features OK (tables/feedbacks illimités, notifs, analytics, capture emails) mais aucun module pilotage listé (salle, planning, chat, clôture tous livrés).
- **Pro** : "Multi-établissements" ❌ **n'existe pas en code** → à retirer ou marquer "à venir". "Intégrations POS (Square, Lightspeed…)" ✅ réel. **Insights IA absent de la liste Pro alors que c'est la seule gate Pro réelle du code** (`Analytics.tsx:329`).
- Rappel backend : schéma = `free|pro` uniquement — le palier "Essentiel" n'a pas d'existence technique.

### 2.4 `AboutPage.tsx`
- Histoire origine (avis Google, note perdue, NEOMA, Yann & Théo) — à conserver (GOAL_03).
- ❌ Aucun paragraphe sur l'évolution vers le pilotage complet. La mission reste 100 % "intercepter l'insatisfaction".
- Chiffres : 179 000 restaurants France, 4,2→3,8★, −30 % réservations — génériques, OK. Cartes fictives déjà HIDDEN.
- Note : route réelle = `/about` (Footer pointe `/about` ✅ ; CLAUDE.md mentionne `/a-propos` — obsolète, la route n'existe pas).

### 2.5 `AidePage.tsx`
- Catégories : Paiement / Mon compte / QR codes & Tables. ❌ Manquent : Planning & équipe, Plan de salle, Chat interne, Clôture de service (GOAL_03 §3).
- FAQ Paiement dit "traité par **Square** — certifié PCI DSS" ; `SecuritePage.tsx` meta dit "PCI DSS niveau 1 via **Stripe**" → **incohérence PSP** entre pages.
- Meta description : "Installation, QR codes, paiements" — restrictif.

### 2.6 `Changelog.tsx`
- Dernière entrée : v1.1 "Insights IA" (Juin 2026). "Dernière mise à jour : Juin 2026" → périmé (on est en juillet, 2 features majeures shipped depuis).
- ❌ Entrées manquantes (dates git réelles) :
  - **Plan de salle interactif** — 5eecb80 (2026-06-23) + VIP/forcer paiement M5 (2026-06-24)
  - **Chat équipe** — 745d561 (2026-06-23), FloatingChat 2646a03 (2026-06-24), refonte bulles d465548 (2026-06-26)
  - **Planning & Extras** — 0723f36 (2026-06-14), extras + pool de confiance 96799c1 (2026-06-24)
  - **Clôture de service & pourboires** — M11 A/B/C (2026-06-24, répartition + email rapport)
  - **Paiement fractionné v2 (grand livre + holds + splitFactor ÷2/÷3/÷4)** — c527629 (2026-07-06)
  - **Verrou de mode de paiement par table** — 86d603f (2026-07-07)
  - Correctifs paiement fractionné (libellés d'état réels) — b4cad00 (2026-07-07)
- Module réputation/avis : partiellement couvert par v1.0 "Page Réputation" → OK, éventuel enrichissement.
- v1.0 dit "Lightspeed et Tiller en cours" → sync livrée dans `posIntegrations.ts` (à reformuler).

### 2.7 `Navbar.tsx`
- Liens : Comment ça marche (`/#comment-ca-marche`), Tarifs, Blog. ❌ **Pas de lien "Fonctionnalités"** dans la nav principale (seulement dans le Footer). À corriger (GOAL_04).

### 2.8 `Footer.tsx`
- Tagline : "Le partage d'addition sans friction, pensé pour les restaurants français modernes." → restrictif, à repositionner.
- Liens OK (Fonctionnalités, Tarifs, Démo, Changelog, À propos, Blog, Contact, Aide, Sécurité, CGU, Privacy). Presse/Carrières déjà masqués volontairement.

### 2.9 `SecuritePage.tsx` / `ContactPage.tsx`
- Sécurité : hors périmètre principal des goals mais incohérence PSP (Stripe vs Square) à trancher en GOAL_04 (vocabulaire).
- Contact : pas d'écart produit signalé.

---

## 3. Mentions obsolètes / trop restrictives (synthèse)

| Où | Texte actuel | Problème |
|---|---|---|
| Homepage `<title>` | "Partagez l'addition, encaissez plus vite" | Paiement = LE produit |
| Hero H1/sous-titre | "Vos clients paient en 30 secondes" / "partager l'addition" | idem |
| Hero badge | `href="#changelog"` | ancre morte |
| Footer tagline | "Le partage d'addition sans friction" | idem |
| Navbar | pas de lien Fonctionnalités | page clé inaccessible depuis la nav |
| Fonctionnalites hero | "La seule solution qui empêche les mauvais avis" | réduit le produit à l'anti-avis |
| Fonctionnalites meta | "QR code par table, paiement sans contact" | restrictif |
| Aide meta + catégories | "Installation, QR codes, paiements" | restrictif |
| Pricing Pro | "Multi-établissements" | inexistant en code |
| Pricing Gratuit | "Jusqu'à 3 tables", "10 feedbacks/mois" | limites non implémentées |
| Changelog v1.0 | "Lightspeed et Tiller en cours" | sync livrée |
| Aide vs Sécurité | Square vs Stripe (PCI DSS) | incohérence PSP |
| "10 sec" vs "30 sec" vs "8 sec" | FonctionnalitesHero / sections / badge | incohérence chiffre |

---

## 4. Checklist de sortie GOAL_00

- [x] Chaque page marketing listée a une entrée (Homepage+5 composants, Fonctionnalites+Hero, Pricing, About, Aide, Changelog, Contact, Sécurité, Navbar, Footer).
- [x] Les 12 modules + réservations : 11 trouvés en code avec preuve, 2 absents (multi-établissements, réservations) → à marquer "à venir".
- [x] Aucun fichier de code modifié (ce document est le seul livrable).

## 5. Notes pour les goals suivants

- E2E existants (`e2e/tests/`) ne couvrent **aucune** route marketing → GOAL_04 : régression = `npm run build` + `npm run lint` + rendu visuel, pas de spec à rejouer.
- Refonte visuelle homepage récente (2f6ec54, 2026-07-05) : le design system actuel est frais — changement de contenu/structure uniquement, pas de re-style.
- Vocabulaire à unifier (GOAL_04) : "Plan de salle" (pas "gestion des tables"), "Clôture de service", "Chat équipe", "Extras", "Insights IA", "Paiement fractionné".

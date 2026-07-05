# RECON — Convives réels (GOAL 0, lecture seule)

Date : 2026-07-03. Aucun fichier de code touché. Repo : `splitzy-client/` (+ mirror `Splitzy/convex/` à traiter au déploiement).

---

## 0.1 — Lecteurs / écrivains de `tables.guests` (exhaustif)

### Écrivains

| Fichier:ligne | Écriture | Sort dans le plan |
|---|---|---|
| `src/pages/TableEntry.tsx:132` | `guests: ctx.table!.capacity ?? 4` via `tables:updateStatus` au scan QR | **À RETIRER** (GOAL 1.2) |
| `src/restaurant/pages/Tables.tsx:421` | Simulation [TEST] : `guests = somme des qty simulées` | Garder (signal volontaire de test) |
| `src/restaurant/pages/Tables.tsx:666` | Envoi addition : `guests: sendModal.guests ?? 4` | **`?? 4` À RETIRER** (GOAL 1.4) |
| `src/restaurant/pages/Tables.tsx:753` | AddItemModal, table libre : `...(isFree ? { guests } : {})` (stepper manuel, défaut 2) | Garder (signal manuel assumé, hors périmètre) |
| `convex/tables.ts:114` | `updateStatus` : `if (guests !== undefined) patch.guests = Math.max(0, guests)` | Déjà compatible : absent ⇒ non touché ✓ |
| `convex/tables.ts:150` | `resetToFree` : `guests: undefined` | Normal (fin de sitting) |
| `convex/tables.ts:222` | `addOrderItems` : `if (guests !== undefined)` borné 0-99 | Déjà compatible ✓ |
| `convex/tables.ts:359` | Reset bulk (clôture service) : `guests: undefined` | Normal |
| `convex/tables.ts:518` | Release table : `guests: 0` | Normal |
| `convex/seed.ts` (23-45, 364-416) | Seeds — `internalMutation` uniquement | Hors périmètre |

### Lecteurs de `tables.guests`

| Fichier:ligne | Lecture | Garde 0/undefined |
|---|---|---|
| `src/restaurant/pages/Tables.tsx:124-125` | `const guests = table.guests ?? 0` + `perGuestCents(total, guests)` | ✓ `billing.ts:20` retourne `null` si `guests <= 0` |
| `src/restaurant/pages/Tables.tsx:213` | `guests > 0 ? "x/y convives ont payé" : "Convives —"` | ✓ empty state explicite |
| `src/restaurant/pages/Tables.tsx:218-224` | Dots de paiement rendus seulement si `guests > 0` | ✓ |
| `src/restaurant/pages/Tables.tsx:397,402` | `totalGuests = Σ (t.guests ?? 0)` → `avgBasketCents` | ✓ `billing.ts:26` retourne `null` si `guestsTotal <= 0` |
| `src/restaurant/pages/Tables.tsx:561` | Drawer : `{liveSelected.guests && <ligne Convives>}` | ✓ ligne masquée si 0/undefined |
| `src/restaurant/components/PrintReport.tsx:246-247` | `(t.guests ?? 0) > 0 && "<N> conv."` | ✓ |
| `convex/tables.ts:51-53` | Projection `list` (renvoie le champ tel quel) | N/A |

### Lecteurs de `payments.guests` (impactés par GOAL 1.1 — Payment.tsx)

| Fichier:ligne | Lecture | Garde |
|---|---|---|
| `convex/insights.ts:50,56,115,118` | `p.guests ?? 1` (couverts) | ✓ |
| `convex/analytics.ts:37` | `covers = Σ (p.guests ?? 1)` ; `avgTicket = covers > 0 ? ca/covers : 0` | ✓ division gardée |
| `convex/actions/generateInsights.ts:140` | `couverts = Σ (p.guests ?? 0)` ; rotation gardée par `tables.length > 0` + empty state si `enc.length === 0` | ✓ |
| `src/restaurant/pages/SallePage.tsx:434,443` | `p.guests ?? 0` (KPI) et `p.guests ?? ''` (CSV) | ✓ |
| `src/restaurant/pages/Overview.tsx:223` | JSX `{payment.guests} conv.` | ⚠ undefined ⇒ rendu vide (pas de crash) |
| `src/restaurant/pages/Clients.tsx:140` | Template literal `` `${p.guests} convive…` `` | ⚠ undefined ⇒ affiche « undefined » |
| `src/restaurant/pages/Factures.tsx:203,309,606,1037` | Template literals + JSX | ⚠ idem « undefined » (203, 309) |
| `src/restaurant/components/PrintReport.tsx:371` | `<Td>{row.guests}</Td>` | ⚠ undefined ⇒ cellule vide |
| `src/restaurant/pages/Analytics.tsx:78` | Type seulement — aucun usage dans le corps (couverts calculés backend `analytics.ts`) | ✓ |

Les ⚠ ne sont PAS des crashs, mais l'ajustement A1 ci-dessous les rend sans objet (jamais d'`undefined` stocké).

---

## 0.2 — Verdict par fichier demandé

- **`Analytics.tsx`** : `guests` présent uniquement dans le type local (ligne 78). Couverts/panier moyen viennent du backend (`convex/analytics.ts:37-39`), division gardée. **OK.**
- **`Overview.tsx:223`** : rendu JSX simple, pas de calcul. undefined ⇒ vide. **OK (pas de crash).**
- **`convex/actions/generateInsights.ts:140-152`** : `?? 0`, rotation gardée, empty state explicite (« Pas assez de données service »). **OK.**
- **`SallePage.tsx:434,443`** : `?? 0` / `?? ''`. **OK.**
- **`Tables.tsx` / `PrintReport.tsx` (tables.guests)** : « Convives — » et gardes `> 0` partout, confirmé lors de l'audit 2026-07-03 et revérifié ligne par ligne ci-dessus. **OK.**

Aucun lecteur ne suppose `guests` non nul en cours de service. Pas de division par zéro possible (`billing.ts` retourne `null`, `analytics.ts` garde `covers > 0`).

---

## 0.3 — Algorithme `sittingPayers` (Landing.tsx:55-65), à reproduire backend

```
entrée : payments de la table triés DESC par createdAt (listByTable), paidCents de la table
acc = 0
pour chaque paiement p (du plus récent au plus ancien) :
  si acc >= paidCents : break
  inclure p ; acc += p.subtotalCents ?? 0
```
On inclut les paiements les plus récents jusqu'à ce que leur cumul de `subtotalCents` couvre `paidCents` — ça isole la sitting courante (le `paidCents` de la table est remis à zéro à chaque nouvelle sitting).

**Deux variantes coexistent déjà** :
- `Landing.tsx:55-65` : ne filtre PAS sur `status` (compte aussi les « En attente »), compte des *paiements* (pas de dédup payeur).
- `Tables.tsx:353-363` (`sittingPayerCount`, dashboard) : filtre `status === 'Encaissé'`, même cumul, compte des paiements.

Le backend suivra la variante **filtrée « Encaissé »** (comme le spécifie GOAL 1.3) + **dédup par `firstName|avatarIndex`** (demandée par GOAL 1.3, absente des deux variantes front — c'est un ajout voulu, pas une divergence accidentelle).

---

## 0.4 — Marqueur de début de sitting

**`tables.sittingStartedAt` EXISTE** (`convex/schema.ts:121`) mais est **optionnel et partiel** : posé uniquement quand le gérant ouvre une table libre via `addOrderItems` (`tables.ts:217`), effacé au reset/release/clôture. Le commentaire du schéma est explicite : « les sittings ouvertes par la caisse ou un scan QR n'en ont pas ».

⇒ **Hybride obligatoire** (ajustement A3) : si `table.sittingStartedAt` défini → filtrer les paiements `createdAt >= sittingStartedAt` (exact) ; sinon → reconstitution par cumul (approximation existante, documentée comme telle).

---

## 0.5 — Risques du plan : confirmations / alertes

| Risque du plan | Verdict |
|---|---|
| Lecteurs supposant `guests` non nul | **Confirmé absent** — tous gardés (0.2) |
| Sitting approximative | **Confirmé**, atténué par A3 (hybride `sittingStartedAt`) |
| `confirmPayment` durci (Vuln 1/H1) | **Confirmé intouchable** — le patch guests s'ajoute strictement après `reconcileTablePatch` (A2) |

### ⚠ ALERTE BLOQUANTE DÉTECTÉE (non prévue par le plan) — Ajustement A1

`payments.create` a `guests: v.number()` **REQUIS** (`convex/payments.ts:65`) et le schéma aussi (`convex/schema.ts:186` `guests: v.number()`). Appliquer GOAL 1.1 tel quel (envoyer `undefined` en mode article) ⇒ `ArgumentValidationError` ⇒ **100 % des paiements « par article » échouent**. Inacceptable sans ajustement.

**A1 retenu** (reste dans les 4 fichiers autorisés, zéro migration de schéma) :
1. `convex/payments.ts` : validator `guests: v.optional(v.number())`.
2. À l'insert : `guests: args.guests ?? 1` — un paiement « par article » = 1 payeur, sémantiquement honnête ; le schéma `payments.guests: v.number()` reste requis et satisfait ; aucun `undefined` en base ⇒ les affichages `${p.guests}` (Clients/Factures) et les compteurs de couverts (`?? 1`) restent cohérents.
3. **Conséquence sur `computeGuestsPatch`** : `pmt.guests` étant désormais toujours défini (défaut 1), le test « si défini » du GOAL 1.3 ne discrimine plus. Logique ajustée : `candidat = max(pmt.guests ?? 0, payeursDistinctsSitting)` — les deux signaux sont calculés, le plus fort gagne. Vérification sur les 3 scénarios du GOAL 2 : A (3×guests=3 ⇒ max(3, ≤3)=3 ✓), B (2 payeurs distincts, guests=1 ⇒ max(1,2)=2 ✓), C (table à 3, signal faible ⇒ max extérieur `Math.max(table.guests ?? 0, candidat)` ne descend jamais ✓).

**Alternative rejetée** : rendre `payments.guests` optionnel dans `schema.ts` — 5ᵉ fichier (interdit par GOAL 1.5), et introduit des « undefined » affichés dans Clients.tsx:140 / Factures.tsx:203,309.

### Ajustements complémentaires

- **A2** : dans `confirmPayment` et `backfillDemoPending`, appeler `computeGuestsPatch` APRÈS le `ctx.db.patch(..., reconcileTablePatch(...))`, en relisant la table (`ctx.db.get`) — les lectures Convex voient les écritures de la même mutation, donc `paidCents` post-crédit correct pour le cumul.
- **A3** : hybride sitting (cf. 0.4).
- **A4** : dans `backfillDemoPending`, ne patcher guests que pour les paiements effectivement réconciliés (même condition que le patch argent existant).
- **Note TableEntry** : la transition `dining→dining` au re-scan est déjà refusée côté backend pour un anonyme (`tables.ts:103-110`) et le `.catch` la logge — comportement existant inchangé par le retrait de `guests`.

---

## VERDICT : **GO avec ajustements A1, A2, A3, A4**

Périmètre fichiers inchangé (les 4 du GOAL 1). Règle transversale respectée : aucun toucher à `paidCents`/`amountCents`/`totalCents`/webhooks/`requireRestaurantAccess`.

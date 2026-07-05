# GOALS — SupportPage gérant + fix /legal

Repo : `~/Downloads/test/splitzy-client/`
Règle absolue : ne toucher qu'aux fichiers listés ci-dessous. Zéro modification dans `convex/`.

---

## GOAL 1 — Créer `src/restaurant/pages/SupportPage.tsx`

Design system identique aux autres pages (Overview, Reputation) :
- Imports : `m, AnimatePresence` from `framer-motion`, `BlurFade` from `../components/ui/BlurFade`, `RestaurantLayout` from `../layout/RestaurantLayout`, `PageHeader` from `../components/PageHeader`, `Skeleton` from `../../components/ui/skeleton`, `toast` from `sonner`
- Icônes lucide : `LifeBuoy, Plus, Send, ChevronRight, Clock, CheckCircle2, AlertCircle, MessageSquare`
- CSS vars et classe `ds-panel` identiques aux autres pages (Overview, Reputation)

**Fonctions Convex utilisées (déjà en prod) :**
- `api.tickets.listMyTickets` — args: `{}` → liste des tickets du restaurant connecté
- `api.tickets.createFromDashboard` — args: `{ subject: string, body: string, priority?: string }` → crée un ticket
- `api.tickets.listMyMessages` — args: `{ ticketId }` → messages du thread (notes internes filtrées)
- `api.tickets.replyFromDashboard` — args: `{ ticketId, body: string }` → gérant répond

**UX / Layout :**
- Vue liste : grille de cards BlurFade (stagger 0.04s). Chaque card : badge statut coloré (new=amber, in_progress=blue, resolved=green), sujet, date relative, priorité pill.
- Bouton « Nouveau ticket » → dialog (subject, textarea body, select priorité : normal/high/urgent). `toast.success` au succès.
- Clic card → vue thread slide-in droite (`x: 40→0`, `AnimatePresence`). Bulles : admin=gauche fond subtle, gérant=droite fond accent. Textarea + Send en bas (`replyFromDashboard`).
- État vide : texte + bouton créer. Skeleton 3 cards pendant chargement.

**Statuts FR :** new→"Nouveau", in_progress→"En cours", waiting_customer→"En attente", resolved→"Résolu", closed→"Fermé"

---

## GOAL 2 — Brancher la route et la nav

### `src/restaurant/RestaurantApp.tsx`
Ajouter en haut : `import { SupportPage } from './pages/SupportPage'`
Ajouter dans `<Routes>` (après `/extras`) :
```tsx
<Route path="/support" element={<SupportPage />} />
```

### `src/restaurant/layout/RestaurantLayout.tsx`
Ajouter `LifeBuoy` aux imports lucide existants.
Ajouter dans `MOBILE_OVERFLOW` (après Extras) :
```ts
{ label: 'Support', icon: LifeBuoy, to: '/restaurant/support' },
```
Trouver le tableau de nav desktop dans `Sidebar` (même fichier) et y ajouter la même entrée au même endroit.

---

## GOAL 3 — Fix route `/legal` (CGU + Mentions légales)

### `src/pages/marketing/LegalPage.tsx` — NOUVEAU FICHIER
Copier la structure exacte de `PrivacyPage.tsx` (Helmet, Navbar, Footer, `m` framer-motion, même style de sections).
Deux sections : **Conditions Générales d'Utilisation** et **Mentions légales**.
Contenu : Éditeur = Splitzy SAS, hébergeur = Vercel/Convex. CGU = service paiement en table, utilisation conforme loi française. Même mise en page que PrivacyPage, pas besoin d'être exhaustif.

### `src/App.tsx`
Ajouter l'import lazy en haut avec les autres pages marketing :
```ts
const LegalPage = lazy(() => import('./pages/marketing/LegalPage'))
```
Ajouter la route dans le bloc marketing (après `/privacy`) :
```tsx
<Route path="/legal" element={<LegalPage />} />
```

---

## Vérification finale
```bash
cd ~/Downloads/test/splitzy-client
npm run build
```
Doit passer sans erreur TypeScript ni Vite. Ensuite :
```bash
git add src/restaurant/pages/SupportPage.tsx src/restaurant/RestaurantApp.tsx src/restaurant/layout/RestaurantLayout.tsx src/pages/marketing/LegalPage.tsx src/App.tsx
git commit -m "feat: support page gérant + fix route /legal"
git push origin main
```

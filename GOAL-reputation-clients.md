# GOAL — Fix Réputation + Clients connectés

Deploy : `cd ~/Downloads/test/splitzy-client && vercel --prod`

---

## Bug 1 — Réputation double-comptage

`src/restaurant/pages/Reputation.tsx`

`negCount = feedbacks.filter(f => f.stars <= 3)` inclut les 3★ déjà dans `neuCount`. Fix : changer en `f.stars <= 2`. Changer le label JSX `"≤ 3 étoiles"` → `"≤ 2 étoiles"`. Vérifier negCount+posCount+neuCount === total.

---

## Bug 2 — Clients hardcodés → connecter à Convex

`src/restaurant/pages/Clients.tsx`

Remplacer le tableau `CUSTOMERS` statique par des données calculées depuis les paiements et feedbacks réels.

**Imports à ajouter** : `useQuery` de convex/react, `api` depuis `../../../convex/_generated/api`, `useRestaurantId` depuis `../context/RestaurantContext`, `useMemo` depuis react.

**Dans le composant** :
```typescript
const restaurantId = useRestaurantId()
const payments  = (useQuery(api.payments.list,  restaurantId ? {restaurantId} : 'skip') ?? []).filter(p => p.status === 'Encaissé')
const feedbacks =  useQuery(api.feedbacks.list, restaurantId ? {restaurantId} : 'skip') ?? []
```

**Table d'identités fixes** (une par tableNumber 1-10) — conserver les mêmes noms/emails/couleurs que le tableau CUSTOMERS actuel, mais indexés par tableNumber (1=Sophie Martin, 2=Alexandre Dubois, 3=Camille Lefebvre, 4=Manon Bonnet, 5=Thomas Bernard, 6=Léa Moreau, 7=Emma Roux, 8=Lucas Fournier, 9=Chloé Girard, 10=Antoine Mercier).

**Calcul dans useMemo** : pour chaque tableNumber 1-10, filtrer payments et feedbacks par tableNumber, calculer visits/total/avg/avgRating/lastVisit, dériver le statut (vip si visits≥10 ou total≥500, insatisfait si avgRating<3 et avgRating>0, regulier si visits≥3, nouveau sinon). Filtrer les tables sans aucun paiement. Trier par total décroissant.

**Helper** `formatTimeAgo(ts: number)` : "aujourd'hui" / "hier" / "il y a Xj".

**KPIs header** : remplacer les valeurs hardcodées (14 clients, 23 réguliers, 34.77€, 4.3★) par les vraies valeurs calculées depuis CUSTOMERS.

**Drawer** : les visites hardcodées dans `CustomerDrawer` peuvent rester statiques pour l'instant (les 5 dernières visites du drawer ne changent pas — c'est acceptable).

---

```bash
npx tsc --noEmit && vercel --prod
```

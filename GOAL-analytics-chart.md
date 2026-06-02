# GOAL — Analytics chart : 3 fixes restants

Fichier : src/restaurant/pages/Analytics.tsx
Deploy : cd ~/Downloads/test/splitzy-client && vercel --prod

Boutons "Simuler"/"Nettoyer" déjà connectés (ne pas toucher).
buildChartDays today/week/month déjà corrigés (pre-fill zéros).
TypeScript clean. 3 problèmes restants :

---

## Fix 1 — Custom : pre-fill jours

Le case `custom` dans buildChartDays agrège sans pré-générer les jours. Remplacer par la même logique que `month` : boucle `cursor = windowStart` jusqu'à `windowEnd` (+86400000 par itération), slots à 0, puis injecter les paiements. Même pattern que le case month existant.

## Fix 2 — Year : afficher tous les mois Jan → mois courant

Actuellement seuls les mois avec données s'affichent. Supprimer la logique `monthsWithData.length <= 1` (fallback daily).

Remplacer le case year entier par : pré-générer tous les mois de 0 à `new Date(windowEnd).getMonth()` inclus avec total=0, puis injecter les paiements. Résultat : Jan–Jun toujours visibles, mois vides à 0, courbe Bezier correcte sur l'année.

```typescript
if (periodKey === 'year') {
  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  const lastMonth = new Date(windowEnd).getMonth()
  const slots: Array<{day:string;total:number}> = []
  const idx = new Map<string,number>()
  for (let m = 0; m <= lastMonth; m++) {
    idx.set(MONTHS[m], slots.length)
    slots.push({ day: MONTHS[m], total: 0 })
  }
  pmts.forEach(p => {
    const k = MONTHS[new Date(p.createdAt).getMonth()]
    const i = idx.get(k)
    if (i !== undefined) slots[i].total += p.totalCents / 100
  })
  return slots
}
```

## Fix 3 — Légende : label période dynamique

La légende affiche "Ce mois" hardcodé. Calculer `currentPeriodLabel` :
- today → "Aujourd'hui"
- week → "Cette semaine"
- month → nom du mois courant en français court (MONTHS[now.getMonth()])
- year → String(now.getFullYear())
- custom → `${customStart} — ${customEnd}` ou "Période"

Remplacer `'Ce mois'` dans la légende SVG par `{currentPeriodLabel}`.

---

## Vérification

1. Simuler → Cette année montre Jan–Jun (courbe descendante Jan→Jun)
2. Personnalisé 01/05–31/05 → courbe pleine sur tout mai
3. Nettoyer → empty state sur toutes les périodes
4. Simuler à nouveau → tout revient

```bash
npx tsc --noEmit && vercel --prod
```

# GOAL — Fix alerte "Aucun paiement depuis X min" (Overview gérant)

Repo : `~/Downloads/test/splitzy-client/`
Règle absolue : ne toucher qu'au fichier `src/restaurant/pages/Overview.tsx`. Zéro modification ailleurs, zéro modification dans `convex/`.

## Bug identifié
`src/restaurant/pages/Overview.tsx` ligne ~383 : le message d'alerte est un **texte hardcodé** `'Aucun paiement depuis 18 min — problème QR code ?'`, alors que le seuil de déclenchement (`18 * 60_000` ms, ligne ~375-376) sert uniquement à décider *si* l'alerte s'affiche — pas à calculer la durée réelle affichée. Résultat : dès que `now - lastOk.createdAt > 18min`, l'alerte s'affiche avec "18 min" écrit en dur, même si le dernier paiement remonte à 4 jours.

## GOAL 1 — Calculer et afficher la vraie durée écoulée
Juste avant le bloc `alerts` (~ligne 378), ajouter :

```tsx
const minutesSinceLastPayment = lastOk
  ? Math.floor((now - lastOk.createdAt) / 60_000)
  : null

const qrAlertMsg = minutesSinceLastPayment === null
  ? 'Aucun paiement encaissé depuis l’ouverture — problème QR code ?'
  : minutesSinceLastPayment >= 1440
    ? `Aucun paiement depuis ${Math.floor(minutesSinceLastPayment / 1440)} j — problème QR code ?`
    : minutesSinceLastPayment >= 60
      ? `Aucun paiement depuis ${Math.floor(minutesSinceLastPayment / 60)} h — problème QR code ?`
      : `Aucun paiement depuis ${minutesSinceLastPayment} min — problème QR code ?`
```

Remplacer la ligne :
```tsx
...(qrInactive ? [{ key: 'qr', msg: 'Aucun paiement depuis 18 min — problème QR code ?' }] : []),
```
par :
```tsx
...(qrInactive ? [{ key: 'qr', msg: qrAlertMsg }] : []),
```

## GOAL 2 — Sortir le seuil en constante nommée
Le `18 * 60_000` reste en dur dans le calcul de `qrInactive` (ligne ~375-376). Extraire au-dessus du composant :
```tsx
const QR_INACTIVITY_THRESHOLD_MS = 18 * 60_000
```
Puis :
```tsx
const qrInactive = tables.some(t => t.status === 'dining') &&
  (!lastOk || now - lastOk.createdAt > QR_INACTIVITY_THRESHOLD_MS)
```

## Vérification finale
```bash
cd ~/Downloads/test/splitzy-client
npm run build
```
Doit passer sans erreur TypeScript ni Vite. Ensuite :
```bash
git add src/restaurant/pages/Overview.tsx
git commit -m "fix: alerte QR inactif affiche la vraie duree ecoulee au lieu du seuil hardcode"
git push origin main
```

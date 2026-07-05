# GOAL — Corriger N1 et N2 de AUDIT_WIRING_FABLE5_2026-07-03.md avant les tests

Repo : `~/Downloads/test/splitzy-client/`
Contexte : deux trouvailles de l'audit de câblage à corriger avant de lancer le test de bout en bout, pour ne pas fausser la lecture des résultats. Ne toucher qu'aux 2 fichiers listés.

---

## N1 — Badge « +2,3 pts » hardcodé (`src/restaurant/pages/Analytics.tsx`)

Le fichier calcule déjà `avgTipPct` (ligne ~507, taux de pourboire réel) et une base secteur `6.2`. Ajouter juste après la ligne `tipVsBase` (~525) :
```ts
const tipPtsDelta = tipsTotal > 0 ? parseFloat(avgTipPct) - 6.2 : null
```

Remplacer le bloc (~1166-1173) :
```tsx
{tipsTotal > 0 ? (
  <>
    <TrendingUp size={9} />
    +2,3 pts
  </>
) : '—'}
```
par :
```tsx
{tipPtsDelta !== null ? (
  <>
    <TrendingUp size={9} />
    {tipPtsDelta >= 0 ? '+' : ''}{tipPtsDelta.toFixed(1).replace('.', ',')} pts
  </>
) : '—'}
```

---

## N2 — Méthode de paiement forcée à `'card'` (`src/restaurant/pages/Factures.tsx`)

1. Ligne 52 — étendre le type pour couvrir toutes les méthodes réelles du backend :
```ts
type PayMethod = 'card' | 'apay' | 'gpay' | 'cash' | 'other'
```

2. `METHOD_LABELS` (~62-66) — ajouter les 2 nouvelles entrées :
```ts
const METHOD_LABELS: Record<PayMethod, { ic: string; name: string; cls: string }> = {
  apay:  { ic: 'Pay', name: 'Apple Pay',  cls: '#1A1A1A' },
  gpay:  { ic: 'G',   name: 'Google Pay', cls: '#4285F4' },
  card:  { ic: 'CB',  name: 'Carte',      cls: '#52525B' },
  cash:  { ic: '€',   name: 'Espèces',    cls: '#16A34A' },
  other: { ic: '?',   name: 'Autre',      cls: '#71717A' },
}
```

3. `METHOD_OPTS` (~393-397) — ajouter les 2 mêmes options (label 'Espèces' / 'Autre', value 'cash' / 'other').

4. Ligne ~571 — `useState<Set<PayMethod>>(new Set(['card', 'apay', 'gpay']))` → ajouter `'cash', 'other'` pour qu'aucune transaction ne soit masquée par défaut.

5. Juste avant le calcul de `rows` (~593), ajouter une fonction de correspondance vers le vrai champ backend (`payments.paymentMethod` = `'card'|'apple_pay'|'google_pay'|'cash'|'other'`) :
```ts
const toPayMethod = (m: string): PayMethod =>
  m === 'apple_pay' ? 'apay' : m === 'google_pay' ? 'gpay' : m === 'cash' ? 'cash' : m === 'card' ? 'card' : 'other'
```
Puis remplacer ligne 599 :
```ts
method: 'card' as PayMethod,
```
par :
```ts
method: toPayMethod(p.paymentMethod),
```

---

## Vérification finale
```bash
cd ~/Downloads/test/splitzy-client
npm run build
```
Build doit passer. Puis :
```bash
git add src/restaurant/pages/Analytics.tsx src/restaurant/pages/Factures.tsx
git commit -m "fix: badge pourboires calculé (N1) + méthode de paiement réelle dans Factures (N2)"
git push origin main
```

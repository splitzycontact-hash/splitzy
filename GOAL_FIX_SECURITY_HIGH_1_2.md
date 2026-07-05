# GOAL — Corriger les 2 failles HAUTES de l'audit SECURITY_AUDIT_FABLE5_2026-07-03.md

Repo : `~/Downloads/test/splitzy-client/`
Contexte : suite à l'audit lecture-seule, on corrige uniquement les findings #1 et #2 (Haute). Ne pas toucher aux findings #3-7.
Règle absolue : ne modifier que les fichiers listés ci-dessous. Approche additive.

**Vérification faite en amont (importante, ne pas re-questionner) :** `transactions.listByRestaurant` est appelée par le dashboard admin (`apps/admin/RestaurantDetail.tsx`) SANS passer par un membership restaurant — c'est un accès admin cross-tenant légitime. Un `requireRestaurantAccess` seul casserait cette page. `getOverviewStats`, `countRecentByRestaurant`, `countRecentByIp` n'ont aucun appelant connu (client ou admin) — libres d'être gardées sans risque de casse.

---

## GOAL 1 — Fuite financière cross-tenant anonyme (`convex/transactions.ts`)

`isAdminAccess` est déjà importé en haut du fichier (`import { isAdminAccess } from "./lib"`). Ajouter l'import de `requireRestaurantAccess` :
```ts
import { requireRestaurantAccess } from "./authz"
```

Dans `listByRestaurant` (ligne ~37-55), `countRecentByRestaurant` (ligne ~57-69) et `getOverviewStats` (ligne ~82-99) : ajouter en toute première ligne du handler, avant tout accès DB :
```ts
if (!(await isAdminAccess(ctx))) {
  await requireRestaurantAccess(ctx, args.restaurantId)
}
```
(Autorise soit un admin plateforme, soit un membre/owner du restaurant — préserve l'usage admin existant tout en fermant l'accès anonyme.)

Dans `countRecentByIp` (ligne ~71-80, pas de `restaurantId` dans les args donc pas de fallback possible) : ajouter en première ligne du handler :
```ts
if (!(await isAdminAccess(ctx))) throw new Error("Accès refusé")
```

---

## GOAL 2 — Élévation de privilège gérant → config globale (`convex/lib.ts` + `convex/config.ts`)

**Ne pas modifier `resolveAdminUser` existant.** Ajouter dans `convex/lib.ts`, juste après `resolveAdminUser` :
```ts
// Nouveau : renvoie l'acteur SEULEMENT s'il a un rôle admin (super_admin/admin_support).
// Contrairement à resolveAdminUser (vérité = présence), celle-ci vérifie le rôle.
export async function requireAdminRole(ctx: any) {
  const actor = await resolveAdminUser(ctx)
  if (!actor || !["super_admin", "admin_support"].includes(actor.role)) {
    throw new Error("Accès admin requis")
  }
  return actor
}
```

Dans `convex/config.ts`, dans les 4 mutations `toggleFlag`, `createFlag`, `seedDefaultFlags`, `saveGlobalConfig` : remplacer leur garde actuelle (`resolveAdminUser` + `if (!actor) throw`) par `const actor = await requireAdminRole(ctx)`. Ne pas toucher aux fonctions de lecture (`listFeatureFlags`, `getGlobalConfig`, `auditLogs`).

---

## Vérification finale
```bash
cd ~/Downloads/test/splitzy-client
npm run build
```
Build doit passer. Puis :
```bash
git add convex/transactions.ts convex/lib.ts convex/config.ts
git commit -m "security: fix cross-tenant transactions leak + gerant privilege escalation on config (audit Fable5 #1/#2)"
git push origin main
```

Après déploiement, vérifier manuellement que `admin.splitzy.fr` → page détail d'un restaurant charge toujours ses transactions normalement (non cassé par le nouveau garde).

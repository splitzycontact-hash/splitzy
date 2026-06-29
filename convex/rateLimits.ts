import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

// Rate limiter générique — persisté en DB pour survivre aux redémarrages Convex.
// Utilisation :
//   await ctx.runMutation(internal.rateLimits.checkAndIncrement, {
//     key: `campaign:${restaurantId}`,
//     limit: 3,
//     windowMs: 3_600_000, // 1 heure
//   })
// Throw une Error si la limite est dépassée (l'action appelante échouera avec
// ce message → le front peut l'afficher directement à l'utilisateur).

export const checkAndIncrement = internalMutation({
  args: {
    key: v.string(),      // identifiant de la ressource (ex. "campaign:restaurantId")
    limit: v.number(),    // nombre max de requêtes autorisées dans la fenêtre
    windowMs: v.number(), // durée de la fenêtre en millisecondes
  },
  handler: async (ctx, { key, limit, windowMs }) => {
    const now = Date.now()
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", q => q.eq("key", key))
      .unique()

    if (!existing) {
      // Première requête pour cette clé : créer l'entrée.
      await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now })
      return
    }

    // La fenêtre a expiré → réinitialiser le compteur.
    if (now - existing.windowStart > windowMs) {
      await ctx.db.patch(existing._id, { count: 1, windowStart: now })
      return
    }

    // Dans la fenêtre active : vérifier la limite avant d'incrémenter.
    if (existing.count >= limit) {
      const resetInSec = Math.ceil((existing.windowStart + windowMs - now) / 1000)
      throw new Error(
        `Limite atteinte : max ${limit} campagnes / heure. Réessayez dans ${resetInSec}s.`
      )
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 })
  },
})

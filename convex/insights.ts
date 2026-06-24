import { query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

export const getLatestInsights = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    // SECURITY (M4) : garde cross-tenant — l'appelant doit avoir accès au restaurant.
    await requireRestaurantAccess(ctx, restaurantId)
    return ctx.db
      .query("insights")
      .withIndex("by_restaurant_date", q => q.eq("restaurantId", restaurantId))
      .order("desc")
      .first()
  },
})

export const store = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    generatedAt: v.number(),
    period: v.string(),
    insights: v.array(v.object({
      type: v.string(),
      priority: v.string(),
      title: v.string(),
      body: v.string(),
      metric: v.optional(v.string()),
      action: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("insights", args)
  },
})

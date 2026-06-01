import { query } from "./_generated/server"
import { v } from "convex/values"

export const getLatestInsights = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return ctx.db
      .query("insights")
      .withIndex("by_restaurant_date", q => q.eq("restaurantId", restaurantId))
      .order("desc")
      .first()
  },
})

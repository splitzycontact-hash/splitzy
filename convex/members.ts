import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const getTeamMembers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return await ctx.db
      .query("members")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
  },
})

export const inviteMember = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("members", {
      restaurantId: args.restaurantId,
      email: args.email,
      name: args.name,
      role: args.role,
      status: "pending",
      invitedAt: Date.now(),
    })
  },
})

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("members"),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
  },
  handler: async (ctx, { memberId, role }) => {
    await ctx.db.patch(memberId, { role })
  },
})

export const removeMember = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    await ctx.db.delete(memberId)
  },
})

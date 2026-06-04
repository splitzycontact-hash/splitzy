import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

export const getTeamMembers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
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
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])
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
    const member = await ctx.db.get(memberId)
    if (!member) throw new Error("Member not found")
    await requireRestaurantAccess(ctx, member.restaurantId, ["owner", "manager"])
    await ctx.db.patch(memberId, { role })
  },
})

export const removeMember = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId)
    if (!member) throw new Error("Member not found")
    await requireRestaurantAccess(ctx, member.restaurantId, ["owner", "manager"])
    await ctx.db.delete(memberId)
  },
})

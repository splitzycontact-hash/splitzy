export async function requireIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Non authentifié")
  return identity
}

export async function requireRestaurantAccess(
  ctx: any,
  restaurantId: any,
  allowedRoles: string[] = ["owner", "manager", "staff"],
) {
  const identity = await requireIdentity(ctx)
  const restaurant = await ctx.db.get(restaurantId)
  if (!restaurant) throw new Error("Restaurant introuvable")
  if (restaurant.clerkUserId && restaurant.clerkUserId === identity.subject) {
    return { identity, restaurant, role: "owner" as const }
  }
  const members = await ctx.db
    .query("members")
    .withIndex("by_restaurant", (q: any) => q.eq("restaurantId", restaurantId))
    .collect()
  const me = members.find((m: any) => m.clerkUserId === identity.subject && m.status === "active")
  if (!me) throw new Error("Accès refusé")
  if (!allowedRoles.includes(me.role)) throw new Error("Privilèges insuffisants")
  return { identity, restaurant, role: me.role }
}

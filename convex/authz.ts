export async function requireIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Non authentifié")
  return identity
}

const MEMBER_ROLES = ["owner", "manager", "staff"] as const
type MemberRole = typeof MEMBER_ROLES[number]

export async function requireRestaurantAccess(
  ctx: any,
  restaurantId: any,
  allowedRoles: MemberRole[] = ["owner", "manager", "staff"],
) {
  const identity = await requireIdentity(ctx)
  const restaurant = await ctx.db.get(restaurantId)
  if (!restaurant) throw new Error("Restaurant introuvable")
  if (restaurant.clerkUserId === identity.subject) {
    return { identity, restaurant, role: "owner" as const }
  }
  // Utiliser by_clerkUserId au lieu de scan complet by_restaurant
  const me = await ctx.db
    .query("members")
    .withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
    .filter((q: any) => q.eq(q.field("restaurantId"), restaurantId))
    .first()
  if (!me || me.status !== "active") throw new Error("Accès refusé")
  if (!allowedRoles.includes(me.role)) throw new Error("Privilèges insuffisants")
  return { identity, restaurant, role: me.role as "owner" | "manager" | "staff" }
}

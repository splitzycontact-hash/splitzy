export const ADMIN_EMAILS = ["splitzy.contact@gmail.com"];

const ADMIN_ROLES = ["super_admin", "admin_support", "viewer"] as const;

export async function isAdminAccess(ctx: any, fallbackEmail?: string): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    if (identity.email && ADMIN_EMAILS.includes(identity.email)) return true;
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (user && (ADMIN_ROLES as readonly string[]).includes(user.role)) return true;
  }
  if (fallbackEmail && ADMIN_EMAILS.includes(fallbackEmail)) return true;
  return false;
}

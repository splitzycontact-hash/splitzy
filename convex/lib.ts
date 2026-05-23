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

// Resolve the acting admin's users document (for authorId / actorId fields).
// Tries the Clerk identity first, then falls back to the allowlisted email.
export async function resolveAdminUser(ctx: any, fallbackEmail?: string): Promise<any | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (user) return user;
  }
  const email = identity?.email ?? fallbackEmail;
  if (email && ADMIN_EMAILS.includes(email)) {
    const all = await ctx.db.query("users").collect();
    return all.find((u: any) => u.email === email) ?? null;
  }
  return null;
}

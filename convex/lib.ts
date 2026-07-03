export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "splitzy.contact@gmail.com")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const ADMIN_ROLES = ["super_admin", "admin_support", "viewer"] as const;

// SECURITY: l'autorisation admin se prouve UNIQUEMENT via le JWT Clerk
// (ctx.auth.getUserIdentity()). On ne fait JAMAIS confiance à un email passé en
// argument par le client : sinon un appelant anonyme usurpe un admin en envoyant
// l'email allowlisté à une fonction Convex (toutes publiques). Le 2e param est
// conservé pour compat de signature avec les appelants existants mais IGNORÉ.
// Prérequis : l'app admin doit envoyer un vrai JWT (template Clerk "convex"),
// sinon identity = null et l'accès est refusé (fail-closed, voulu).
export async function isAdminAccess(ctx: any, _ignoredClientEmail?: string): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  if (identity.email && ADMIN_EMAILS.includes(identity.email)) return true;
  const user = await ctx.db.query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .unique();
  return !!(user && (ADMIN_ROLES as readonly string[]).includes(user.role));
}

// Resolve the acting admin's users document (for authorId / actorId fields).
// Identité Clerk réelle exclusivement — aucun fallback sur un email client.
export async function resolveAdminUser(ctx: any, _ignoredClientEmail?: string): Promise<any | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (user) return user;
  // Identité réelle dont l'email est allowlisté mais pas encore de doc users :
  // résoudre par email (le doc est créé au login via users.ensureSelfAdmin).
  if (identity.email && ADMIN_EMAILS.includes(identity.email)) {
    const all = await ctx.db.query("users").collect();
    return all.find((u: any) => u.email === identity.email) ?? null;
  }
  return null;
}

// Nouveau : renvoie l'acteur SEULEMENT s'il a un rôle admin (super_admin/admin_support).
// Contrairement à resolveAdminUser (vérité = présence), celle-ci vérifie le rôle.
export async function requireAdminRole(ctx: any) {
  const actor = await resolveAdminUser(ctx);
  if (!actor || !["super_admin", "admin_support"].includes(actor.role)) {
    throw new Error("Accès admin requis");
  }
  return actor;
}

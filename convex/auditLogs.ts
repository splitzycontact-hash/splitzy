import { v } from "convex/values";
import { query } from "./_generated/server";

// Audit logs are insert-only — no patch/delete handlers (immutable by design)

export const list = query({
  args: {
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user || !["super_admin", "admin_support", "viewer"].includes(user.role)) return [];

    if (args.resourceType && args.resourceId) {
      return ctx.db.query("auditLogs")
        .withIndex("by_resource", q =>
          q.eq("resourceType", args.resourceType!).eq("resourceId", args.resourceId!)
        )
        .order("desc")
        .take(args.limit ?? 100);
    }

    return ctx.db.query("auditLogs")
      .order("desc")
      .take(args.limit ?? 200);
  },
});

import { v } from "convex/values";
import { query } from "./_generated/server";
import { isAdminAccess } from "./lib";

// Audit logs are insert-only — no patch/delete handlers (immutable by design)

export const list = query({
  args: {
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    limit: v.optional(v.number()),
    authEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];

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

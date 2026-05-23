import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminAccess, resolveAdminUser } from "./lib";

const ADMIN_ROLES = ["super_admin", "admin_support", "viewer"];
const PROTECTED_EMAIL = "splitzy.contact@gmail.com";

export const listMembers = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => ADMIN_ROLES.includes(u.role))
      .map((u) => ({
        _id: u._id,
        email: u.email,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        avatarUrl: u.avatarUrl ?? null,
        role: u.role,
        status: u.clerkUserId.startsWith("pending_") ? "pending" : "active",
        protected: u.email === PROTECTED_EMAIL,
        _creationTime: u._creationTime,
      }));
  },
});

export const inviteMember = mutation({
  args: {
    authEmail: v.optional(v.string()),
    email: v.string(),
    role: v.union(
      v.literal("admin_support"),
      v.literal("viewer"),
      v.literal("super_admin")
    ),
  },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor || actor.role !== "super_admin") {
      throw new ConvexError("Seul un super_admin peut inviter des membres");
    }
    const all = await ctx.db.query("users").collect();
    if (all.some((u) => u.email === args.email)) {
      throw new ConvexError("Un utilisateur avec cet email existe déjà");
    }
    const userId = await ctx.db.insert("users", {
      clerkUserId: "pending_" + args.email,
      email: args.email,
      role: args.role,
    });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      actorLabel: actor.email,
      action: "team.member_invited",
      resourceType: "user",
      resourceId: userId,
      diff: { email: args.email, role: args.role },
    });
    return userId;
  },
});

export const updateRole = mutation({
  args: {
    authEmail: v.optional(v.string()),
    userId: v.id("users"),
    newRole: v.union(
      v.literal("super_admin"),
      v.literal("admin_support"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor || actor.role !== "super_admin") {
      throw new ConvexError("Seul un super_admin peut changer les rôles");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("Utilisateur introuvable");
    if (target.email === PROTECTED_EMAIL && args.newRole !== "super_admin") {
      throw new ConvexError("Impossible de rétrograder le super admin principal");
    }
    await ctx.db.patch(args.userId, { role: args.newRole });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      actorLabel: actor.email,
      action: "team.role_changed",
      resourceType: "user",
      resourceId: args.userId,
      diff: { from: target.role, to: args.newRole },
    });
  },
});

export const deleteMember = mutation({
  args: { authEmail: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor || actor.role !== "super_admin") {
      throw new ConvexError("Seul un super_admin peut supprimer des membres");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("Utilisateur introuvable");
    if (target.email === PROTECTED_EMAIL) {
      throw new ConvexError("Impossible de supprimer le super admin principal");
    }
    await ctx.db.delete(args.userId);
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      actorLabel: actor.email,
      action: "team.member_removed",
      resourceType: "user",
      resourceId: args.userId,
      diff: { email: target.email, role: target.role },
    });
  },
});

export const recentActivity = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const logs = await ctx.db.query("auditLogs").order("desc").take(20);
    return logs.map((l) => ({
      _id: l._id,
      _creationTime: l._creationTime,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId ?? null,
      actorLabel: l.actorLabel ?? null,
      actorId: l.actorId ?? null,
      isImpersonation: l.isImpersonation ?? false,
    }));
  },
});

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminAccess, resolveAdminUser } from "./lib";

async function requireEditor(ctx: any, authEmail?: string) {
  const user = await resolveAdminUser(ctx, authEmail);
  if (!user || user.role === "viewer") throw new ConvexError("Insufficient permissions");
  return user;
}

export const list = query({
  args: { restaurantId: v.id("restaurants"), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    return ctx.db.query("restaurantNotes")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: { restaurantId: v.id("restaurants"), body: v.string(), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx, args.authEmail);
    return ctx.db.insert("restaurantNotes", {
      restaurantId: args.restaurantId,
      authorId: user._id,
      body: args.body,
    });
  },
});

export const remove = mutation({
  args: { noteId: v.id("restaurantNotes"), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx, args.authEmail);
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Note not found");
    if (note.authorId !== user._id && !["super_admin"].includes(user.role)) {
      throw new ConvexError("Can only delete your own notes");
    }
    await ctx.db.delete(args.noteId);
  },
});

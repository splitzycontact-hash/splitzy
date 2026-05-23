import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireEditor(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  const user = await ctx.db.query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user || user.role === "viewer") throw new ConvexError("Insufficient permissions");
  return user;
}

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db.query("restaurantNotes")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: { restaurantId: v.id("restaurants"), body: v.string() },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    return ctx.db.insert("restaurantNotes", {
      restaurantId: args.restaurantId,
      authorId: user._id,
      body: args.body,
    });
  },
});

export const remove = mutation({
  args: { noteId: v.id("restaurantNotes") },
  handler: async (ctx, args) => {
    const user = await requireEditor(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Note not found");
    if (note.authorId !== user._id && !["super_admin"].includes(user.role)) {
      throw new ConvexError("Can only delete your own notes");
    }
    await ctx.db.delete(args.noteId);
  },
});

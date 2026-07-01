import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminAccess, resolveAdminUser } from "./lib";

// restaurantNotes only has { restaurantId, authorId, body }. We fold the
// communication type + subject into the first line of the body so we avoid a
// prod schema change: `[type] subject\n<content>`.
function parseNoteBody(body: string): { type: string; subject: string; content: string } {
  const nl = body.indexOf("\n");
  const firstLine = nl === -1 ? body : body.slice(0, nl);
  const rest = nl === -1 ? "" : body.slice(nl + 1);
  const m = firstLine.match(/^\[(note|email|push)\]\s?(.*)$/);
  if (m) return { type: m[1] ?? "note", subject: m[2] ?? "", content: rest };
  return { type: "note", subject: "", content: body };
}

export const listNotes = query({
  args: {
    authEmail: v.optional(v.string()),
    restaurantId: v.optional(v.id("restaurants")),
  },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const notes = args.restaurantId
      ? await ctx.db
          .query("restaurantNotes")
          .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId!))
          .order("desc")
          .take(100)
      : await ctx.db.query("restaurantNotes").order("desc").take(100);

    return Promise.all(
      notes.map(async (n) => {
        const [restaurant, author] = await Promise.all([
          ctx.db.get(n.restaurantId),
          ctx.db.get(n.authorId),
        ]);
        const parsed = parseNoteBody(n.body);
        return {
          _id: n._id,
          _creationTime: n._creationTime,
          restaurantId: n.restaurantId,
          restaurantName: restaurant?.name ?? "—",
          authorEmail: author?.email ?? "—",
          type: parsed.type,
          subject: parsed.subject,
          content: parsed.content,
        };
      })
    );
  },
});

export const sendNote = mutation({
  args: {
    authEmail: v.optional(v.string()),
    restaurantIds: v.array(v.id("restaurants")),
    subject: v.string(),
    content: v.string(),
    type: v.union(v.literal("note"), v.literal("email"), v.literal("push")),
  },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor) throw new ConvexError("Not authorized");
    if (args.restaurantIds.length === 0) {
      throw new ConvexError("Aucun destinataire sélectionné");
    }
    const body = `[${args.type}] ${args.subject}\n${args.content}`;
    for (const restaurantId of args.restaurantIds) {
      await ctx.db.insert("restaurantNotes", {
        restaurantId,
        authorId: actor._id,
        body,
      });
    }
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      actorLabel: actor.email,
      action: "communication.sent",
      resourceType: "communication",
      diff: {
        type: args.type,
        subject: args.subject,
        recipientCount: args.restaurantIds.length,
      },
    });
    return { count: args.restaurantIds.length };
  },
});

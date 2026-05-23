import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminAccess, resolveAdminUser } from "./lib";

const DEFAULT_FLAGS = [
  { key: "TIPS_ENABLED", description: "Activer/désactiver les pourboires", on: true },
  { key: "FEEDBACK_ENABLED", description: "Activer/désactiver les feedbacks", on: true },
  { key: "PARTIAL_PAYMENT", description: "Paiement partiel par personne", on: true },
  { key: "BARS_MODE", description: "Mode ardoise numérique pour bars", on: false },
  { key: "POS_SYNC", description: "Synchronisation POS (Lightspeed, Zelty)", on: false },
  { key: "MAINTENANCE_MODE", description: "Mode maintenance — bloque tous les clients", on: false },
];

// Global params are persisted as featureFlags with a CONFIG_ prefix, storing the
// numeric value in rolloutValue.percent — avoids a prod schema change.
const CONFIG_KEYS = {
  archiveDelayMin: "CONFIG_ARCHIVE_DELAY_MIN",
  maxTables: "CONFIG_MAX_TABLES",
};

export const listFeatureFlags = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const flags = await ctx.db.query("featureFlags").collect();
    return flags.filter((f) => !f.key.startsWith("CONFIG_"));
  },
});

export const toggleFlag = mutation({
  args: {
    authEmail: v.optional(v.string()),
    flagId: v.id("featureFlags"),
    value: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor) throw new ConvexError("Not authorized");
    const flag = await ctx.db.get(args.flagId);
    if (!flag) throw new ConvexError("Flag introuvable");
    await ctx.db.patch(args.flagId, { status: args.value ? "active" : "disabled" });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      actorLabel: actor.email,
      action: "featureFlag.toggled",
      resourceType: "featureFlag",
      resourceId: args.flagId,
      diff: { key: flag.key, value: args.value },
    });
  },
});

export const createFlag = mutation({
  args: {
    authEmail: v.optional(v.string()),
    key: v.string(),
    value: v.boolean(),
    description: v.string(),
    enabledForAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor) throw new ConvexError("Not authorized");
    const key = args.key.trim();
    if (!key) throw new ConvexError("La clé est obligatoire");
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) throw new ConvexError(`Le flag "${key}" existe déjà`);
    const flagId = await ctx.db.insert("featureFlags", {
      key,
      description: args.description,
      status: args.value ? "active" : "disabled",
      rolloutType: "boolean",
    });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      actorLabel: actor.email,
      action: "featureFlag.created",
      resourceType: "featureFlag",
      resourceId: flagId,
      diff: { key, value: args.value },
    });
    return flagId;
  },
});

export const seedDefaultFlags = mutation({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor) throw new ConvexError("Not authorized");
    const existing = await ctx.db.query("featureFlags").collect();
    const existingKeys = new Set(existing.map((f) => f.key));
    let created = 0;
    for (const f of DEFAULT_FLAGS) {
      if (existingKeys.has(f.key)) continue;
      await ctx.db.insert("featureFlags", {
        key: f.key,
        description: f.description,
        status: f.on ? "active" : "disabled",
        rolloutType: "boolean",
      });
      created++;
    }
    if (created > 0) {
      await ctx.db.insert("auditLogs", {
        actorId: actor._id,
        actorLabel: actor.email,
        action: "featureFlag.seeded",
        resourceType: "featureFlag",
        diff: { created },
      });
    }
    return { created };
  },
});

export const auditLogs = query({
  args: { authEmail: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const logs = await ctx.db.query("auditLogs").order("desc").take(args.limit ?? 200);
    return logs.map((l) => ({
      _id: l._id,
      _creationTime: l._creationTime,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId ?? null,
      actorLabel: l.actorLabel ?? null,
      actorId: l.actorId ?? null,
      isImpersonation: l.isImpersonation ?? false,
      diff: l.diff ?? null,
    }));
  },
});

export const getGlobalConfig = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return null;
    const flags = await ctx.db.query("featureFlags").collect();
    const read = (key: string, def: number) => {
      const f = flags.find((x) => x.key === key);
      return f?.rolloutValue?.percent ?? def;
    };
    return {
      archiveDelayMin: read(CONFIG_KEYS.archiveDelayMin, 30),
      maxTables: read(CONFIG_KEYS.maxTables, 50),
    };
  },
});

export const saveGlobalConfig = mutation({
  args: {
    authEmail: v.optional(v.string()),
    archiveDelayMin: v.number(),
    maxTables: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await resolveAdminUser(ctx, args.authEmail);
    if (!actor) throw new ConvexError("Not authorized");
    const upsert = async (key: string, value: number, description: string) => {
      const existing = await ctx.db
        .query("featureFlags")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { rolloutValue: { percent: value } });
      } else {
        await ctx.db.insert("featureFlags", {
          key,
          description,
          status: "active",
          rolloutType: "percentage",
          rolloutValue: { percent: value },
        });
      }
    };
    await upsert(CONFIG_KEYS.archiveDelayMin, args.archiveDelayMin, "Délai avant archivage table (minutes)");
    await upsert(CONFIG_KEYS.maxTables, args.maxTables, "Nombre max de tables par restaurant");
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      actorLabel: actor.email,
      action: "config.updated",
      resourceType: "config",
      diff: { archiveDelayMin: args.archiveDelayMin, maxTables: args.maxTables },
    });
  },
});

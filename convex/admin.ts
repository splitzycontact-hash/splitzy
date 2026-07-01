import { ConvexError, v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { isAdminAccess } from "./lib";

// ── Impersonation token : JWT-like signé HMAC-SHA256 ─────────────────────────
// SECURITY: l'ancienne implémentation ne vérifiait JAMAIS la signature
// (atob du payload + check exp), donc n'importe qui forgeait un token et
// impersonifiait n'importe quel restaurant. On signe désormais le payload avec
// HMAC-SHA256(IMPERSONATION_JWT_SECRET) et la vérification recalcule + compare
// la signature en temps constant avant de faire confiance au payload.

function requireImpersonationSecret(): string {
  const s = process.env.IMPERSONATION_JWT_SECRET;
  if (!s || s === "dev-secret-change-in-prod" || s.length < 32) {
    throw new ConvexError("IMPERSONATION_JWT_SECRET manquant ou trop faible (>= 32 chars requis)");
  }
  return s;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToB64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToStr(b64: string): string {
  const pad = b64.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(pad)));
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToB64url(new Uint8Array(sig));
}

// Comparaison à temps constant (anti timing-attack sur la signature).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const impersonate = action({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const actor = await ctx.runQuery(api.users.getByClerkId, { clerkUserId: identity.subject });
    if (!actor || !["super_admin", "admin_support"].includes(actor.role)) {
      throw new ConvexError("Insufficient permissions");
    }

    const restaurant = await ctx.runQuery(api.restaurants.getById, { restaurantId: args.restaurantId });
    if (!restaurant) throw new ConvexError("Restaurant not found");

    await ctx.runMutation(internal.admin.logImpersonation, {
      actorId: actor._id,
      restaurantId: args.restaurantId,
    });

    const secret = requireImpersonationSecret();
    const payload = {
      impersonatingRestaurantId: args.restaurantId,
      adminUserId: actor._id,
      exp: Date.now() + 15 * 60 * 1000,
    };
    const payloadB64 = strToB64url(JSON.stringify(payload));
    const sig = await hmacSign(payloadB64, secret);
    const token = `${payloadB64}.${sig}`;

    return { token };
  },
});

// SECURITY (Vuln 8) : internalMutation — inatteignable depuis un client public.
// Avant, c'était une mutation publique acceptant actorId en argument : n'importe
// qui pouvait forger une entrée d'audit "impersonation" avec un actorId arbitraire.
// L'actorId provient désormais exclusivement de l'action impersonate (qui l'a
// résolu depuis l'identité Clerk vérifiée).
export const logImpersonation = internalMutation({
  args: {
    actorId: v.id("users"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      actorId: args.actorId,
      action: "admin.impersonation_started",
      resourceType: "restaurant",
      resourceId: args.restaurantId,
      isImpersonation: true,
    });
  },
});

export const verifyImpersonationToken = action({
  args: { token: v.string() },
  handler: async (_ctx, args): Promise<{ restaurantId: string; adminUserId: string } | null> => {
    try {
      const secret = requireImpersonationSecret();
      const [payloadB64, sig] = args.token.split(".");
      if (!payloadB64 || !sig) return null;
      // 1) Vérifier la signature AVANT de faire confiance au payload.
      const expected = await hmacSign(payloadB64, secret);
      if (!timingSafeEqual(sig, expected)) return null;
      // 2) Payload authentifié : décoder et vérifier l'expiration.
      const payload = JSON.parse(b64urlToStr(payloadB64));
      if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
      return {
        restaurantId: payload.impersonatingRestaurantId,
        adminUserId: payload.adminUserId,
      };
    } catch {
      return null;
    }
  },
});

export const kpis = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [restaurants, activeSubs, todayTxs, todayPayments, monthPayments, openBugs] = await Promise.all([
      ctx.db.query("restaurants").collect(),
      ctx.db.query("subscriptions")
        .withIndex("by_status", q => q.eq("status", "active"))
        .collect(),
      ctx.db.query("transactions")
        .filter(q => q.and(
          q.eq(q.field("status"), "succeeded"),
          q.gte(q.field("succeededAt"), today.getTime())
        ))
        .collect(),
      ctx.db.query("payments")
        .filter(q => q.and(
          q.eq(q.field("status"), "Encaissé"),
          q.gte(q.field("createdAt"), today.getTime())
        ))
        .collect(),
      ctx.db.query("payments")
        .filter(q => q.and(
          q.eq(q.field("status"), "Encaissé"),
          q.gte(q.field("createdAt"), monthStart.getTime())
        ))
        .collect(),
      ctx.db.query("bugs")
        .filter(q => q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "investigating")
        ))
        .collect(),
    ]);

    const proCount = restaurants.filter(r => r.plan === "pro").length;
    const subsBased = activeSubs.reduce((s, sub) => s + (sub.amountCents ?? 3900), 0);
    const mrr = subsBased > 0 ? subsBased : proCount * 3900;
    const statusActive = restaurants.filter(r => r.status === "active").length;
    const activeRestaurants = statusActive > 0
      ? statusActive
      : restaurants.filter(r => !r.suspended).length;
    const todayVolumeFromTx = todayTxs.reduce((s, t) => s + t.amountCents, 0);
    const todayVolumeFromPayments = todayPayments.reduce((s, p) => s + p.totalCents, 0);
    const todayVolume = todayVolumeFromTx + todayVolumeFromPayments;

    const monthTxCount = (await ctx.db.query("transactions")
      .filter(q => q.and(
        q.eq(q.field("status"), "succeeded"),
        q.gte(q.field("succeededAt"), monthStart.getTime())
      ))
      .collect()).length + monthPayments.length;

    return {
      mrr,
      arr: mrr * 12,
      todayVolume,
      activeRestaurants,
      monthTxCount,
      openBugs: openBugs.length,
    };
  },
});

export const alerts = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return null;

    const [deadLetters, kycBlocked, openDisputes, criticalBugs] = await Promise.all([
      ctx.db.query("stripeWebhookEvents")
        .filter(q => q.eq(q.field("status"), "dead_letter"))
        .collect(),
      ctx.db.query("restaurants")
        .filter(q => q.or(
          q.eq(q.field("kycStatus"), "restricted"),
          q.eq(q.field("kycStatus"), "disabled")
        ))
        .collect(),
      ctx.db.query("disputes").collect(),
      ctx.db.query("bugs")
        .filter(q => q.and(
          q.eq(q.field("severity"), "critical"),
          q.eq(q.field("status"), "open")
        ))
        .collect(),
    ]);

    return { deadLetters, kycBlocked, openDisputes, criticalBugs };
  },
});

export const newTicketsCount = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return 0;
    const tickets = await ctx.db.query("tickets")
      .withIndex("by_status", q => q.eq("status", "new"))
      .collect();
    return tickets.length;
  },
});

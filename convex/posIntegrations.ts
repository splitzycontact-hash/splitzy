import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { internal, api } from "./_generated/api"
import { requireRestaurantAccess, requireIdentity } from "./authz"

export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner"])
    const rows = await ctx.db
      .query("posIntegrations")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    return rows.map(({ apiKey, extraKey, ...safe }) => ({ ...safe, hasApiKey: !!apiKey }))
  },
})

export const getByProvider = query({
  args: { restaurantId: v.id("restaurants"), provider: v.string() },
  handler: async (ctx, { restaurantId, provider }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner"])
    const row = await ctx.db
      .query("posIntegrations")
      .withIndex("by_restaurant_provider", q => q.eq("restaurantId", restaurantId).eq("provider", provider))
      .unique()
    if (!row) return null
    const { apiKey, extraKey, ...safe } = row
    return { ...safe, hasApiKey: !!apiKey }
  },
})

export const upsert = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    provider: v.string(),
    apiKey: v.string(),
    locationId: v.optional(v.string()),
    extraKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner"])
    const existing = await ctx.db
      .query("posIntegrations")
      .withIndex("by_restaurant_provider", q => q.eq("restaurantId", args.restaurantId).eq("provider", args.provider))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        locationId: args.locationId,
        extraKey: args.extraKey,
        status: "pending",
        lastError: undefined,
      })
      return existing._id
    }
    return ctx.db.insert("posIntegrations", {
      restaurantId: args.restaurantId,
      provider: args.provider,
      apiKey: args.apiKey,
      locationId: args.locationId,
      extraKey: args.extraKey,
      status: "pending",
    })
  },
})

export const remove = mutation({
  args: { restaurantId: v.id("restaurants"), provider: v.string() },
  handler: async (ctx, { restaurantId, provider }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner"])
    const existing = await ctx.db
      .query("posIntegrations")
      .withIndex("by_restaurant_provider", q => q.eq("restaurantId", restaurantId).eq("provider", provider))
      .unique()
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const setStatus = internalMutation({
  args: {
    integrationId: v.id("posIntegrations"),
    status: v.union(v.literal("active"), v.literal("error"), v.literal("pending")),
    lastError: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    syncedTableCount: v.optional(v.number()),
  },
  handler: async (ctx, { integrationId, status, lastError, lastSyncAt, syncedTableCount }) => {
    await ctx.db.patch(integrationId, { status, lastError, lastSyncAt, syncedTableCount })
  },
})

export const updateTableFromPOS = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    tableNumber: v.number(),
    amountCents: v.number(),
  },
  handler: async (ctx, { restaurantId, tableNumber, amountCents }) => {
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const table = tables.find(t => t.number === tableNumber)
    if (table) {
      const patch: Record<string, unknown> = {
        amountCents,
        status: amountCents > 0 ? "dining" : "free",
      }
      // Table libérée côté caisse : purge le compteur de convives, la date de
      // sitting et le déjà-payé du service précédent — symétrique à resetToFree.
      // Sans la purge de paidCents, une nouvelle installation verrait son
      // "restant dû" (payments.create) plafonné par les paiements du service
      // précédent. La branche amountCents > 0 ne touche à rien (nettoyage déjà
      // fait au passage free).
      if (amountCents <= 0) {
        patch.guests = undefined
        patch.sittingStartedAt = undefined
        patch.paidCents = undefined
        patch.paidTipCents = undefined
      }
      await ctx.db.patch(table._id, patch)
    }
  },
})

// ── Sync action ────────────────────────────────────────────────────────────
export const syncTables = action({
  args: { restaurantId: v.id("restaurants"), provider: v.string() },
  handler: async (ctx, { restaurantId, provider }) => {
    await requireIdentity(ctx)
    const ownRestaurant = await ctx.runQuery(api.restaurants.getByClerkId, {})
    if (!ownRestaurant || ownRestaurant._id !== restaurantId) throw new Error("Accès refusé")

    const integration = await ctx.runQuery(internal.posIntegrations.getByProviderInternal, {
      restaurantId,
      provider,
    })
    if (!integration) throw new Error("Integration not found")

    try {
      let tableUpdates: { tableNumber: number; amountCents: number }[] = []

      if (provider === "square") {
        const squareToken = (process.env.SQUARE_ACCESS_TOKEN || integration.apiKey).trim()
        const squareLocationId = (process.env.SQUARE_LOCATION_ID || integration.locationId || "").trim()
        tableUpdates = await syncSquare(squareToken, squareLocationId)
      } else if (provider === "sumup") {
        tableUpdates = await syncSumUp(integration.apiKey)
      } else if (provider === "lightspeed") {
        tableUpdates = await syncLightspeed(integration.apiKey, integration.locationId ?? "")
      } else if (provider === "zelty") {
        tableUpdates = await syncZelty(integration.apiKey)
      } else if (provider === "tiller") {
        tableUpdates = await syncTiller(integration.apiKey, integration.extraKey ?? "")
      } else if (provider === "laddition") {
        tableUpdates = await syncLAddition(integration.apiKey, integration.extraKey ?? "")
      }

      for (const { tableNumber, amountCents } of tableUpdates) {
        await ctx.runMutation(internal.posIntegrations.updateTableFromPOS, {
          restaurantId,
          tableNumber,
          amountCents,
        })
      }

      await ctx.runMutation(internal.posIntegrations.setStatus, {
        integrationId: integration._id,
        status: "active",
        lastSyncAt: Date.now(),
        syncedTableCount: tableUpdates.length,
        lastError: undefined,
      })

      return { success: true, updated: tableUpdates.length }
    } catch (err: any) {
      await ctx.runMutation(internal.posIntegrations.setStatus, {
        integrationId: integration._id,
        status: "error",
        lastError: err?.message ?? "Erreur inconnue",
      })
      throw err
    }
  },
})

// Internal query used by the action (actions can't call public queries directly in Convex)
export const getByProviderInternal = internalQuery({
  args: { restaurantId: v.id("restaurants"), provider: v.string() },
  handler: async (ctx, { restaurantId, provider }) => {
    return ctx.db
      .query("posIntegrations")
      .withIndex("by_restaurant_provider", q => q.eq("restaurantId", restaurantId).eq("provider", provider))
      .unique()
  },
})

// ── POS-specific sync handlers ─────────────────────────────────────────────

async function syncSquare(apiKey: string, locationId: string) {
  const res = await fetch("https://connect.squareup.com/v2/orders/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      location_ids: locationId ? [locationId] : [],
      query: { filter: { state_filter: { states: ["OPEN"] } } },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.errors?.[0]?.detail ?? `Square API error ${res.status}`)
  }
  const data = await res.json()
  const orders: any[] = data.orders ?? []
  return orders
    .map((order: any) => ({
      tableNumber: parseInt(order.reference_id ?? "0", 10),
      amountCents: order.net_amounts?.total_money?.amount ?? 0,
    }))
    .filter(r => r.tableNumber > 0)
}

async function syncSumUp(apiKey: string) {
  const res = await fetch("https://api.sumup.com/v0.1/me/transactions/history?statuses=SUCCESSFUL&limit=20", {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    throw new Error(`SumUp API error ${res.status}`)
  }
  const data = await res.json()
  const items: any[] = data.items ?? []
  return items
    .map((tx: any) => ({
      tableNumber: parseInt(tx.client_transaction_id ?? "0", 10),
      amountCents: Math.round((tx.amount ?? 0) * 100),
    }))
    .filter(r => r.tableNumber > 0)
}

async function syncLightspeed(apiKey: string, locationId: string) {
  const res = await fetch(`https://api.lightspeedapp.com/API/V3/Account/${locationId}/Order.json?completed=false`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) throw new Error(`Lightspeed API error ${res.status}`)
  const data = await res.json()
  const orders: any[] = data.OrderList?.Order ? [].concat(data.OrderList.Order) : []
  return orders
    .map((order: any) => ({
      tableNumber: parseInt(order.Note ?? order.tableNumber ?? "0", 10),
      amountCents: Math.round(parseFloat(order.calcTotal ?? "0") * 100),
    }))
    .filter(r => r.tableNumber > 0)
}

async function syncZelty(apiKey: string) {
  const res = await fetch("https://backend.zelty.fr/api/v7/orders?state=opened", {
    headers: { "X-Zelty-Token": apiKey },
  })
  if (!res.ok) throw new Error(`Zelty API error ${res.status}`)
  const data = await res.json()
  const orders: any[] = data.orders ?? []
  return orders
    .map((order: any) => ({
      tableNumber: parseInt(order.table_number ?? order.table?.number ?? "0", 10),
      amountCents: Math.round((order.total_price ?? 0) * 100),
    }))
    .filter(r => r.tableNumber > 0)
}

async function syncTiller(apiKey: string, restaurantId: string) {
  const res = await fetch(`https://api.tillersystems.com/api/v2/restaurants/${restaurantId}/bills?status=open`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) throw new Error(`Tiller API error ${res.status}`)
  const data = await res.json()
  const bills: any[] = data.bills ?? data ?? []
  return bills
    .map((bill: any) => ({
      tableNumber: parseInt(bill.table_label ?? bill.table_number ?? "0", 10),
      amountCents: Math.round((bill.total ?? 0) * 100),
    }))
    .filter(r => r.tableNumber > 0)
}

async function syncLAddition(apiKey: string, secret: string) {
  const res = await fetch("https://api.laddition.com/v1/tables/bills", {
    headers: {
      "X-Api-Key": apiKey,
      "X-Api-Secret": secret,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) throw new Error(`L'Addition API error ${res.status}`)
  const data = await res.json()
  const bills: any[] = data.bills ?? []
  return bills
    .map((bill: any) => ({
      tableNumber: parseInt(bill.table_number ?? "0", 10),
      amountCents: Math.round((bill.amount ?? 0) * 100),
    }))
    .filter(r => r.tableNumber > 0)
}

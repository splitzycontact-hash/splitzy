import { query, mutation, action } from "./_generated/server"
import { v } from "convex/values"
import { api } from "./_generated/api"

export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
  },
})

export const updateItem = mutation({
  args: {
    id: v.id("menuItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    priceCents: v.optional(v.number()),
    emoji: v.optional(v.string()),
    description: v.optional(v.string()),
    isAvailable: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    allergenes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch)
  },
})

export const deleteItem = mutation({
  args: { id: v.id("menuItems") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})

export const addItem = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    category: v.string(),
    priceCents: v.number(),
    emoji: v.string(),
    description: v.optional(v.string()),
    isAvailable: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    allergenes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("menuItems", args)
  },
})

export const replaceAll = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    items: v.array(v.object({
      name: v.string(),
      category: v.string(),
      priceCents: v.number(),
      emoji: v.string(),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { restaurantId, items }) => {
    const existing = await ctx.db
      .query("menuItems")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    for (const item of existing) {
      await ctx.db.delete(item._id)
    }
    for (const item of items) {
      await ctx.db.insert("menuItems", { restaurantId, ...item })
    }
  },
})

export const syncFromSquare = action({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    // Always prefer env var; fall back to DB token
    const integration = await ctx.runQuery(api.posIntegrations.getByProvider, {
      restaurantId,
      provider: "square",
    })
    const dbToken = integration?.apiKey
    const accessToken = (process.env.SQUARE_ACCESS_TOKEN || dbToken)?.trim()
    console.log("Catalog sync - Token:", accessToken?.slice(0, 15), "| URL: production")
    if (!accessToken) throw new Error("Square non connecté")

    const res = await fetch(
      "https://connect.squareup.com/v2/catalog/list?types=ITEM,CATEGORY",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2024-01-18",
        },
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.errors?.[0]?.detail ?? `Square API error ${res.status}`)
    }

    const data = await res.json()
    const objects: any[] = data.objects ?? []
    console.log("Raw objects count:", objects.length, "| Types:", [...new Set(objects.map((o: any) => o.type))].join(","))

    // Build category id → name map from CATEGORY objects
    const categoryNameById: Record<string, string> = {}
    objects
      .filter((o: any) => o.type === "CATEGORY")
      .forEach((o: any) => {
        categoryNameById[o.id] = o.category_data?.name ?? ""
      })

    function mapCategory(catName: string): string {
      const n = catName.toLowerCase()
      if (n.includes("entr") || n.includes("start") || n.includes("apeti")) return "entrees"
      if (n.includes("dessert") || n.includes("sucr") || n.includes("patiss")) return "desserts"
      if (n.includes("boisso") || n.includes("drink") || n.includes("bever") ||
          n.includes("cocktail") || n.includes("vin") || n.includes("wine") ||
          n.includes("beer") || n.includes("biere") || n.includes("café") || n.includes("cafe")) return "boissons"
      return "plats"
    }

    const EMOJI: Record<string, string> = {
      entrees: "🥗",
      plats: "🍽",
      desserts: "🍮",
      boissons: "🍷",
    }

    const items: { name: string; category: string; priceCents: number; emoji: string; description?: string }[] = []

    objects
      .filter((o: any) => o.type === "ITEM")
      .forEach((o: any) => {
        const d = o.item_data ?? {}
        const name: string = d.name ?? ""
        if (!name) return
        const description: string | undefined = d.description || undefined
        // Square v2 uses categories array in newer API versions
        const catId: string = d.category_id ?? d.categories?.[0]?.id ?? d.reporting_category?.id ?? ""
        const category = mapCategory(categoryNameById[catId] ?? "")
        const emoji = EMOJI[category]
        const variations: any[] = d.variations ?? []
        const priceCents: number = variations[0]?.item_variation_data?.price_money?.amount ?? 0
        console.log("Item:", name, "| Price cents:", priceCents, "| raw variation:", JSON.stringify(variations[0]?.item_variation_data ?? null))
        items.push({ name, category, priceCents, emoji, description })
      })

    console.log("Items found:", items.length)
    await ctx.runMutation(api.menuItems.replaceAll, { restaurantId, items })
    return { count: items.length }
  },
})

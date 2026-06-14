import { query } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"
import type { Id } from "./_generated/dataModel"

// Une ligne de planning = une convocation enrichie du contact extra (firstName /
// lastName / skills). Lecture seule, owner/manager. Le détail UI est en partie 2 ;
// partie 1 alimente surtout les cartes de résumé + la structure du tableau.
type PlanningRow = {
  convocationId: Id<"extraConvocations">
  extraId: Id<"extras">
  firstName: string
  lastName: string
  skills: string[]
  shiftDate: string
  shiftStart: string
  shiftEnd: string
  response: "pending" | "accepted" | "declined" | null
  respondedAt: number | null
  sentAt: number
  subject: string
}

// Convocations d'un restaurant dont shiftDate ∈ [dateFrom, dateTo]. La comparaison
// lexicographique sur "YYYY-MM-DD" équivaut à l'ordre chronologique. Jointure extras
// pour nom + skills. Tri shiftDate ASC puis sentAt ASC. Les convocations sans
// shiftDate sont ignorées (pas de place dans un planning daté).
async function collectRows(
  ctx: QueryCtx,
  restaurantId: Id<"restaurants">,
  dateFrom: string,
  dateTo: string,
): Promise<PlanningRow[]> {
  const convocations = await ctx.db
    .query("extraConvocations")
    .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
    .collect()
  const inRange = convocations.filter(
    c => c.shiftDate && c.shiftDate >= dateFrom && c.shiftDate <= dateTo,
  )
  const rows = await Promise.all(
    inRange.map(async c => {
      const extra = await ctx.db.get(c.extraId)
      return {
        convocationId: c._id,
        extraId: c.extraId,
        firstName: extra?.firstName ?? "",
        lastName: extra?.lastName ?? "",
        skills: extra?.skills ?? [],
        shiftDate: c.shiftDate ?? "",
        shiftStart: c.shiftStart ?? "",
        shiftEnd: c.shiftEnd ?? "",
        response: c.response ?? null,
        respondedAt: c.respondedAt ?? null,
        sentAt: c.sentAt,
        subject: c.subject,
      }
    }),
  )
  rows.sort((a, b) => a.shiftDate.localeCompare(b.shiftDate) || a.sentAt - b.sentAt)
  return rows
}

// "YYYY-MM-DD" à J+offset (UTC — suffisant pour une fenêtre « à venir » de 30 jours).
function isoAtOffset(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

export const getByPeriod = query({
  args: {
    restaurantId: v.id("restaurants"),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { restaurantId, dateFrom, dateTo }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    return await collectRows(ctx, restaurantId, dateFrom, dateTo)
  },
})

// Vue par défaut à l'ouverture de la page : J+0 → J+30 (aucun paramètre de date).
export const getUpcoming = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    return await collectRows(ctx, restaurantId, isoAtOffset(0), isoAtOffset(30))
  },
})

import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Régénère les 3 insights thématiques de chaque restaurant chaque nuit à 3h UTC.
crons.daily(
  "generate insights",
  { hourUTC: 3, minuteUTC: 0 },
  internal.actions.generateInsights.generateInsightsForAllRestaurants,
)

export default crons

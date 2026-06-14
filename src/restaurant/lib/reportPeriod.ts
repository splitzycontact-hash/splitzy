// Période sélectionnable pour le rapport imprimable (PrintReport).
// Pas de lib date externe — Date natif (le projet n'a ni dayjs ni date-fns).

export type PeriodKind =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'

export interface ReportRange {
  from: number // inclusif — début du 1er jour (ms epoch)
  to: number // exclusif — début du jour suivant le dernier jour (ms epoch)
  kind: PeriodKind
}

const DAY = 86400000

function startOfDay(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

/** Nombre de jours pleins couverts par la plage. */
export function rangeDays(range: ReportRange): number {
  return Math.round((range.to - range.from) / DAY)
}

/** Construit une plage à partir d'un raccourci, relative à `now`. */
export function buildRange(kind: Exclude<PeriodKind, 'custom'>, now: Date = new Date()): ReportRange {
  const todayStart = startOfDay(now)
  const tomorrow = todayStart + DAY
  switch (kind) {
    case 'today':
      return { from: todayStart, to: tomorrow, kind }
    case 'yesterday':
      return { from: todayStart - DAY, to: todayStart, kind }
    case 'last7':
      return { from: todayStart - 6 * DAY, to: tomorrow, kind }
    case 'last30':
      return { from: todayStart - 29 * DAY, to: tomorrow, kind }
    case 'thisMonth':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: tomorrow, kind }
    case 'lastMonth':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
        to: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        kind,
      }
  }
}

/** Construit une plage personnalisée depuis deux valeurs `<input type="date">` (YYYY-MM-DD). */
export function buildCustomRange(fromYmd: string, toYmd: string): ReportRange | null {
  if (!fromYmd || !toYmd) return null
  const f = new Date(`${fromYmd}T00:00:00`)
  const t = new Date(`${toYmd}T00:00:00`)
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return null
  let fromMs = startOfDay(f)
  let toMs = startOfDay(t) + DAY // borne haute inclusive sur le jour de fin
  if (toMs <= fromMs) {
    // dates inversées → on échange
    fromMs = startOfDay(t)
    toMs = startOfDay(f) + DAY
  }
  return { from: fromMs, to: toMs, kind: 'custom' }
}

/** Vrai si la plage couvre exactement un mois calendaire complet. */
function isFullMonth(range: ReportRange): boolean {
  const f = new Date(range.from)
  if (f.getDate() !== 1) return false
  const nextMonth = new Date(f.getFullYear(), f.getMonth() + 1, 1).getTime()
  return range.to === nextMonth
}

const fmtDmy = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Titre d'entête du PDF (majuscules), cf. Étape 3 du goal. */
export function reportHeaderTitle(range: ReportRange): string {
  const days = rangeDays(range)
  const from = new Date(range.from)
  const lastDay = new Date(range.to - DAY)
  if (days <= 1) {
    return `RAPPORT DU ${from.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}`
  }
  if (isFullMonth(range)) {
    return `RAPPORT DE ${from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}`
  }
  return `RAPPORT DU ${fmtDmy(from)} AU ${fmtDmy(lastDay)}`
}

/** Libellé de période lisible (casse normale) pour le corps du rapport. */
export function reportPeriodLabel(range: ReportRange): string {
  const days = rangeDays(range)
  const from = new Date(range.from)
  const lastDay = new Date(range.to - DAY)
  if (days <= 1) return `Rapport du ${fmtDmy(from)}`
  if (isFullMonth(range)) {
    return `Rapport de ${from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
  }
  return `Rapport du ${fmtDmy(from)} au ${fmtDmy(lastDay)}`
}

export interface PeriodBucket {
  label: string
  sublabel: string
  from: number
  to: number
}

/**
 * Découpe la plage pour le tableau de revenus :
 * - 1 jour → [] (pas de tableau)
 * - ≤ 31 jours → une ligne par jour
 * - > 31 jours → agrégation hebdomadaire (lisibilité)
 */
export function buildBuckets(range: ReportRange): PeriodBucket[] {
  const days = rangeDays(range)
  if (days <= 1) return []

  if (days <= 31) {
    const out: PeriodBucket[] = []
    for (let s = range.from; s < range.to; s += DAY) {
      const d = new Date(s)
      out.push({
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        sublabel: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        from: s,
        to: s + DAY,
      })
    }
    return out
  }

  const out: PeriodBucket[] = []
  for (let s = range.from; s < range.to; s += 7 * DAY) {
    const wEnd = Math.min(s + 7 * DAY, range.to)
    const d = new Date(s)
    const dEnd = new Date(wEnd - DAY)
    out.push({
      label: `Sem. ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
      sublabel: `→ ${dEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
      from: s,
      to: wEnd,
    })
  }
  return out
}

export const BUCKET_GRANULARITY = (range: ReportRange): 'day' | 'week' =>
  rangeDays(range) > 31 ? 'week' : 'day'

/** Valeur par défaut pour `<input type="date">` (YYYY-MM-DD) à partir d'un ms. */
export function toDateInputValue(ms: number): string {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

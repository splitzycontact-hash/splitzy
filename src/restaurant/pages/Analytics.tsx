import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId, useRestaurant } from '../context/RestaurantContext'
import { formatEur } from '../../utils/formatCurrency'
import { Download, Printer, Calendar, TrendingUp, TrendingDown, Sparkles, ArrowRight, Star, Clock, UtensilsCrossed } from 'lucide-react'

type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'custom'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week',  label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year',  label: 'Cette année' },
  { key: 'custom', label: 'Personnalisé' },
]

// Heatmap data: 12 hours × 7 days, intensity 0-5
const HEAT_HOURS = ['11','12','13','14','15','16','17','18','19','20','21','22']
const HEAT_COLORS = ['#F4F4F5','#FFEAC2','#FFCF85','#F5A435','#D9810E','#A8650B']

type ConvexPayment = {
  totalCents: number; tipCents: number; subtotalCents: number;
  createdAt: number; status: string; guests: number; tableNumber: number
}

// Mesure la largeur réelle du conteneur pour rendre les SVG de charts à l'échelle
// 1:1 (viewBox = pixels). Sans ça, preserveAspectRatio="none" étire les <text>.
function useMeasuredWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(Math.round(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

// Géométrie du graphe CA principal (coordonnées = pixels réels)
const CHART_H = 220
const CHART_BASE = 188
const CHART_SPAN = 148
const CHART_PAD_L = 46
const CHART_PAD_R = 16

function Sparkline({ path, color = '#E8920A' }: { path: string; color?: string }) {
  return (
    <svg width="60" height="22" viewBox="0 0 60 22" fill="none" className="hidden sm:block" style={{ position: 'absolute', bottom: 14, right: 14, opacity: 0.9 }}>
      <path d={path} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

type Insight = { type: string; priority: string; title: string; body: string; metric?: string; action?: string }

const PRIORITY_CFG_A = {
  high:   { textColor: '#EF4444', cardBg: 'var(--ds-error-soft)' },
  medium: { textColor: '#E8920A', cardBg: 'var(--ds-accent-soft)' },
  low:    { textColor: 'var(--ds-text-secondary)', cardBg: 'var(--ds-bg-base)' },
} as const

const TYPE_ICON_A = { revenue: TrendingUp, reputation: Star, operations: Clock, menu: UtensilsCrossed } as const

function formatRel(ts: number): string {
  const h = Math.floor((Date.now() - ts) / 3600000)
  if (h < 1) return "il y a moins d'1h"
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24); return `il y a ${d}j`
}

function buildChartDays(
  pmts: ConvexPayment[],
  periodKey: PeriodKey,
  windowStart: number,
  windowEnd: number,
): Array<{ day: string; total: number }> {
  if (periodKey === 'today') {
    const slots: Array<{ day: string; total: number }> = []
    const keyToIdx = new Map<string, number>()
    for (let h = 11; h <= 23; h++) {
      const key = `${String(h).padStart(2, '0')}h`
      keyToIdx.set(key, slots.length)
      slots.push({ day: key, total: 0 })
    }
    pmts.forEach(p => {
      const h = new Date(p.createdAt).getHours()
      const key = `${String(h).padStart(2, '0')}h`
      const idx = keyToIdx.get(key)
      if (idx !== undefined) slots[idx].total += p.totalCents / 100
    })
    return slots
  }
  if (periodKey === 'week') {
    const slots: Array<{ day: string; total: number }> = []
    const keyToIdx = new Map<string, number>()
    for (let i = 0; i < 7; i++) {
      const d = new Date(windowStart + i * 86400000)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      keyToIdx.set(key, slots.length)
      slots.push({ day: key, total: 0 })
    }
    pmts.forEach(p => {
      const d = new Date(p.createdAt)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const idx = keyToIdx.get(key)
      if (idx !== undefined) slots[idx].total += p.totalCents / 100
    })
    return slots
  }
  if (periodKey === 'month') {
    const slots: Array<{ day: string; total: number }> = []
    const keyToIdx = new Map<string, number>()
    let cursor = windowStart
    while (cursor <= windowEnd) {
      const d = new Date(cursor)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      keyToIdx.set(key, slots.length)
      slots.push({ day: key, total: 0 })
      cursor += 86400000
    }
    pmts.forEach(p => {
      const d = new Date(p.createdAt)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const idx = keyToIdx.get(key)
      if (idx !== undefined) slots[idx].total += p.totalCents / 100
    })
    return slots
  }
  if (periodKey === 'year') {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const lastMonth = new Date(windowEnd).getMonth()
    const slots: Array<{ day: string; total: number }> = []
    for (let m = 0; m <= lastMonth; m++) {
      slots.push({ day: months[m], total: 0 })
    }
    pmts.forEach(p => {
      const m = new Date(p.createdAt).getMonth()
      if (m <= lastMonth) slots[m].total += p.totalCents / 100
    })
    return slots
  }
  // custom: pre-fill every day in the window, then inject payments
  const slots: Array<{ day: string; total: number }> = []
  const keyToIdx = new Map<string, number>()
  let cursor = windowStart
  while (cursor <= windowEnd) {
    const d = new Date(cursor)
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    keyToIdx.set(key, slots.length)
    slots.push({ day: key, total: 0 })
    cursor += 86400000
  }
  pmts.forEach(p => {
    const d = new Date(p.createdAt)
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const idx = keyToIdx.get(key)
    if (idx !== undefined) slots[idx].total += p.totalCents / 100
  })
  return slots
}

function smoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const tension = 0.35
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * tension
    const cp1y = pts[i - 1].y
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * tension
    const cp2y = pts[i].y
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i].x} ${pts[i].y}`
  }
  return d
}

function smoothAreaPath(pts: { x: number; y: number }[], baseY: number): string {
  if (pts.length === 0) return ''
  return `M ${pts[0].x} ${baseY} L ${pts[0].x} ${pts[0].y}` +
    smoothLinePath(pts).replace(/^M [0-9.]+ [0-9.]+/, '') +
    ` L ${pts[pts.length - 1].x} ${baseY} Z`
}

function AnalyticsInsightCard({ insight }: { insight: Insight }) {
  const cfg  = PRIORITY_CFG_A[(insight.priority as keyof typeof PRIORITY_CFG_A)] ?? PRIORITY_CFG_A.low
  const Icon = TYPE_ICON_A[(insight.type as keyof typeof TYPE_ICON_A)] ?? Sparkles
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0" style={{ borderColor: 'var(--ds-border)', background: cfg.cardBg }}>
      <Icon size={14} style={{ color: cfg.textColor, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold text-[13px] ds-text-primary leading-tight">{insight.title}</span>
          {insight.metric && <span className="text-[12px] font-bold tabular-nums flex-shrink-0" style={{ color: cfg.textColor }}>{insight.metric}</span>}
        </div>
        <p className="text-[12.5px] ds-text-secondary leading-[1.5]">{insight.body}</p>
        {insight.action && <p className="text-[12px] font-medium mt-1" style={{ color: cfg.textColor }}>→ {insight.action}</p>}
      </div>
    </div>
  )
}

function AnalyticsInsightsBlock({
  latestInsights, isPro, totalTickets,
}: {
  latestInsights: { insights: unknown[]; generatedAt: number; period: string } | null | undefined
  isPro: boolean
  totalTickets: number
}) {
  return (
    <div className="rounded-[12px] overflow-hidden border" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
        <div className="flex items-center gap-2 font-bold text-[14.5px] tracking-[-0.015em] ds-text-primary">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-[6px]" style={{ background: 'var(--ds-accent-soft)' }}>
            <Sparkles size={13} style={{ color: '#E8920A' }} />
          </span>
          Insights IA — Analyse de la semaine
        </div>
        {latestInsights && isPro && (
          <span className="text-[11.5px] ds-text-tertiary">{formatRel(latestInsights.generatedAt)}</span>
        )}
      </div>
      {!isPro ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center px-4">
          <Sparkles size={28} style={{ color: '#E8920A' }} />
          <p className="font-semibold text-[13.5px] ds-text-primary">Insights IA</p>
          <p className="text-[12px] ds-text-secondary max-w-xs leading-[1.5]">Recommandations personnalisées générées chaque nuit. Disponible avec le Plan Pro.</p>
          <button className="text-[12.5px] font-semibold" style={{ color: '#E8920A' }} onClick={() => window.location.href='/restaurant/settings?section=plan'}>Passer au Plan Pro →</button>
        </div>
      ) : !latestInsights ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Sparkles size={24} style={{ color: 'var(--ds-border-strong)' }} />
          <p className="text-[13px] ds-text-secondary">Les insights seront générés cette nuit à 3h</p>
          <p className="text-[11.5px] ds-text-tertiary">Disponibles dès que vous aurez des données de paiement</p>
        </div>
      ) : (
        <>
          <div className="divide-y" style={{ borderColor: 'var(--ds-border)' }}>
            {(latestInsights.insights as Insight[]).map((ins, i) => (
              <AnalyticsInsightCard key={i} insight={ins} />
            ))}
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t text-[12px]" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
            <span className="ds-text-tertiary">{latestInsights.insights.length} insights · {totalTickets > 0 ? totalTickets : '—'} tickets analysés</span>
            <span className="ds-text-tertiary">{latestInsights.period}</span>
          </div>
        </>
      )}
    </div>
  )
}

export function Analytics() {
  const [period, setPeriod]           = useState<PeriodKey>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')
  const [hovered, setHovered]         = useState<{ x: number; y: number; day: string; total: number } | null>(null)
  const [chartRef, chartW]            = useMeasuredWidth(920)
  const [tipsRef, tipsW]              = useMeasuredWidth(300)
  const restaurantId   = useRestaurantId()
  const restaurant     = useRestaurant()
  const rawPayments    = useQuery(api.payments.list,              restaurantId ? { restaurantId } : 'skip')
  const rawFeedbacks   = useQuery(api.feedbacks.list,             restaurantId ? { restaurantId } : 'skip')
  const rawTables      = useQuery(api.tables.list,                restaurantId ? { restaurantId } : 'skip')
  const latestInsights = useQuery(api.insights.getLatestInsights, restaurantId ? { restaurantId } : 'skip')
  const isPro          = restaurant?.plan === 'pro'

  const payments = (rawPayments ?? []) as ConvexPayment[]
  const allFeedbacks = (rawFeedbacks ?? []) as { stars: number }[]

  const now = new Date()
  const periodStart: number = (() => {
    if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    if (period === 'week') {
      const d = new Date(now); const day = d.getDay()
      d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d.getTime()
    }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    if (period === 'year')  return new Date(now.getFullYear(), 0, 1).getTime()
    if (period === 'custom' && customStart) return new Date(customStart).getTime()
    return 0
  })()
  const periodEnd = period === 'custom' && customEnd
    ? new Date(customEnd).getTime() + 86399999
    : now.getTime()

  const rangeLabel = (() => {
    if (period === 'today') return now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    if (period === 'week') {
      const s = new Date(now); const day = s.getDay()
      s.setDate(s.getDate() + (day === 0 ? -6 : 1 - day)); s.setHours(0, 0, 0, 0)
      return `${s.getDate()} — ${now.getDate()} ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
    }
    if (period === 'month') return `1 — ${now.getDate()} ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
    if (period === 'year') return `Jan. — ${now.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`
    if (period === 'custom' && customStart && customEnd) return `${customStart} — ${customEnd}`
    return 'Choisir une plage…'
  })()

  const filtered = payments.filter(p => p.createdAt >= periodStart && p.createdAt <= periodEnd)
  const encaisse = filtered.filter(p => p.status === 'Encaissé')

  const now28 = Date.now() - 28 * 24 * 60 * 60 * 1000
  const allEncaisse = payments.filter(p => p.status === 'Encaissé')
  const last28 = allEncaisse.filter(p => p.createdAt >= now28)

  const basketByTable = useMemo(() => {
    if (last28.length === 0) return []
    const map: Record<number, { sum: number; count: number }> = {}
    for (const p of last28) {
      if (!map[p.tableNumber]) map[p.tableNumber] = { sum: 0, count: 0 }
      map[p.tableNumber].sum += p.subtotalCents
      map[p.tableNumber].count++
    }
    const rows = Object.entries(map)
      .map(([t, { sum, count }]) => ({ t: `T${t}`, avg: sum / count / 100 }))
      .sort((a, b) => b.avg - a.avg).slice(0, 6)
    const maxAvg = rows[0]?.avg ?? 1
    return rows.map(r => ({ t: r.t, pct: Math.round((r.avg / maxAvg) * 100), amt: `${r.avg.toFixed(2).replace('.', ',')}€` }))
  }, [last28])

  const heatData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 12 }, () => Array(7).fill(0))
    const toDay = (d: number) => d === 0 ? 6 : d - 1
    for (const p of last28) {
      const d = new Date(p.createdAt)
      const hi = d.getHours() - 11
      if (hi >= 0 && hi <= 11) grid[hi][toDay(d.getDay())]++
    }
    const mx = Math.max(...grid.flat(), 1)
    return grid.map(row => row.map(v => Math.round((v / mx) * 5)))
  }, [last28])

  const pctTip = encaisse.length > 0 ? Math.round(encaisse.filter(p => p.tipCents > 0).length / encaisse.length * 100) : 0
  const sortedTip = encaisse.map(p => p.subtotalCents > 0 ? p.tipCents / p.subtotalCents * 100 : 0).sort((a, b) => a - b)
  const medianTip = sortedTip.length > 0 ? sortedTip[Math.floor(sortedTip.length / 2)].toFixed(0) : '0'
  const tipByTable: Record<number, { tips: number; sub: number }> = {}
  for (const p of encaisse) {
    if (!tipByTable[p.tableNumber]) tipByTable[p.tableNumber] = { tips: 0, sub: 0 }
    tipByTable[p.tableNumber].tips += p.tipCents
    tipByTable[p.tableNumber].sub += p.subtotalCents
  }
  const bestT = Object.entries(tipByTable).filter(([, { sub }]) => sub > 0).map(([t, { tips, sub }]) => ({ t, pct: tips / sub * 100 })).sort((a, b) => b.pct - a.pct)[0]
  const bestTableLabel = bestT ? `T${bestT.t} · ${bestT.pct.toFixed(0)}%` : '—'

  // Période précédente (pour fallback graphique quand période courante vide)
  const prevPeriodRange = (() => {
    if (period === 'today') {
      const yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const yStart = yd.getTime(), yEnd = yd.getTime() + 86399999
      const yData = payments.filter(p => p.createdAt >= yStart && p.createdAt <= yEnd && p.status === 'Encaissé')
      if (yData.length > 0) return { start: yStart, end: yEnd }
      const wd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      return { start: wd.getTime(), end: wd.getTime() + 86399999 }
    }
    if (period === 'week') return { start: periodStart - 7 * 86400000, end: periodStart - 1 }
    if (period === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
      return { start: s, end: periodStart - 1 }
    }
    if (period === 'year') {
      const s = new Date(now.getFullYear() - 1, 0, 1).getTime()
      return { start: s, end: new Date(now.getFullYear(), 0, 1).getTime() - 1 }
    }
    return { start: 0, end: 0 }
  })()

  const prevEncaisse = payments
    .filter(p => p.createdAt >= prevPeriodRange.start && p.createdAt <= prevPeriodRange.end && p.status === 'Encaissé') as ConvexPayment[]

  const currentChartDays = buildChartDays(encaisse, period, periodStart, periodEnd)
  const fallbackChartDays = buildChartDays(prevEncaisse, period, prevPeriodRange.start, prevPeriodRange.end)
  const isShowingPrev = currentChartDays.length === 0 && fallbackChartDays.length > 0
  const chartDays = isShowingPrev ? fallbackChartDays : currentChartDays
  const chartMax = Math.max(...chartDays.map(d => d.total), 1)
  const chartPic = chartDays.reduce((m, d) => d.total > m.total ? d : m, { day: '—', total: 0 })
  const chartAvg = chartDays.length > 0 ? chartDays.reduce((s, d) => s + d.total, 0) / chartDays.length : 0
  const chartPlotW = Math.max(chartW - CHART_PAD_L - CHART_PAD_R, 1)
  const chartPts = chartDays.map((d, i) => ({
    x: Math.round(CHART_PAD_L + (i / Math.max(chartDays.length - 1, 1)) * chartPlotW),
    y: Math.round(CHART_BASE - (d.total / chartMax) * CHART_SPAN),
  }))
  const chartLinePath = smoothLinePath(chartPts)
  const chartAreaPath = smoothAreaPath(chartPts, CHART_BASE)
  const MONTH_NAMES_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']
  const MONTH_NAMES_SHORT = ['Jan.','Fév.','Mars','Avr.','Mai','Juin','Juil.','Août','Sep.','Oct.','Nov.','Déc.']

  const prevPeriodLabel = (() => {
    if (period === 'today') {
      const yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const yStart = yd.getTime()
      const hasYesterday = payments.some(p => p.createdAt >= yStart && p.createdAt <= yStart + 86399999 && p.status === 'Encaissé')
      return hasYesterday ? 'hier' : 'il y a 7 jours'
    }
    if (period === 'week') return 'la semaine précédente'
    if (period === 'month') return MONTH_NAMES_FR[now.getMonth() === 0 ? 11 : now.getMonth() - 1]
    if (period === 'year') return String(now.getFullYear() - 1)
    return 'la période précédente'
  })()

  const prevPeriodLabelShort = (() => {
    if (period === 'today') {
      const yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const yStart = yd.getTime()
      const hasYesterday = payments.some(p => p.createdAt >= yStart && p.createdAt <= yStart + 86399999 && p.status === 'Encaissé')
      return hasYesterday ? 'Hier' : 'Il y a 7j'
    }
    if (period === 'week') return 'Sem. préc.'
    if (period === 'month') return MONTH_NAMES_SHORT[now.getMonth() === 0 ? 11 : now.getMonth() - 1]
    if (period === 'year') return String(now.getFullYear() - 1)
    return 'Préc.'
  })()

  const currentPeriodLabel = (() => {
    if (period === 'today') return "Aujourd'hui"
    if (period === 'week') return 'Cette semaine'
    if (period === 'month') return MONTH_NAMES_SHORT[now.getMonth()]
    if (period === 'year') return String(now.getFullYear())
    if (period === 'custom' && customStart && customEnd) return `${customStart} — ${customEnd}`
    return 'Période'
  })()

  const chartSubtitle = (() => {
    if (isShowingPrev) return `Pas encore de données — affichage de ${prevPeriodLabel}`
    if (period === 'today') return "Comparaison aujourd'hui vs. hier"
    if (period === 'week') return 'Comparaison cette semaine vs. semaine précédente'
    if (period === 'month') {
      const curr = MONTH_NAMES_FR[now.getMonth()]
      const prev = MONTH_NAMES_FR[now.getMonth() === 0 ? 11 : now.getMonth() - 1]
      return `Comparaison ce mois (${curr}) vs. mois précédent (${prev})`
    }
    if (period === 'year') return `Comparaison ${now.getFullYear()} vs. ${now.getFullYear() - 1}`
    return 'Évolution de la période sélectionnée'
  })()
  const tooltipX = hovered ? Math.min(Math.max(hovered.x, 50), chartW - 50) : 0
  const tooltipY = hovered ? Math.max(hovered.y - 42, 8) : 0

  const weekTotal = encaisse.reduce((s, p) => s + p.totalCents, 0)
  const tipsTotal = encaisse.reduce((s, p) => s + p.tipCents, 0)
  const totalTickets = encaisse.length
  const avgBasket = totalTickets > 0
    ? encaisse.reduce((s, p) => s + p.subtotalCents, 0) / totalTickets / 100
    : 0
  const avgTipPct = weekTotal > 0 ? ((tipsTotal / (weekTotal - tipsTotal)) * 100).toFixed(1) : '0'

  const peakSlot = useMemo(() => {
    if (!last28.length) return null
    let mx = 0, bh = 0, bd = 0
    for (let h = 0; h < 12; h++) for (let d = 0; d < 7; d++) if (heatData[h][d] > mx) { mx = heatData[h][d]; bh = h; bd = d }
    return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][bd] + ' ' + (11 + bh) + '-' + (12 + bh) + 'h'
  }, [heatData, last28.length])

  const tipWkly = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const e = Date.now() - (11 - i) * 604800000, s = e - 604800000
    const w = allEncaisse.filter(p => p.createdAt >= s && p.createdAt < e)
    const sub = w.reduce((a, p) => a + p.subtotalCents, 0)
    return sub > 0 ? w.reduce((a, p) => a + p.tipCents, 0) / sub * 100 : 0
  }), [allEncaisse])
  const twMax = Math.max(...tipWkly, 0.1)
  const twPath = tipWkly.map((v, i) => (i ? 'L' : 'M') + (i / 11 * tipsW).toFixed(1) + ' ' + (57 - v / twMax * 48).toFixed(1)).join(' ')

  const tipVsBase = tipsTotal > 0 ? Math.round((parseFloat(avgTipPct) - 6.2) / 6.2 * 100) : 0

  // Date d'activation réelle = premier paiement encaissé (null si aucun)
  const firstPaymentAt = allEncaisse.length > 0
    ? allEncaisse.reduce((min, p) => Math.min(min, p.createdAt), Infinity)
    : null
  const moSince = firstPaymentAt !== null
    ? Math.max(1, Math.round((Date.now() - firstPaymentAt) / (30.5 * 86400000)))
    : 0
  const invest = moSince * 99
  const aSub = allEncaisse.reduce((s, p) => s + p.subtotalCents, 0)
  const aTips = allEncaisse.reduce((s, p) => s + p.tipCents, 0)
  const aTot = allEncaisse.reduce((s, p) => s + p.totalCents, 0)
  const extraTip = Math.max(0, aTips - aSub * 0.062) / 100
  const rotGain = aTot * 0.10 / 100
  const posAvis = allFeedbacks.filter(f => f.stars >= 4).length
  const googGain = posAvis * 30
  const roi = extraTip + rotGain + googGain
  const roiMult = invest > 0 && roi > 0 ? (roi / invest).toFixed(1) : '0'
  const fmtR = (n: number) => Math.round(n).toLocaleString('fr-FR') + '€'

  const liveTables = (rawTables ?? []) as { status: string; durationMinutes?: number }[]
  const tablesWithDur = liveTables.filter(t => t.status !== 'free' && (t.durationMinutes ?? 0) > 0)
  const avgTableMin = tablesWithDur.length > 0
    ? Math.round(tablesWithDur.reduce((s, t) => s + (t.durationMinutes ?? 0), 0) / tablesWithDur.length)
    : null

  const prevWeekTotal    = prevEncaisse.reduce((s, p) => s + p.totalCents, 0)
  const prevTotalTickets = prevEncaisse.length
  const prevAvgBasket    = prevTotalTickets > 0
    ? prevEncaisse.reduce((s, p) => s + p.subtotalCents, 0) / prevTotalTickets / 100
    : 0
  const caDelta = prevWeekTotal > 0
    ? ((weekTotal - prevWeekTotal) / prevWeekTotal * 100)
    : null
  const ticketsDelta = prevTotalTickets > 0 ? (totalTickets - prevTotalTickets) : null
  const basketDelta  = prevAvgBasket > 0
    ? ((avgBasket - prevAvgBasket) / prevAvgBasket * 100)
    : null

  return (
    <RestaurantLayout>
      <PageHeader
        title="Analytics"
        subtitle={<span>Analyse de vos revenus et performances</span>}
        actions={
          <>
            <button
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium transition-colors"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Download size={14} />
              Exporter
            </button>
            <button
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium transition-colors"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Printer size={14} />
              Imprimer rapport
            </button>
          </>
        }
      />

      <div className="px-9 py-6 space-y-5">

        {/* Period bar */}
        <div
          className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-[10px] border"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          <div className="flex items-center gap-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[13px] transition-colors"
                style={{
                  background: period === key ? 'var(--ds-bg-subtle)' : 'none',
                  color: period === key ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                  fontWeight: period === key ? 600 : 500,
                }}
              >
                {key === 'custom' && <Calendar size={12} />}
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[13px] ds-text-secondary">
            <Calendar size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
            <strong className="ds-text-primary font-semibold">{rangeLabel}</strong>
            <span className="ds-text-tertiary">· vs. avril</span>
          </div>
        </div>

        {period === 'custom' && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-[10px] border"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            <Calendar size={13} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
            <span className="text-[13px] ds-text-secondary">Du</span>
            <input
              type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px]"
              style={{ color: 'var(--ds-text-primary)', fontSize: '13px' }}
            />
            <span className="text-[13px] ds-text-secondary">au</span>
            <input
              type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px]"
              style={{ color: 'var(--ds-text-primary)', fontSize: '13px' }}
            />
          </div>
        )}

        {/* KPI strip */}
        <div
          className="grid grid-cols-2 xl:grid-cols-4 border rounded-[12px] overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {[
            {
              label: 'CA encaissé', accent: true,
              value: formatEur(weekTotal),
              delta: caDelta !== null ? `${caDelta > 0 ? '+' : ''}${caDelta.toFixed(1)}%` : '—',
              up: caDelta !== null ? caDelta >= 0 : true,
              vs: prevWeekTotal > 0 ? `vs. ${formatEur(prevWeekTotal)}` : '',
              spark: 'M0 16 L8 14 L16 17 L24 11 L32 13 L40 8 L48 9 L60 4',
              sparkColor: '#E8920A',
            },
            {
              label: 'Tickets payés', accent: false,
              value: String(totalTickets),
              delta: ticketsDelta !== null ? `${ticketsDelta > 0 ? '+' : ''}${ticketsDelta} tickets` : '—',
              up: ticketsDelta !== null ? ticketsDelta >= 0 : true,
              vs: prevTotalTickets > 0 ? `vs. ${prevTotalTickets}` : '',
              spark: 'M0 14 L8 16 L16 13 L24 14 L32 11 L40 12 L48 8 L60 9',
              sparkColor: 'var(--ds-text-primary)',
            },
            {
              label: 'Panier moyen', accent: false,
              value: totalTickets > 0 ? `${avgBasket.toFixed(2).replace('.', ',')}€` : '—',
              delta: basketDelta !== null ? `${basketDelta > 0 ? '+' : ''}${basketDelta.toFixed(1)}%` : '—',
              up: basketDelta !== null ? basketDelta >= 0 : true,
              vs: prevAvgBasket > 0 ? `vs. ${prevAvgBasket.toFixed(2).replace('.', ',')}€` : '',
              spark: 'M0 12 L8 15 L16 11 L24 13 L32 9 L40 11 L48 7 L60 8',
              sparkColor: 'var(--ds-text-primary)',
            },
            {
              label: 'Temps moyen / table', accent: false,
              value: avgTableMin !== null ? String(avgTableMin) : '—', suffix: avgTableMin !== null ? 'min' : '',
              delta: 'service en cours', up: true, vs: '',
              spark: 'M0 6 L8 8 L16 9 L24 12 L32 11 L40 14 L48 16 L60 17',
              sparkColor: '#22C55E',
            },
          ].map((kpi, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 px-5 py-4 relative"
              style={{ borderRight: i < 3 ? `1px solid var(--ds-border)` : 'none', minHeight: '112px' }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">{kpi.label}</div>
              <div
                className="font-extrabold tabular-nums leading-none tracking-[-0.035em] mt-auto"
                style={{ fontSize: '28px', color: kpi.accent ? 'var(--ds-accent)' : 'var(--ds-text-primary)' }}
              >
                {kpi.value}
                {'suffix' in kpi && kpi.suffix && (
                  <span className="text-[18px] font-semibold ds-text-secondary tracking-normal ml-0.5">{kpi.suffix}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] ds-text-secondary">
                <span
                  className="inline-flex items-center gap-0.5 font-semibold"
                  style={{ color: kpi.up ? 'var(--ds-success-strong)' : 'var(--ds-error-strong)' }}
                >
                  {kpi.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {kpi.delta}
                </span>
                <span className="ds-text-tertiary">{kpi.vs}</span>
              </div>
              <Sparkline path={kpi.spark} color={kpi.sparkColor} />
            </div>
          ))}
        </div>

        {/* Main chart */}
        <div className="ds-panel">
          <div
            className="flex items-start justify-between px-5 py-4 border-b gap-3"
            style={{ borderColor: 'var(--ds-border)' }}
          >
            <div>
              <div className="font-bold text-[14.5px] tracking-[-0.015em] ds-text-primary">
                Évolution du chiffre d'affaires
              </div>
              <div className="text-[12px] ds-text-tertiary mt-0.5">
                {chartSubtitle}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px] ds-text-secondary flex-shrink-0">
              {/* Chart stats */}
              <div className="hidden md:flex items-center gap-6">
                <div><div className="text-[10.5px] ds-text-tertiary uppercase tracking-[0.07em]">Pic</div><div className="font-semibold text-[13px] ds-text-primary">{chartPic.total.toFixed(2)}€ <span className="text-[11px] ds-text-tertiary font-normal">· {chartPic.day}</span></div></div>
                <div><div className="text-[10.5px] ds-text-tertiary uppercase tracking-[0.07em]">Jour moyen</div><div className="font-semibold text-[13px] ds-text-primary">{chartAvg.toFixed(2)}€</div></div>
                <div><div className="text-[10.5px] ds-text-tertiary uppercase tracking-[0.07em]">Tendance</div><div className="font-semibold text-[13px]" style={{ color: caDelta !== null && caDelta < 0 ? 'var(--ds-error-strong)' : 'var(--ds-success-strong)' }}>{caDelta !== null ? `${caDelta > 0 ? '+' : ''}${caDelta.toFixed(1).replace('.', ',')}%` : '—'}</div></div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-[2px] rounded-full inline-block" style={{ background: isShowingPrev ? '#A1A1AA' : '#E8920A' }} />
                  <span className="text-[11.5px] ds-text-secondary">
                    {isShowingPrev ? prevPeriodLabelShort : currentPeriodLabel}
                  </span>
                </span>
                {isShowingPrev && (
                  <span
                    className="text-[11px] font-medium px-2 py-[2px] rounded-full"
                    style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-tertiary)' }}
                  >
                    Période précédente
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="p-5 pb-2" ref={chartRef}>
            <svg
              viewBox={`0 0 ${chartW} ${CHART_H}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: `${CHART_H}px`, display: 'block', fontVariantNumeric: 'tabular-nums' }}
              onMouseLeave={() => setHovered(null)}
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8920A" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#E8920A" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="chartFillPrev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71717A" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#71717A" stopOpacity="0" />
                </linearGradient>
                <pattern id="analyticsGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ds-bg-subtle)" strokeWidth="1" />
                </pattern>
                <filter id="lineGlow">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <rect width={chartW} height={CHART_BASE - 8} y="8" fill="url(#analyticsGrid)" />
              {chartDays.length > 0 && (
                <g fontSize="10" fill="var(--ds-text-tertiary)">
                  {[1, 0.75, 0.5, 0.25, 0].map((f, i) => {
                    const val = chartMax * f
                    const y = Math.round(CHART_BASE - f * CHART_SPAN) + 3
                    const label = val >= 1000 ? `${(val / 1000).toFixed(1)}k€` : `${Math.round(val)}€`
                    return <text key={i} x="8" y={y}>{label}</text>
                  })}
                </g>
              )}
              <line x1={CHART_PAD_L - 6} y1={CHART_BASE} x2={chartW - CHART_PAD_R} y2={CHART_BASE} stroke="var(--ds-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              {chartDays.length === 0 ? (
                <g>
                  <circle cx={chartW / 2} cy="92" r="28" fill="var(--ds-bg-subtle)" />
                  <text x={chartW / 2} y="98" textAnchor="middle" fontSize="18" fill="var(--ds-border-strong)">📊</text>
                  <text x={chartW / 2} y="140" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ds-text-secondary)">
                    Aucune donnée pour cette période
                  </text>
                  <text x={chartW / 2} y="158" textAnchor="middle" fontSize="11" fill="var(--ds-text-tertiary)">
                    Les données apparaîtront au fil des paiements
                  </text>
                </g>
              ) : (
                <>
                  <path d={chartAreaPath} fill={isShowingPrev ? 'url(#chartFillPrev)' : 'url(#chartFill)'} />
                  <path
                    d={chartLinePath}
                    stroke={isShowingPrev ? '#71717A' : '#E8920A'}
                    strokeWidth={isShowingPrev ? 1.8 : 2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isShowingPrev ? '6 3' : undefined}
                    filter={isShowingPrev ? undefined : 'url(#lineGlow)'}
                    vectorEffect="non-scaling-stroke"
                  />
                  {chartPts.map((pt, i) => (
                    <circle
                      key={`dot-${i}`}
                      cx={pt.x} cy={pt.y} r="3"
                      fill={isShowingPrev ? '#52525B' : '#E8920A'}
                      opacity="0.6"
                      style={{ pointerEvents: 'none' }}
                    />
                  ))}
                  {chartPts.map((pt, i) => (
                    <circle
                      key={`hover-${i}`}
                      cx={pt.x} cy={pt.y} r="12"
                      fill="transparent"
                      onMouseEnter={() => setHovered({ x: pt.x, y: pt.y, day: chartDays[i].day, total: chartDays[i].total })}
                    />
                  ))}
                  {hovered && (
                    <>
                      <circle cx={hovered.x} cy={hovered.y} r="5" fill="var(--ds-bg-surface)" stroke={isShowingPrev ? '#71717A' : '#E8920A'} strokeWidth="2.5" />
                      <line x1={hovered.x} y1={hovered.y + 7} x2={hovered.x} y2={CHART_BASE}
                        stroke={isShowingPrev ? '#71717A' : '#E8920A'} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" vectorEffect="non-scaling-stroke" />
                      <rect x={tooltipX - 44} y={tooltipY} width="88" height="36" rx="8"
                        fill="#18181B" stroke={isShowingPrev ? '#3F3F46' : '#E8920A'} strokeWidth="1" opacity="0.95" />
                      <text x={tooltipX} y={tooltipY + 14} textAnchor="middle"
                        fontSize="12" fontWeight="700"
                        fill={isShowingPrev ? '#A1A1AA' : '#E8920A'}>
                        {hovered.total.toFixed(2)}€
                      </text>
                      <text x={tooltipX} y={tooltipY + 27} textAnchor="middle"
                        fontSize="10" fill="#A1A1AA">
                        {hovered.day}
                      </text>
                    </>
                  )}
                  <g fontSize="10" fill="var(--ds-text-tertiary)">
                    {chartPts.map((pt, i) => {
                      const step = Math.max(1, Math.ceil(chartDays.length / 7))
                      if (i % step !== 0 && i !== chartPts.length - 1) return null
                      return (
                        <text key={i} x={pt.x} y={CHART_BASE + 18} textAnchor="middle">
                          {chartDays[i].day.split('/')[0]}
                        </text>
                      )
                    })}
                  </g>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* 2×2 grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Panier moyen par table */}
          <div className="ds-panel">
            <div className="flex items-center justify-between px-5 py-4 border-b gap-3" style={{ borderColor: 'var(--ds-border)' }}>
              <div>
                <div className="font-bold text-[14.5px] tracking-[-0.015em] ds-text-primary">Panier moyen par table</div>
                <div className="text-[12px] ds-text-tertiary mt-0.5">Top tables · 28 derniers jours</div>
              </div>
              <button className="inline-flex items-center gap-1 text-[12px] font-medium ds-text-secondary hover:ds-text-accent transition-colors">
                Voir tout <ArrowRight size={11} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {basketByTable.length > 0 ? basketByTable.map(row => (
                <div key={row.t} className="flex items-center gap-3">
                  <span
                    className="font-bold text-[11.5px] w-7 text-center rounded-[5px] py-[2px] flex-shrink-0"
                    style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)' }}
                  >
                    {row.t}
                  </span>
                  <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--ds-bg-subtle)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${row.pct}%`, background: '#E8920A' }}
                    />
                  </div>
                  <span className="font-semibold text-[13px] ds-text-primary tabular-nums w-14 text-right">{row.amt}</span>
                </div>
              )) : <div className="text-[12px] ds-text-tertiary py-4 text-center">Aucune donnée</div>}
            </div>
            <div
              className="flex items-center justify-between px-5 py-3 border-t text-[12.5px]"
              style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
            >
              <span className="ds-text-secondary">Panier moyen restaurant</span>
              <span className="font-semibold ds-text-primary tabular-nums">
                {avgBasket > 0 ? `${avgBasket.toFixed(2).replace('.', ',')}€` : '—'}
                {basketDelta !== null && (
                  <span className="ml-1.5 text-[11.5px] font-semibold" style={{ color: basketDelta >= 0 ? 'var(--ds-success-strong)' : 'var(--ds-error-strong)' }}>{basketDelta > 0 ? '+' : ''}{basketDelta.toFixed(1).replace('.', ',')}%</span>
                )}
              </span>
            </div>
          </div>

          {/* Heatmap heures de pointe */}
          <div className="ds-panel">
            <div className="flex items-center justify-between px-5 py-4 border-b gap-3" style={{ borderColor: 'var(--ds-border)' }}>
              <div>
                <div className="font-bold text-[14.5px] tracking-[-0.015em] ds-text-primary">Heures de pointe</div>
                <div className="text-[12px] ds-text-tertiary mt-0.5">Couverts par jour & créneau · 4 semaines</div>
              </div>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: 'var(--ds-warning)' }}
              >
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--ds-warning)' }} />
                {peakSlot ?? '—'}
              </span>
            </div>
            <div className="px-4 pt-3 pb-2">
              {/* Hour labels */}
              <div className="flex items-center mb-1.5">
                <div className="w-7" />
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${HEAT_HOURS.length}, 1fr)` }}>
                  {HEAT_HOURS.map(h => (
                    <div key={h} className="text-center text-[10px] tabular-nums ds-text-tertiary">{h}</div>
                  ))}
                </div>
              </div>
              {/* Grid: 7 days × 12 hours */}
              {['L','M','M','J','V','S','D'].map((day, di) => (
                <div key={day + di} className="flex items-center gap-1 mb-1">
                  <div className="w-5 text-[10px] ds-text-tertiary text-right flex-shrink-0">{day}</div>
                  <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${HEAT_HOURS.length}, 1fr)` }}>
                    {HEAT_HOURS.map((_, hi) => (
                      <div
                        key={hi}
                        className="rounded-[2px]"
                        style={{
                          height: '18px',
                          background: HEAT_COLORS[heatData[hi][di]] ?? '#F4F4F5',
                          border: heatData[hi][di] === 5 ? '1px solid rgba(168,101,11,0.4)' : 'none',
                        }}
                        title={`${['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][di]} ${HEAT_HOURS[hi]}h`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5 text-[11px] ds-text-tertiary">
                  Moins
                  <div className="flex gap-0.5">
                    {HEAT_COLORS.slice(0, 5).map((c, i) => (
                      <span key={i} className="w-3.5 h-3.5 rounded-[2px] inline-block" style={{ background: c }} />
                    ))}
                  </div>
                  Plus
                </div>
                <span className="text-[11.5px] ds-text-tertiary">Service : 11h — 23h</span>
              </div>
            </div>
          </div>

          {/* Pourboires */}
          <div className="ds-panel">
            <div className="flex items-center justify-between px-5 py-4 border-b gap-3" style={{ borderColor: 'var(--ds-border)' }}>
              <div>
                <div className="font-bold text-[14.5px] tracking-[-0.015em] ds-text-primary">Pourboires</div>
                <div className="text-[12px] ds-text-tertiary mt-0.5">Taux moyen · vs. moyenne du secteur (6,2%)</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--ds-success-strong)' }}>
                {tipsTotal > 0 ? (
                  <>
                    <TrendingUp size={9} />
                    +2,3 pts
                  </>
                ) : '—'}
              </span>
            </div>
            <div className="px-5 py-4">
              {/* Main value + sparkline */}
              <div className="flex items-start gap-5">
                <div>
                  <div
                    className="font-extrabold tabular-nums leading-none tracking-[-0.04em]"
                    style={{ fontSize: '40px', color: 'var(--ds-accent)' }}
                  >
                    {avgTipPct}%
                  </div>
                  <div className="text-[12px] ds-text-secondary mt-1.5 leading-[1.5]">
                    {formatEur(tipsTotal)} collectés
                    <br />
                    <span className="ds-text-tertiary">{tipVsBase > 0 ? '+' + tipVsBase + '%' : '—'} vs. avant Splitzy</span>
                  </div>
                </div>
                <div className="flex-1" ref={tipsRef}>
                  <svg viewBox={`0 0 ${tipsW} 70`} preserveAspectRatio="none" style={{ width: '100%', height: '70px', display: 'block', fontVariantNumeric: 'tabular-nums', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="tipsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E8920A" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#E8920A" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="48" x2={tipsW} y2="48" stroke="var(--ds-border)" strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
                    <text x={tipsW} y="44" fontSize="10" fill="var(--ds-text-tertiary)" textAnchor="end">secteur 6,2%</text>
                    <path d={twPath + ` L${tipsW} 70 L0 70 Z`} fill="url(#tipsFill)" />
                    <path d={twPath} stroke="#E8920A" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    <circle cx={tipsW} cy={(57 - tipWkly[11] / twMax * 48).toFixed(1)} r="3.5" fill="var(--ds-bg-surface)" stroke="#E8920A" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              {/* Stats rows */}
              <div className="mt-4 space-y-2.5 border-t pt-3" style={{ borderColor: 'var(--ds-border)' }}>
                {[
                  { label: 'Médiane', value: `${medianTip}%` },
                  { label: '% tickets avec pourboire', value: `${pctTip}%` },
                  { label: 'Meilleure table', value: bestTableLabel },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[12.5px] ds-text-secondary">{row.label}</span>
                    <span className="font-semibold text-[13px] ds-text-primary tabular-nums">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROI card */}
          <div
            className="rounded-[12px] overflow-hidden"
            style={{ background: '#0A0A0A', boxShadow: 'var(--ds-shadow-md)' }}
          >
            <div className="p-6">
              <div
                className="flex items-center justify-between mb-4"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#A1A1AA' }}>
                  CA généré depuis Splitzy
                </div>
                <span
                  className="text-[10.5px] font-semibold px-2 py-[3px] rounded-full"
                  style={{ background: 'rgba(232,146,10,0.15)', color: '#F5A030' }}
                >
                  {moSince > 0 ? `Estimation · ${moSince} mois` : 'Estimation'}
                </span>
              </div>
              <div
                className="font-extrabold tracking-[-0.04em] leading-none tabular-nums"
                style={{ fontSize: '48px', color: 'white' }}
              >
                {allEncaisse.length > 0 ? fmtR(roi) : '0€'}
              </div>
              <div className="text-[12px] mt-2" style={{ color: '#71717A' }}>
                {firstPaymentAt !== null
                  ? <>Depuis le {new Date(firstPaymentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} · ~{roiMult}× l'investissement (estimation)</>
                  : <>Aucun paiement encaissé pour le moment</>}
              </div>
              <div className="mt-5 space-y-2.5 border-t pt-4" style={{ borderColor: '#27272A' }}>
                {[
                  { label: 'Pourboires additionnels',       value: '+' + fmtR(extraTip)  },
                  { label: 'Rotation de table accélérée',   value: '+' + fmtR(rotGain)  },
                  { label: 'Avis Google sauvés (×' + posAvis + ')',       value: '+' + fmtR(googGain)  },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-[12.5px]">
                    <span style={{ color: '#71717A' }}>{row.label}</span>
                    <span className="font-semibold tabular-nums" style={{ color: '#FAFAFA' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Insights IA */}
        <AnalyticsInsightsBlock
          latestInsights={latestInsights}
          isPro={isPro}
          totalTickets={totalTickets}
        />

      </div>
    </RestaurantLayout>
  )
}

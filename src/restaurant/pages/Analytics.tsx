import { useState } from 'react'
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
const HEAT_DATA = [
  [0,0,0,0,0,1,1],[2,2,2,3,3,4,3],[3,3,3,3,4,4,3],[1,2,1,2,2,3,2],
  [0,0,0,0,1,1,1],[0,0,0,0,0,1,0],[0,0,0,0,0,1,1],[1,1,1,1,2,2,1],
  [2,2,2,3,3,4,2],[3,3,3,3,4,5,3],[2,2,2,3,4,4,2],[1,1,1,2,3,3,1],
]
const HEAT_COLORS = ['#F4F4F5','#FFEAC2','#FFCF85','#F5A435','#D9810E','#A8650B']
const BASKET_TABLES = [
  { t:'T2', pct:88, amt:'32,40€' }, { t:'T7', pct:76, amt:'28,10€' },
  { t:'T4', pct:67, amt:'24,80€' }, { t:'T1', pct:61, amt:'22,50€' },
  { t:'T3', pct:52, amt:'19,30€' }, { t:'T5', pct:42, amt:'15,70€' },
]

type ConvexPayment = {
  totalCents: number; tipCents: number; subtotalCents: number;
  createdAt: number; status: string; guests: number
}

function Sparkline({ path, color = '#E8920A' }: { path: string; color?: string }) {
  return (
    <svg width="60" height="22" viewBox="0 0 60 22" fill="none" style={{ position: 'absolute', bottom: 14, right: 14, opacity: 0.9 }}>
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
  const restaurantId   = useRestaurantId()
  const restaurant     = useRestaurant()
  const rawPayments    = useQuery(api.payments.list,              restaurantId ? { restaurantId } : 'skip')
  const latestInsights = useQuery(api.insights.getLatestInsights, restaurantId ? { restaurantId } : 'skip')
  const isPro          = restaurant?.plan === 'pro'

  const payments = (rawPayments ?? []) as ConvexPayment[]

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
  const weekTotal = encaisse.reduce((s, p) => s + p.totalCents, 0)
  const tipsTotal = encaisse.reduce((s, p) => s + p.tipCents, 0)
  const totalTickets = encaisse.length
  const avgBasket = totalTickets > 0
    ? encaisse.reduce((s, p) => s + p.subtotalCents, 0) / totalTickets / 100
    : 20.66
  const avgTipPct = weekTotal > 0 ? ((tipsTotal / (weekTotal - tipsTotal)) * 100).toFixed(1) : '9,8'

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
              value: weekTotal > 0 ? formatEur(weekTotal) : '3 842,60€',
              delta: '+18,4%', up: true, vs: 'vs. 3 245€',
              spark: 'M0 16 L8 14 L16 17 L24 11 L32 13 L40 8 L48 9 L60 4',
              sparkColor: '#E8920A',
            },
            {
              label: 'Tickets payés', accent: false,
              value: totalTickets > 0 ? String(totalTickets) : '186',
              delta: '+12 tickets', up: true, vs: 'vs. 174',
              spark: 'M0 14 L8 16 L16 13 L24 14 L32 11 L40 12 L48 8 L60 9',
              sparkColor: 'var(--ds-text-primary)',
            },
            {
              label: 'Panier moyen', accent: false,
              value: avgBasket > 0 ? `${avgBasket.toFixed(2).replace('.', ',')}€` : '20,66€',
              delta: '+5,7%', up: true, vs: 'vs. 19,55€',
              spark: 'M0 12 L8 15 L16 11 L24 13 L32 9 L40 11 L48 7 L60 8',
              sparkColor: 'var(--ds-text-primary)',
            },
            {
              label: 'Temps moyen / table', accent: false,
              value: '42', suffix: 'min',
              delta: '−6 min', up: false, vs: 'rotation +14%',
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
                style={{ fontSize: '28px', color: kpi.accent ? 'var(--ds-accent)' : 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
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
                Comparaison ce mois (mai) vs. mois précédent (avril)
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px] ds-text-secondary flex-shrink-0">
              {/* Chart stats */}
              <div className="hidden md:flex items-center gap-6">
                <div><div className="text-[10.5px] ds-text-tertiary uppercase tracking-[0.07em]">Pic</div><div className="font-semibold text-[13px] ds-text-primary">312€ <span className="text-[11px] ds-text-tertiary font-normal">· Sam. 17 mai</span></div></div>
                <div><div className="text-[10.5px] ds-text-tertiary uppercase tracking-[0.07em]">Jour moyen</div><div className="font-semibold text-[13px] ds-text-primary">137,24€</div></div>
                <div><div className="text-[10.5px] ds-text-tertiary uppercase tracking-[0.07em]">Tendance</div><div className="font-semibold text-[13px]" style={{ color: 'var(--ds-success-strong)' }}>+18,4%</div></div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-[2px] rounded-full inline-block" style={{ background: '#E8920A' }} />
                  <span className="text-[11.5px] ds-text-secondary">Ce mois</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-[2px] rounded-full inline-block" style={{ background: '#A1A1AA', borderTop: '1px dashed #A1A1AA', display: 'block', height: 0 }} />
                  <span className="text-[11.5px] ds-text-secondary">Avril</span>
                </span>
              </div>
            </div>
          </div>
          <div className="p-5 pb-2">
            <svg viewBox="0 0 920 260" preserveAspectRatio="none" style={{ width: '100%', height: '220px', display: 'block' }}>
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8920A" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#E8920A" stopOpacity="0" />
                </linearGradient>
                <pattern id="analyticsGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ds-bg-subtle)" strokeWidth="1" />
                </pattern>
              </defs>
              {/* Grid */}
              <rect width="920" height="220" y="10" fill="url(#analyticsGrid)" />
              {/* Y-axis labels */}
              <g fontFamily="Inter" fontSize="10.5" fill="var(--ds-text-tertiary)">
                <text x="8" y="22">320€</text>
                <text x="8" y="70">240€</text>
                <text x="8" y="118">160€</text>
                <text x="8" y="166">80€</text>
                <text x="8" y="214">0€</text>
              </g>
              {/* Baseline */}
              <line x1="46" y1="210" x2="920" y2="210" stroke="var(--ds-border)" strokeWidth="1" />
              {/* Previous month dashed */}
              <path d="M50 178 L80 168 L110 175 L140 158 L170 162 L200 148 L230 152 L260 138 L290 145 L320 130 L350 138 L380 122 L410 135 L440 118 L470 128 L500 110 L530 122 L560 105 L590 118 L620 100 L650 112 L680 96 L710 108 L740 92 L770 104 L800 90 L830 95 L860 88 L890 92 L910 90"
                stroke="#A1A1AA" strokeWidth="1.5" fill="none" strokeDasharray="4 4" strokeLinecap="round" />
              {/* Current month area */}
              <path d="M50 188 L80 175 L110 165 L140 170 L170 142 L200 152 L230 132 L260 140 L290 118 L320 125 L350 95 L380 110 L410 85 L440 100 L470 72 L500 88 L530 60 L560 75 L590 50 L620 65 L650 38 L680 55 L710 30 L740 48 L770 25 L800 42 L830 18 L860 35 L890 28 L910 22 L910 210 L50 210 Z"
                fill="url(#chartFill)" />
              {/* Current month line */}
              <path d="M50 188 L80 175 L110 165 L140 170 L170 142 L200 152 L230 132 L260 140 L290 118 L320 125 L350 95 L380 110 L410 85 L440 100 L470 72 L500 88 L530 60 L560 75 L590 50 L620 65 L650 38 L680 55 L710 30 L740 48 L770 25 L800 42 L830 18 L860 35 L890 28 L910 22"
                stroke="#E8920A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Peak marker */}
              <circle cx="830" cy="18" r="4.5" fill="white" stroke="#E8920A" strokeWidth="2" />
              <line x1="830" y1="22" x2="830" y2="210" stroke="#E8920A" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
              {/* Today indicator */}
              <line x1="910" y1="10" x2="910" y2="210" stroke="var(--ds-text-primary)" strokeWidth="1" strokeDasharray="2 3" opacity="0.2" />
              <text x="900" y="9" fontFamily="monospace" fontSize="9" fill="var(--ds-text-primary)" textAnchor="end" letterSpacing="0.04em" opacity="0.5">AUJ.</text>
              {/* X-axis labels */}
              <g fontFamily="Inter" fontSize="10" fill="var(--ds-text-tertiary)">
                <text x="50" y="232" textAnchor="middle">1</text>
                <text x="200" y="232" textAnchor="middle">5</text>
                <text x="350" y="232" textAnchor="middle">10</text>
                <text x="500" y="232" textAnchor="middle">15</text>
                <text x="650" y="232" textAnchor="middle">20</text>
                <text x="800" y="232" textAnchor="middle">25</text>
                <text x="910" y="232" textAnchor="middle">29</text>
              </g>
              <text x="465" y="252" textAnchor="middle" fontFamily="Inter" fontSize="10.5" fill="var(--ds-text-tertiary)" letterSpacing="0.08em" fontWeight="600">MAI 2026</text>
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
              {BASKET_TABLES.map(row => (
                <div key={row.t} className="flex items-center gap-3">
                  <span
                    className="font-bold text-[11.5px] w-7 text-center rounded-[5px] py-[2px] flex-shrink-0"
                    style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
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
              ))}
            </div>
            <div
              className="flex items-center justify-between px-5 py-3 border-t text-[12.5px]"
              style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
            >
              <span className="ds-text-secondary">Panier moyen restaurant</span>
              <span className="font-semibold ds-text-primary tabular-nums">
                {avgBasket > 0 ? `${avgBasket.toFixed(2).replace('.', ',')}€` : '20,66€'}
                <span className="ml-1.5 text-[11.5px] font-semibold" style={{ color: 'var(--ds-success-strong)' }}>+5,7%</span>
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
                Sam. 20-21h
              </span>
            </div>
            <div className="px-4 pt-3 pb-2">
              {/* Hour labels */}
              <div className="flex items-center mb-1.5">
                <div className="w-7" />
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${HEAT_HOURS.length}, 1fr)` }}>
                  {HEAT_HOURS.map(h => (
                    <div key={h} className="text-center text-[9.5px] ds-text-tertiary">{h}</div>
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
                          background: HEAT_COLORS[HEAT_DATA[hi][di]] ?? '#F4F4F5',
                          border: HEAT_DATA[hi][di] === 5 ? '1px solid rgba(168,101,11,0.4)' : 'none',
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
                <TrendingUp size={9} />
                +2,3 pts
              </span>
            </div>
            <div className="px-5 py-4">
              {/* Main value + sparkline */}
              <div className="flex items-start gap-5">
                <div>
                  <div
                    className="font-extrabold tabular-nums leading-none tracking-[-0.04em]"
                    style={{ fontSize: '40px', color: 'var(--ds-accent)', fontFamily: 'Inter, sans-serif' }}
                  >
                    {avgTipPct}%
                  </div>
                  <div className="text-[12px] ds-text-secondary mt-1.5 leading-[1.5]">
                    {formatEur(tipsTotal > 0 ? tipsTotal : 37890)} collectés
                    <br />
                    <span className="ds-text-tertiary">+58% vs. avant Splitzy</span>
                  </div>
                </div>
                <div className="flex-1">
                  <svg viewBox="0 0 300 80" preserveAspectRatio="none" style={{ width: '100%', height: '70px' }}>
                    <defs>
                      <linearGradient id="tipsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E8920A" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#E8920A" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="55" x2="300" y2="55" stroke="var(--ds-border)" strokeWidth="1" strokeDasharray="2 3" />
                    <text x="300" y="52" fontFamily="Inter" fontSize="9.5" fill="var(--ds-text-tertiary)" textAnchor="end">secteur 6,2%</text>
                    <path d="M0 50 L30 48 L60 52 L90 40 L120 42 L150 35 L180 38 L210 25 L240 30 L270 20 L300 22 L300 80 L0 80 Z" fill="url(#tipsFill)" />
                    <path d="M0 50 L30 48 L60 52 L90 40 L120 42 L150 35 L180 38 L210 25 L240 30 L270 20 L300 22" stroke="#E8920A" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="300" cy="22" r="3.5" fill="white" stroke="#E8920A" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              {/* Stats rows */}
              <div className="mt-4 space-y-2.5 border-t pt-3" style={{ borderColor: 'var(--ds-border)' }}>
                {[
                  { label: 'Médiane', value: '10%' },
                  { label: '% tickets avec pourboire', value: '68%' },
                  { label: 'Meilleure table', value: 'T2 · 14%' },
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
                  ROI · 8 mois
                </span>
              </div>
              <div
                className="font-extrabold tracking-[-0.04em] leading-none tabular-nums"
                style={{ fontSize: '48px', color: 'white', fontFamily: 'Inter, sans-serif' }}
              >
                + <span>14 287€</span>
              </div>
              <div className="text-[12px] mt-2" style={{ color: '#71717A' }}>
                Activation le 1<sup>er</sup> oct. 2025 · 4,2× l'investissement
              </div>
              <div className="mt-5 space-y-2.5 border-t pt-4" style={{ borderColor: '#27272A' }}>
                {[
                  { label: 'Pourboires additionnels',       value: '+1 842€'  },
                  { label: 'Rotation de table accélérée',   value: '+8 920€'  },
                  { label: 'Avis Google sauvés (×27)',       value: '+3 525€'  },
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

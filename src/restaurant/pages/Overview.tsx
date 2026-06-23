import { useQuery } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId, useRestaurant } from '../context/RestaurantContext'
import { formatEur } from '../../utils/formatCurrency'
import { deltaPct } from '../lib/billing'
import {
  Euro, Grid3x3, HandCoins, Sparkles, Star,
  Activity, ArrowRight, TrendingUp, CheckCircle2,
  AlertTriangle, Clock, UtensilsCrossed,
} from 'lucide-react'

type ConvexTable   = { number: number; status: string; amountCents?: number; paidCents?: number; durationMinutes?: number; alert?: boolean }
type ConvexPayment = { tableNumber: number; totalCents: number; tipCents: number; subtotalCents: number; createdAt: number; dateLabel: string; status: string; guests: number }
type ConvexFeedback = { stars: number; isNew?: boolean }

const NOW = new Date()
const DATE_FR = NOW.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`ds-panel ${className}`}>{children}</div>
  )
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 border-b gap-3"
      style={{ borderColor: 'var(--ds-border)' }}
    >
      {children}
    </div>
  )
}

function PanelTitle({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-bold text-[14.5px] tracking-[-0.015em]" style={{ color: 'var(--ds-text-primary)' }}>
      {Icon && <Icon size={15} style={{ color: 'var(--ds-text-tertiary)' }} />}
      {children}
    </div>
  )
}

function RealtimeTag() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11.5px] font-medium"
      style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: 'var(--ds-success)',
          animation: 'ds-live-blink 1.6s ease-in-out infinite',
          boxShadow: '0 0 0 0 rgba(34,197,94,0.5)',
        }}
      />
      Temps réel
    </span>
  )
}

function PanelLink({ to, label }: { to: string; label: string }) {
  return (
    <a
      href={to}
      className="inline-flex items-center gap-1 text-[12.5px] font-medium transition-colors ds-text-secondary hover:ds-text-accent-strong"
    >
      {label}
      <ArrowRight size={13} />
    </a>
  )
}

// ── Table card (small, for overview grid) ──────────────────────
function TableCardSmall({ table }: { table: ConvexTable }) {
  const status = table.status
  const dur = table.durationMinutes

  let bg = 'var(--ds-bg-subtle)'
  let border = 'transparent'
  let numColor = 'var(--ds-text-tertiary)'
  let stateColor = 'var(--ds-text-tertiary)'
  let stateText = 'Libre'
  let amountText = ''

  if (status === 'dining') {
    bg = '#18181B'
    border = '#18181B'
    numColor = '#FAFAFA'
    stateColor = '#A1A1AA'
    stateText = dur ? `En repas · ${dur}min` : 'En repas'
    if (table.amountCents) amountText = formatEur(table.amountCents)
  } else if (status === 'payment') {
    bg = 'var(--ds-accent-soft)'
    border = '#F5DDB3'
    numColor = 'var(--ds-accent-strong)'
    stateColor = 'var(--ds-accent-strong)'
    stateText = 'En paiement'
    const paid = table.paidCents ?? 0
    const total = table.amountCents ?? 0
    if (total > 0) amountText = paid > 0 ? `${formatEur(paid)} / ${formatEur(total)}` : formatEur(total)
  } else if (status === 'paid') {
    bg = 'var(--ds-success-soft)'
    border = '#C6F0D2'
    numColor = 'var(--ds-success-strong)'
    stateColor = 'var(--ds-success-strong)'
    stateText = table.paidCents ? `${formatEur(table.paidCents)} réglés` : 'Réglée'
  }

  return (
    <div
      className="rounded-[10px] p-3 flex flex-col gap-1.5 relative cursor-pointer transition-all hover:-translate-y-px"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        minHeight: '80px',
        boxShadow: status !== 'free' ? 'var(--ds-shadow-sm)' : 'none',
      }}
    >
      {status === 'paid' && (
        <CheckCircle2
          size={14}
          className="absolute top-3 right-3"
          style={{ color: 'var(--ds-success)' }}
        />
      )}
      {table.alert && status !== 'paid' && (
        <span
          className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[9.5px] font-semibold"
          style={{ background: '#2A2A2A', color: '#F5A030' }}
        >
          <AlertTriangle size={9} />
          {table.durationMinutes}min
        </span>
      )}
      <div className="font-bold text-[13px] tracking-[-0.01em]" style={{ color: numColor }}>
        Table {table.number}
      </div>
      <div className="text-[11px] font-medium leading-[1.3]" style={{ color: stateColor }}>
        {stateText}
      </div>
      {amountText && (
        <div
          className="font-bold text-[14px] mt-auto tabular-nums tracking-[-0.015em]"
          style={{ color: numColor }}
        >
          {amountText}
        </div>
      )}
    </div>
  )
}

// ── Activity row ────────────────────────────────────────────────
function ActivityRow({ payment, isLast }: { payment: ConvexPayment; isLast: boolean }) {
  return (
    <div
      className="grid gap-3.5 items-center py-[11px]"
      style={{
        gridTemplateColumns: '14px 36px 1fr auto auto',
        borderBottom: isLast ? 'none' : `1px solid var(--ds-border)`,
        fontSize: '13px',
      }}
    >
      <span className="w-[7px] h-[7px] rounded-full justify-self-center" style={{ background: 'var(--ds-success)' }} />
      <span className="font-semibold text-[11.5px] px-[7px] py-[3px] rounded-[5px] text-center tabular-nums" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)' }}>
        T{payment.tableNumber}
      </span>
      <span style={{ color: 'var(--ds-text-primary)', fontWeight: 500 }}>
        Paiement encaissé{' '}
        <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 400 }}>· {payment.guests} conv. · part. par article</span>
      </span>
      <span className="font-bold tabular-nums" style={{ color: 'var(--ds-success-strong)', fontSize: '13px' }}>
        +{formatEur(payment.totalCents)}
      </span>
      <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'monospace' }}>
        {payment.dateLabel}
      </span>
    </div>
  )
}

/* ── Insights IA ────────────────────────────────────────────────── */

type Insight = {
  type: string; priority: string; title: string; body: string
  metric?: string; action?: string
}

const PRIORITY_CONFIG = {
  high:   { dotBg: '#EF4444', textColor: '#EF4444', cardBg: 'var(--ds-error-soft)' },
  medium: { dotBg: '#E8920A', textColor: '#E8920A', cardBg: 'var(--ds-accent-soft)' },
  low:    { dotBg: 'var(--ds-text-tertiary)', textColor: 'var(--ds-text-secondary)', cardBg: 'var(--ds-bg-base)' },
} as const

const TYPE_ICON = {
  revenue:    TrendingUp,
  reputation: Star,
  operations: Clock,
  menu:       UtensilsCrossed,
} as const

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'il y a moins d\'1h'
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d} jour${d > 1 ? 's' : ''}`
}

function InsightCard({ insight }: { insight: Insight }) {
  const cfg  = PRIORITY_CONFIG[(insight.priority as keyof typeof PRIORITY_CONFIG)] ?? PRIORITY_CONFIG.low
  const Icon = TYPE_ICON[(insight.type as keyof typeof TYPE_ICON)] ?? Sparkles
  return (
    <div className="rounded-[10px] p-3.5 flex flex-col gap-2" style={{ background: cfg.cardBg, border: '1px solid var(--ds-border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: cfg.textColor, flexShrink: 0 }} />
          <span className="font-semibold text-[13px] leading-[1.35] ds-text-primary">{insight.title}</span>
        </div>
        {insight.metric && (
          <span className="text-[12px] font-bold flex-shrink-0 tabular-nums" style={{ color: cfg.textColor }}>{insight.metric}</span>
        )}
      </div>
      <p className="text-[12px] ds-text-secondary leading-[1.5]">{insight.body}</p>
      {insight.action && (
        <p className="text-[11.5px] font-medium" style={{ color: cfg.textColor }}>→ {insight.action}</p>
      )}
    </div>
  )
}

function InsightsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Sparkles size={24} style={{ color: 'var(--ds-border-strong)' }} />
      <p className="text-[13px] ds-text-secondary">Les insights seront générés cette nuit à 3h</p>
      <p className="text-[11.5px] ds-text-tertiary">Ils apparaîtront ici dès que vous aurez des données de paiement</p>
    </div>
  )
}

function InsightsProLock() {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center px-4">
      <Sparkles size={28} style={{ color: '#E8920A' }} />
      <p className="font-semibold text-[13.5px] ds-text-primary">Insights IA</p>
      <p className="text-[12px] ds-text-secondary leading-[1.5] max-w-[220px]">
        Recommandations personnalisées générées chaque nuit. Disponible avec le Plan Pro.
      </p>
      <button
        className="text-[12.5px] font-semibold transition-colors"
        style={{ color: '#E8920A' }}
        onClick={() => window.location.href = '/restaurant/settings?section=plan'}
      >
        Passer au Plan Pro →
      </button>
    </div>
  )
}

export function Overview() {
  const restaurantId = useRestaurantId()
  const restaurant   = useRestaurant()
  const navigate     = useNavigate()

  const stats          = useQuery(api.payments.getOverviewStats, restaurantId ? { restaurantId } : 'skip')
  const rawTables      = useQuery(api.tables.list,               restaurantId ? { restaurantId } : 'skip')
  const rawPayments    = useQuery(api.payments.list,             restaurantId ? { restaurantId } : 'skip')
  const rawFeedbacks   = useQuery(api.feedbacks.list,            restaurantId ? { restaurantId } : 'skip')
  const latestInsights = useQuery(api.insights.getLatestInsights, restaurantId ? { restaurantId } : 'skip')

  const isPro = restaurant?.plan === 'pro'

  const isLoading = rawTables === undefined

  // ── KPIs ──────────────────────────────────────────────────────
  const caTotal   = stats?.todayCA   ?? 0
  const tipsTotal = stats?.todayTips ?? 0
  const avgTipPct = stats?.avgTipPct ?? '0'

  const feedbacks = (rawFeedbacks ?? []) as ConvexFeedback[]
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.stars, 0) / feedbacks.length).toFixed(1)
    : null

  // Avis négatifs (≤ 2★) non encore consultés → bannière alerte service.
  const badNew = feedbacks.filter(f => f.stars <= 2 && f.isNew)

  // ── Tables live ───────────────────────────────────────────────
  const tables = (rawTables ?? []) as ConvexTable[]
  const activeTables  = tables.filter(t => t.status !== 'free').length
  const paymentTables = tables.filter(t => t.status === 'payment').length
  const totalTables   = tables.length

  // ── Recent payments ───────────────────────────────────────────
  const payments = (rawPayments ?? []) as ConvexPayment[]
  const recentPayments = payments.slice(0, 6)

  // ── Croissance réelle vs hier (null si pas de CA hier → "—") ──
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = startOfToday.getTime() - 86400000
  const yesterdayCA = payments
    .filter(p => p.status === 'Encaissé' && p.createdAt >= startOfYesterday && p.createdAt < startOfToday.getTime())
    .reduce((s, p) => s + p.totalCents, 0)
  const caDeltaPct = deltaPct(caTotal, yesterdayCA)

  // ── Réputation réelle (score = note moyenne ramenée sur 100) ──
  const negCount  = feedbacks.filter(f => f.stars <= 3).length
  const topCount  = feedbacks.filter(f => f.stars >= 5).length
  const avgNum    = avgRating !== null ? parseFloat(avgRating) : null
  const repScore  = avgNum !== null ? Math.round(avgNum * 20) : null
  const notePct      = avgNum !== null ? Math.round((avgNum / 5) * 100) : 0
  const interceptPct = feedbacks.length > 0 ? Math.round((negCount / feedbacks.length) * 100) : 0

  return (
    <RestaurantLayout>
      <PageHeader
        title="Vue d'ensemble"
        subtitle={
          <>
            <span className="capitalize">{DATE_FR}</span>
            <span style={{ color: 'var(--ds-text-tertiary)' }}>·</span>
            <span>Tableau de bord temps réel</span>
          </>
        }
        live
      />

      <div className="px-9 py-6 space-y-5">

        {/* ── KPI Row ── */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">

          {/* CA du jour */}
          <div className="ds-panel flex flex-col gap-3 p-5 relative min-h-[132px]">
            <div className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
              <Euro size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              CA du jour
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <div
                className="font-extrabold tabular-nums leading-none tracking-[-0.035em]"
                style={{ fontSize: '34px', color: 'var(--ds-accent)', fontFamily: 'Inter, sans-serif' }}
              >
                {caTotal > 0 ? formatEur(caTotal) : '0€'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] ds-text-secondary">
              {caTotal > 0 && caDeltaPct !== null ? (
                <>
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${caDeltaPct >= 0 ? 'ds-text-success-strong' : ''}`}
                    style={caDeltaPct < 0 ? { color: 'var(--ds-error-strong)' } : undefined}
                  >
                    <TrendingUp size={12} />
                    {caDeltaPct >= 0 ? '+' : ''}{caDeltaPct}%
                  </span>
                  <span>vs hier</span>
                </>
              ) : caTotal > 0 ? (
                <span>Pas de CA hier pour comparer</span>
              ) : (
                <span>Aucune vente aujourd'hui</span>
              )}
            </div>
            {/* Sparkline */}
            <svg className="absolute bottom-4 right-4 opacity-80" width="64" height="22" viewBox="0 0 64 22" fill="none">
              <path
                d="M1 16 L9 14 L17 17 L25 11 L33 13 L41 8 L49 9 L57 4 L63 5"
                stroke="#E8920A"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Tables actives */}
          <div className="ds-panel flex flex-col gap-3 p-5 min-h-[132px]">
            <div className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
              <Grid3x3 size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Tables actives
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#E8920A] border-t-transparent animate-spin" />
              ) : (
                <div
                  className="font-extrabold tabular-nums leading-none tracking-[-0.035em]"
                  style={{ fontSize: '34px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
                >
                  {activeTables}
                  <span className="text-[18px] font-semibold ds-text-tertiary ml-[-1px]">/{totalTables}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] ds-text-secondary">
              {paymentTables > 0 ? (
                <span
                  className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[11.5px] font-semibold"
                  style={{ background: 'var(--ds-accent-soft)', color: 'var(--ds-accent-strong)' }}
                >
                  {paymentTables} en paiement
                </span>
              ) : (
                <span>Toutes libres</span>
              )}
            </div>
          </div>

          {/* Score Splitzy — dérivé des feedbacks réels ("—" si aucun) */}
          <div className="ds-panel flex flex-col gap-3 p-5 min-h-[132px] relative overflow-hidden">
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(232,146,10,0.10), transparent 70%)' }}
            />
            <div className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
              <Sparkles size={13} style={{ color: 'var(--ds-accent)' }} />
              Score Splitzy
            </div>
            <div className="flex items-center gap-3.5 mt-auto">
              {/* Mini gauge */}
              <div className="relative w-[72px] h-[72px] flex-shrink-0">
                <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-135deg)', overflow: 'visible' }}>
                  <circle cx="36" cy="36" r="28" fill="none" stroke="var(--ds-bg-subtle)" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray="132 176" strokeDashoffset="0" />
                  <circle cx="36" cy="36" r="28" fill="none" stroke="#E8920A" strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={`${Math.round(((repScore ?? 0) / 100) * 132)} 176`} strokeDashoffset="0" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
                  <div
                    className="font-black leading-none tabular-nums tracking-[-0.04em]"
                    style={{ fontSize: '20px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
                  >
                    {repScore ?? '—'}
                  </div>
                  <div className="text-[9.5px] font-semibold ds-text-tertiary mt-[2px]">/ 100</div>
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="font-bold text-[13px] tracking-[-0.015em] ds-text-primary">
                  {repScore === null ? 'Aucun feedback' : repScore >= 80 ? 'Très bon' : repScore >= 60 ? 'Bon' : 'À surveiller'}
                </div>
                {[
                  { label: 'Note', pct: notePct },
                  { label: 'Intercep.', pct: interceptPct },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-1.5 text-[10.5px] ds-text-tertiary">
                    <span className="w-[38px] flex-shrink-0">{row.label}</span>
                    <div
                      className="flex-1 h-[3px] rounded-full overflow-hidden"
                      style={{ background: 'var(--ds-bg-subtle)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.pct}%`, background: 'var(--ds-accent)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pourboires */}
          <div className="ds-panel flex flex-col gap-3 p-5 min-h-[132px]">
            <div className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
              <HandCoins size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Pourboires
            </div>
            <div className="flex items-baseline gap-2 mt-auto">
              <div
                className="font-extrabold tabular-nums leading-none tracking-[-0.035em]"
                style={{ fontSize: '34px', color: 'var(--ds-success)', fontFamily: 'Inter, sans-serif' }}
              >
                {formatEur(tipsTotal)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] ds-text-secondary">
              {tipsTotal > 0 ? (
                <>
                  <span className="inline-flex items-center gap-0.5 font-semibold ds-text-success-strong">
                    <TrendingUp size={12} />
                    {avgTipPct}%
                  </span>
                  <span>moy. sur addition</span>
                </>
              ) : (
                <span>Aucun pourboire</span>
              )}
            </div>
          </div>
        </section>

        {/* ── Alerte avis négatifs non traités ── */}
        {badNew.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">{badNew.length} avis négatif(s) non traité(s) ce service</span>
            <button onClick={() => navigate('/restaurant/reputation')} className="ml-auto text-xs underline">Voir →</button>
          </div>
        )}

        {/* ── Main grid ── */}
        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3.5">

          {/* Tables live */}
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle icon={Grid3x3}>Tables live</PanelTitle>
                <div className="text-[12px] mt-0.5 ds-text-tertiary">Mise à jour en continu via QR code</div>
              </div>
              <RealtimeTag />
            </PanelHeader>
            <div className="p-[18px] px-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-[#E8920A] border-t-transparent animate-spin" />
                </div>
              ) : tables.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2 ds-text-tertiary text-sm">
                  <span className="text-2xl">🪑</span>
                  <span>Aucune table configurée</span>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2.5">
                  {tables.slice(0, 10).map(t => (
                    <TableCardSmall key={t.number} table={t} />
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* Right column */}
          <div className="flex flex-col gap-3.5">

            {/* Insights IA */}
            <Panel className="relative">
              <div
                className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-[2px]"
                style={{ background: 'var(--ds-accent)' }}
              />
              <PanelHeader>
                <PanelTitle>
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-[6px]"
                    style={{ background: 'var(--ds-accent-soft)' }}
                  >
                    <Sparkles size={14} style={{ color: 'var(--ds-accent)' }} />
                  </span>
                  Insights IA
                </PanelTitle>
                {latestInsights && isPro && (
                  <span className="text-[11.5px] ds-text-tertiary tabular-nums">
                    {formatRelativeDate(latestInsights.generatedAt)}
                  </span>
                )}
              </PanelHeader>
              <div className="px-5 pb-4 pt-3">
                {!isPro ? (
                  <InsightsProLock />
                ) : !latestInsights ? (
                  <InsightsEmptyState />
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-2.5">
                      {(latestInsights.insights as Insight[]).map((insight, i) => (
                        <InsightCard key={i} insight={insight} />
                      ))}
                    </div>
                    <div
                      className="flex items-center justify-between pt-3.5 mt-2 border-t gap-2"
                      style={{ borderColor: 'var(--ds-border)' }}
                    >
                      <span className="text-[11.5px] ds-text-tertiary">{latestInsights.insights.length} insights · {latestInsights.period}</span>
                      <PanelLink to="/restaurant/analytics" label="Voir l'historique" />
                    </div>
                  </>
                )}
              </div>
            </Panel>

            {/* Réputation rapide */}
            <Panel>
              <PanelHeader>
                <PanelTitle icon={Star}>Réputation rapide</PanelTitle>
                <PanelLink to="/restaurant/reputation" label="Détails" />
              </PanelHeader>
              <div className="px-5 pt-4 pb-[18px]">
                <div className="grid grid-cols-2 gap-3.5 mb-3">
                  {[
                    // Pas d'intégration Google Business : aucune note Google réelle à
                    // afficher — "—" tant que la connexion n'existe pas.
                    {
                      label: 'Note Google',
                      value: '—',
                      delta: 'non connecté',
                      hasDelta: false,
                    },
                    {
                      label: 'Note Splitzy',
                      value: avgRating ?? '—',
                      delta: `${feedbacks.length} avis`,
                      hasDelta: feedbacks.length > 0,
                    },
                  ].map(cell => (
                    <div
                      key={cell.label}
                      className="p-3.5 rounded-[10px] border"
                      style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                    >
                      <div className="text-[11px] font-medium uppercase tracking-[0.06em] ds-text-secondary">
                        {cell.label}
                      </div>
                      <div
                        className="flex items-center gap-1 font-extrabold tabular-nums mt-2 tracking-[-0.025em] leading-[1.1]"
                        style={{ fontSize: '22px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
                      >
                        {cell.value}
                        <Star size={18} fill="#E8920A" style={{ color: '#E8920A' }} />
                      </div>
                      <div
                        className={`flex items-center gap-[3px] mt-1 text-[11.5px] font-semibold ${cell.hasDelta ? 'ds-text-success-strong' : 'ds-text-tertiary'}`}
                      >
                        {cell.hasDelta && <TrendingUp size={11} />}
                        {cell.delta}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Flow: intercepted → Google */}
                <div
                  className="flex items-center gap-3 p-3.5 rounded-[10px] border text-[12.5px]"
                  style={{
                    background: 'linear-gradient(to right, var(--ds-error-soft), transparent 30%, transparent 70%, var(--ds-success-soft))',
                    borderColor: 'var(--ds-border)',
                  }}
                >
                  <div className="flex flex-col gap-[2px] flex-1">
                    <span
                      className="font-extrabold text-[18px] leading-none tabular-nums tracking-[-0.02em]"
                      style={{ color: 'var(--ds-error)', fontFamily: 'Inter, sans-serif' }}
                    >
                      {negCount}
                    </span>
                    <span className="text-[11px] leading-[1.3] ds-text-secondary">
                      Feedbacks<br />interceptés
                    </span>
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                  <div className="flex flex-col gap-[2px] flex-1 text-right">
                    <span
                      className="font-extrabold text-[18px] leading-none tabular-nums tracking-[-0.02em]"
                      style={{ color: 'var(--ds-success)', fontFamily: 'Inter, sans-serif' }}
                    >
                      {topCount}
                    </span>
                    <span className="text-[11px] leading-[1.3] ds-text-secondary">
                      Transformés<br />en 5★ Google
                    </span>
                  </div>
                </div>
              </div>
            </Panel>

          </div>
        </section>

        {/* ── Activity ── */}
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle icon={Activity}>Activité récente</PanelTitle>
              <div className="text-[12px] mt-0.5 ds-text-tertiary">Les 6 dernières opérations</div>
            </div>
            <PanelLink to="/restaurant/factures" label="Tout voir" />
          </PanelHeader>
          <div className="px-5 pt-1 pb-3">
            {recentPayments.length > 0
              ? recentPayments.slice(0, 6).map((p, i) => (
                  <ActivityRow key={i} payment={p} isLast={i === Math.min(recentPayments.length, 6) - 1} />
                ))
              : (
                <div className="py-8 text-center text-[12.5px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                  Aucune activité pour le moment — les paiements Splitzy apparaîtront ici en temps réel.
                </div>
              )
            }
          </div>
        </Panel>

      </div>
    </RestaurantLayout>
  )
}

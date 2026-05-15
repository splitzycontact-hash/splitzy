import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { useRestaurantId } from '../../hooks/useRestaurant'
import { formatEur } from '../../utils/formatCurrency'

const STATUS_COLORS: Record<string, string> = {
  violet: 'bg-purple-100 text-purple-700',
  amber:  'bg-orange-100 text-orange-700',
  green:  'bg-green-100 text-green-700',
  gray:   'bg-gray-100 text-gray-500',
}

const BAR_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

type ConvexTable   = { number: number; status: string; amountCents?: number; alert?: boolean }
type ConvexPayment = { tableNumber: number; totalCents: number; tipCents: number; subtotalCents: number; createdAt: number; dateLabel: string; status: string }
type ConvexFeedback = { stars: number }

export function Overview() {
  const restaurantId = useRestaurantId()

  const stats       = useQuery(api.payments.getOverviewStats, restaurantId ? { restaurantId } : 'skip')
  const rawTables   = useQuery(api.tables.list,               restaurantId ? { restaurantId } : 'skip')
  const rawPayments = useQuery(api.payments.list,             restaurantId ? { restaurantId } : 'skip')
  const rawFeedbacks= useQuery(api.feedbacks.list,            restaurantId ? { restaurantId } : 'skip')

  const isLoading = stats === undefined || rawTables === undefined

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const caTotal   = stats?.todayCA   ?? 0
  const tipsTotal = stats?.todayTips ?? 0
  const avgTipPct = stats?.avgTipPct ?? '0'

  const feedbacks = (rawFeedbacks ?? []) as ConvexFeedback[]
  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.stars, 0) / feedbacks.length).toFixed(1)
    : null

  // ── Tables live ──────────────────────────────────────────────────────────
  type TableColor = 'violet' | 'amber' | 'green' | 'gray'
  const statusToColor: Record<string, TableColor> = {
    dining: 'violet', payment: 'amber', paid: 'green', free: 'gray',
  }
  const statusToLabel = (t: ConvexTable) => {
    if (t.status === 'dining')  return 'En repas'
    if (t.status === 'payment') return '⏳ Paiement'
    if (t.status === 'paid')    return t.amountCents ? `${formatEur(t.amountCents)} payé` : '✓ Payé'
    return 'Libre'
  }

  const tables = (rawTables ?? []) as ConvexTable[]
  const overviewTables = tables.slice(0, 9).map(t => ({
    id: `T${t.number}`,
    color: statusToColor[t.status] ?? 'gray',
    label: statusToLabel(t),
    alert: t.status === 'payment' && t.alert,
  }))
  const activeTables  = tables.filter(t => t.status !== 'free').length
  const paymentTables = tables.filter(t => t.status === 'payment').length
  const totalTables   = tables.length

  // ── Revenus de la semaine (7 derniers jours) ──────────────────────────────
  const payments = (rawPayments ?? []) as ConvexPayment[]
  const now = Date.now()
  const DAY_MS = 86_400_000
  // index 0 = lundi, ..., 6 = dimanche (en remontant 6 jours depuis aujourd'hui)
  const weekRevenue = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * DAY_MS
    const dayEnd   = dayStart + DAY_MS
    return payments
      .filter(p => p.status === 'Encaissé' && p.createdAt >= dayStart && p.createdAt < dayEnd)
      .reduce((s, p) => s + p.totalCents, 0)
  })
  const weekTotal = weekRevenue.reduce((s, v) => s + v, 0)
  const maxRevenue = Math.max(...weekRevenue, 1)
  const barHeights = weekRevenue.map(v => Math.round((v / maxRevenue) * 90) + 5)

  // ── Activité récente (5 derniers paiements) ───────────────────────────────
  const recentPayments = payments.slice(0, 5)

  return (
    <RestaurantLayout>
      <Topbar
        title="Vue d'ensemble"
        subtitle="Tableau de bord temps réel"
        live
      />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="CA DU JOUR" value={formatEur(caTotal)}
            sub={caTotal > 0 ? undefined : 'Aucune vente aujourd\'hui'}
            subColor="text-muted" accent="text-brand" />
          <KpiCard
            label="TABLES ACTIVES"
            value={`${activeTables} / ${totalTables}`}
            sub={paymentTables > 0 ? `${paymentTables} en paiement` : 'Toutes libres'}
            subColor={paymentTables > 0 ? 'text-orange-500' : 'text-muted'}
            accent="text-dark"
          />
          <KpiCard
            label="NOTE MOY."
            value={avgRating ? `${avgRating} ⭐` : '—'}
            sub={avgRating ? `${feedbacks.length} avis` : 'Aucun avis'}
            subColor="text-muted"
            accent={avgRating ? '' : 'text-muted'}
            style={avgRating ? { color: '#b88500' } : undefined}
          />
          <KpiCard label="POURBOIRES" value={formatEur(tipsTotal)}
            sub={tipsTotal > 0 ? `moy. ${avgTipPct}%` : 'Aucun pourboire'}
            subColor={tipsTotal > 0 ? 'text-success' : 'text-muted'}
            accent="text-success" />
        </div>

        {/* Grid 2 cols */}
        <div className="grid grid-cols-2 gap-4">

          {/* Tables live */}
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-dark">Tables live</h2>
              <span className="text-xs bg-brand text-white rounded-full px-2.5 py-0.5 font-semibold">Temps réel</span>
            </div>
            {isLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : overviewTables.length === 0 ? (
              <EmptyState icon="🪑" text="Aucune table configurée" />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {overviewTables.map((t) => (
                  <div key={t.id} className={`rounded-lg px-3 py-2.5 text-center relative ${STATUS_COLORS[t.color]}`}>
                    {t.alert && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">!</span>
                    )}
                    <div className="text-sm font-bold">{t.id}</div>
                    <div className="text-[10px] leading-tight mt-0.5">{t.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenus de la semaine */}
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-dark">Revenus de la semaine</h2>
              <span className="text-sm font-bold text-dark">{formatEur(weekTotal)}</span>
            </div>
            {weekTotal === 0 ? (
              <EmptyState icon="📊" text="Aucune vente cette semaine" />
            ) : (
              <div className="flex items-end gap-2 h-32">
                {BAR_DAYS.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all ${i === new Date().getDay() - 1 ? 'bg-brand-dark' : 'bg-brand'}`}
                      style={{ height: `${barHeights[i]}%` }}
                    />
                    <span className={`text-[11px] font-medium ${i === new Date().getDay() - 1 ? 'text-brand font-bold' : 'text-muted'}`}>{day}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <h2 className="text-sm font-bold text-dark mb-4">Activité récente</h2>
          {recentPayments.length === 0 ? (
            <EmptyState icon="🕐" text="Aucune activité pour le moment" sub="Les paiements de vos clients apparaîtront ici" />
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-success" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-dark">T{p.tableNumber}</span>
                    <span className="text-sm text-mid mx-1.5">—</span>
                    <span className="text-sm text-mid">Paiement encaissé</span>
                    <span className="text-sm text-muted ml-1.5">{formatEur(p.totalCents)}</span>
                  </div>
                  <span className="text-xs text-muted shrink-0">{p.dateLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </RestaurantLayout>
  )
}

function KpiCard({
  label, value, sub, subColor, accent, style,
}: {
  label: string; value: string; sub?: string; subColor?: string; accent?: string; style?: React.CSSProperties
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-card p-5">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-3xl font-bold ${accent}`} style={style}>{value}</div>
      {sub && <div className={`text-xs mt-1.5 font-medium ${subColor}`}>{sub}</div>}
    </div>
  )
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-1.5">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-mid">{text}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

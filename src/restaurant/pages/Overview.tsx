import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { RECENT_ACTIVITY, WEEKLY_SUMMARY } from '../data/mockData'
import { useRestaurantId } from '../../hooks/useRestaurant'
// useRestaurantId now reads from RestaurantContext (set by RestaurantGuard)
import { formatEur } from '../../utils/formatCurrency'

const STATUS_COLORS: Record<string, string> = {
  violet: 'bg-purple-100 text-purple-700',
  amber:  'bg-orange-100 text-orange-700',
  green:  'bg-green-100 text-green-700',
  gray:   'bg-gray-100 text-gray-500',
}

const BAR_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const BAR_HEIGHTS = [40, 52, 38, 60, 72, 95, 48]

const ACTIVITY_DOT: Record<string, string> = {
  payment:  'bg-success',
  feedback: 'bg-brand',
  opened:   'bg-blue-400',
  waiting:  'bg-orange-400',
}

export function Overview() {
  const restaurantId = useRestaurantId()
  const stats = useQuery(api.payments.getOverviewStats, restaurantId ? { restaurantId } : "skip")
  const rawTables = useQuery(api.tables.list, restaurantId ? { restaurantId } : "skip")

  // KPI values — Convex data if available, otherwise mock fallback
  const caTotal = stats?.totalCA ?? WEEKLY_SUMMARY.caGros
  const tipsTotal = stats?.totalTips ?? WEEKLY_SUMMARY.pourboires
  const avgTipPct = stats?.avgTipPct ?? "9.2"

  // Tables live mini-grid
  type TableColor = 'violet' | 'amber' | 'green' | 'gray'
  type ConvexTable = { number: number; status: string; amountCents?: number; alert?: boolean }

  const statusToColor: Record<string, TableColor> = {
    dining: 'violet',
    payment: 'amber',
    paid: 'green',
    free: 'gray',
  }
  const statusToLabel = (t: ConvexTable) => {
    if (t.status === 'dining') return 'En repas'
    if (t.status === 'payment') return '⏳ Paiement'
    if (t.status === 'paid') return t.amountCents ? `${formatEur(t.amountCents)} payé` : '✓ Payé'
    return 'Libre'
  }

  const typedTables = rawTables as ConvexTable[] | undefined

  const overviewTables = typedTables
    ? typedTables.slice(0, 9).map(t => ({
        id: `T${t.number}`,
        color: statusToColor[t.status] ?? 'gray',
        label: statusToLabel(t),
        alert: t.status === 'payment' && t.alert,
      }))
    : [
        { id: 'T1',  color: 'violet' as TableColor, label: 'En repas' },
        { id: 'T2',  color: 'gray'   as TableColor, label: 'Libre' },
        { id: 'T3',  color: 'amber'  as TableColor, label: '⏳ Paiement', alert: true },
        { id: 'T5',  color: 'violet' as TableColor, label: 'En repas' },
        { id: 'T7',  color: 'green'  as TableColor, label: '62€ payé' },
        { id: 'T9',  color: 'amber'  as TableColor, label: '⏳ Paiement' },
        { id: 'T11', color: 'violet' as TableColor, label: 'En repas' },
        { id: 'T12', color: 'amber'  as TableColor, label: '⏳ Paiement' },
        { id: 'T14', color: 'gray'   as TableColor, label: 'Libre' },
      ]

  const activeTables = typedTables ? typedTables.filter(t => t.status !== 'free').length : 8
  const paymentTables = typedTables ? typedTables.filter(t => t.status === 'payment').length : 3
  const totalTables = typedTables ? typedTables.length : 14

  return (
    <RestaurantLayout>
      <Topbar
        title="Vue d'ensemble"
        subtitle="Lundi 12 mai 2026 · Service du soir"
        live
      />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">CA SOIR</div>
            <div className="text-3xl font-bold text-brand">{formatEur(caTotal)}</div>
            <div className="text-xs text-success mt-1.5 font-medium">▲ +12% vs hier</div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">TABLES ACTIVES</div>
            <div className="text-3xl font-bold text-dark">{activeTables} <span className="text-lg text-muted font-medium">/ {totalTables}</span></div>
            <div className="text-xs text-orange-500 mt-1.5 font-medium">{paymentTables} en paiement</div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">NOTE MOY.</div>
            <div className="text-3xl font-bold" style={{ color: '#b88500' }}>4,6 ⭐</div>
            <div className="text-xs text-success mt-1.5 font-medium">▲ +0,2 ce mois</div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">POURBOIRES</div>
            <div className="text-3xl font-bold text-success">{formatEur(tipsTotal)}</div>
            <div className="text-xs text-success mt-1.5 font-medium">▲ moy. {avgTipPct}%</div>
          </div>
        </div>

        {/* Grid 2 cols */}
        <div className="grid grid-cols-2 gap-4">
          {/* Tables live */}
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-dark">Tables live</h2>
              <span className="text-xs bg-brand text-white rounded-full px-2.5 py-0.5 font-semibold">Temps réel</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {overviewTables.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-lg px-3 py-2.5 text-center relative ${STATUS_COLORS[t.color]}`}
                >
                  {t.alert && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">!</span>
                  )}
                  <div className="text-sm font-bold">{t.id}</div>
                  <div className="text-[10px] leading-tight mt-0.5">{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenus semaine */}
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-dark">Revenus de la semaine</h2>
              <span className="text-sm font-bold text-dark">{formatEur(WEEKLY_SUMMARY.caGros)}</span>
            </div>
            <div className="flex items-end gap-2 h-32">
              {BAR_DAYS.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all ${i === 5 ? 'bg-brand-dark' : 'bg-brand'}`}
                    style={{ height: `${BAR_HEIGHTS[i]}%` }}
                  />
                  <span className={`text-[11px] font-medium ${i === 5 ? 'text-brand font-bold' : 'text-muted'}`}>{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
          <h2 className="text-sm font-bold text-dark mb-4">Activité récente</h2>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ACTIVITY_DOT[item.type]}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-dark">T{item.tableId}</span>
                  <span className="text-sm text-mid mx-1.5">—</span>
                  <span className="text-sm text-mid">{item.description}</span>
                  <span className="text-sm text-muted ml-1.5">{item.detail}</span>
                </div>
                <span className="text-xs text-muted shrink-0">{item.minutesAgo} min</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </RestaurantLayout>
  )
}

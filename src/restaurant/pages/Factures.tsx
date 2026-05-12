import { useState } from 'react'
import { Download, Printer, SlidersHorizontal } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { INVOICE_ROWS } from '../data/mockData'
import { useRestaurantId } from '../../hooks/useRestaurant'
import { formatEur } from '../../utils/formatCurrency'

type PeriodKey = 'week' | 'month' | 'quarter' | 'custom'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week',    label: 'Cette semaine' },
  { key: 'month',   label: 'Ce mois' },
  { key: 'quarter', label: 'Ce trimestre' },
  { key: 'custom',  label: 'Personnalisé' },
]

const STATUS_STYLE: Record<string, string> = {
  'Encaissé':    'bg-green-50 text-green-700',
  'En attente':  'bg-orange-50 text-orange-700',
  'Remboursé':   'bg-gray-100 text-gray-500',
}

export function Factures() {
  const [period, setPeriod] = useState<PeriodKey>('week')

  const restaurantId = useRestaurantId()
  const rawPayments = useQuery(api.payments.list, restaurantId ? { restaurantId } : "skip")

  type ConvexPayment = { dateLabel: string; tableNumber: number; guests: number; totalCents: number; tipCents: number; commissionCents: number; status: 'Encaissé' | 'En attente' | 'Remboursé' }
  type LocalRow = { date: string; tableId: number; guests: number; amountCents: number; tipCents: number; commissionCents: number; status: 'Encaissé' | 'En attente' | 'Remboursé' }

  // Map Convex payments to InvoiceRow shape, or fall back to mocks
  const rows: LocalRow[] = rawPayments
    ? (rawPayments as ConvexPayment[]).map(p => ({
        date: p.dateLabel,
        tableId: p.tableNumber,
        guests: p.guests,
        amountCents: p.totalCents,
        tipCents: p.tipCents,
        commissionCents: p.commissionCents,
        status: p.status as 'Encaissé' | 'En attente' | 'Remboursé',
      }))
    : INVOICE_ROWS

  const encaisse = rows.filter(r => r.status === 'Encaissé')
  const caGros = encaisse.reduce((s, r) => s + r.amountCents, 0)
  const pourboires = encaisse.reduce((s, r) => s + r.tipCents, 0)
  const commission = encaisse.reduce((s, r) => s + r.commissionCents, 0)
  const net = caGros - commission

  return (
    <RestaurantLayout>
      <Topbar title="Factures" subtitle="Historique des paiements" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">CA BRUT</div>
            <div className="text-2xl font-bold text-brand">{formatEur(caGros)}</div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">POURBOIRES</div>
            <div className="text-2xl font-bold text-success">{formatEur(pourboires)}</div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">COMMISSION SPLITZY</div>
            <div className="text-2xl font-bold text-mid">{formatEur(commission)}</div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">NET</div>
            <div className="text-2xl font-bold text-dark">{formatEur(net)}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`text-sm font-medium rounded-lg px-3.5 py-1.5 border transition-colors ${
                  period === key
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-mid border-border hover:bg-bg'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-sm font-medium text-mid border border-border bg-white rounded-lg px-3 py-1.5 hover:bg-bg transition-colors">
              <SlidersHorizontal size={14} />
              Tri
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-mid border border-border bg-white rounded-lg px-3 py-1.5 hover:bg-bg transition-colors">
              <Download size={14} />
              Exporter CSV
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-mid border border-border bg-white rounded-lg px-3 py-1.5 hover:bg-bg transition-colors">
              <Printer size={14} />
              Imprimer
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#2a2724' }}>
                {['Date', 'Table', 'Convives', 'Montant', 'Pourboire', 'Commission', 'Statut'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-white/70 uppercase tracking-wide first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-t border-border ${i % 2 === 0 ? 'bg-white' : 'bg-bg/50'} hover:bg-brand-bg/30 transition-colors`}
                >
                  <td className="px-4 py-3 pl-5 text-muted font-medium">{row.date}</td>
                  <td className="px-4 py-3 font-semibold text-dark">T{row.tableId}</td>
                  <td className="px-4 py-3 text-mid">{row.guests}</td>
                  <td className="px-4 py-3 font-semibold text-dark">{formatEur(row.amountCents)}</td>
                  <td className="px-4 py-3 text-success font-medium">{formatEur(row.tipCents)}</td>
                  <td className="px-4 py-3 text-mid">{formatEur(row.commissionCents)}</td>
                  <td className="px-4 py-3 pr-5">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STATUS_STYLE[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted">{rows.length} résultats</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    p === 1 ? 'bg-brand text-white' : 'text-mid hover:bg-bg'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </RestaurantLayout>
  )
}

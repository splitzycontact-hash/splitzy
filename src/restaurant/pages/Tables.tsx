import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { TABLES, TABLE3_CONVIVES } from '../data/mockData'
import type { TableStatus, TableData } from '../data/mockData'
import { useRestaurantId } from '../../hooks/useRestaurant'
import { formatEur } from '../../utils/formatCurrency'

type FilterKey = 'all' | TableStatus

const STATUS_STYLE: Record<TableStatus, { card: string; pill: string; label: string }> = {
  dining:  { card: 'bg-purple-50 border-purple-200',  pill: 'bg-purple-100 text-purple-700',  label: 'En repas' },
  payment: { card: 'bg-orange-50 border-orange-200',  pill: 'bg-orange-100 text-orange-700',  label: '⏳ En paiement' },
  paid:    { card: 'bg-green-50 border-green-200',    pill: 'bg-green-100 text-green-700',    label: '✓ Payé' },
  free:    { card: 'bg-gray-50 border-gray-200',      pill: 'bg-gray-100 text-gray-500',      label: 'Libre' },
}

const CONVIVE_STATUS: Record<string, string> = {
  paid:      'text-success font-semibold',
  paying:    'text-orange-600 font-semibold',
  selecting: 'text-purple-600 font-semibold',
}
const CONVIVE_LABEL: Record<string, string> = {
  paid:      'Payé',
  paying:    'En paiement',
  selecting: 'En sélection',
}

function durationLabel(minutes?: number): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function TableCard({ table, onClick }: { table: TableData; onClick: () => void }) {
  const s = STATUS_STYLE[table.status]
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border p-4 text-left transition-all hover:shadow-card cursor-pointer ${s.card}`}
    >
      {table.alert && (
        <span className="absolute top-3 right-3 w-5 h-5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">!</span>
      )}
      <div className="text-xl font-bold text-dark mb-1">Table {table.id}</div>
      <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 mb-2 ${s.pill}`}>
        {s.label}
      </span>
      {table.guests && (
        <div className="text-xs text-muted">{table.guests} conv. · {table.duration}</div>
      )}
      {table.amountCents && (
        <div className="text-base font-bold text-dark mt-1">{formatEur(table.amountCents)}</div>
      )}
    </button>
  )
}

export function Tables() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [modalOpen, setModalOpen] = useState(true)

  const restaurantId = useRestaurantId()
  const rawTables = useQuery(api.tables.list, restaurantId ? { restaurantId } : "skip")

  type ConvexTable = { number: number; status: TableStatus; guests?: number; durationMinutes?: number; amountCents?: number; alert?: boolean }

  // Map Convex tables to the local TableData shape, or fall back to mocks
  const TABLES_FALLBACK: TableData[] = rawTables
    ? (rawTables as ConvexTable[]).map(t => ({
        id: t.number,
        status: t.status,
        guests: t.guests,
        duration: durationLabel(t.durationMinutes),
        amountCents: t.amountCents,
        alert: t.alert,
      }))
    : TABLES

  const statusCounts = TABLES_FALLBACK.reduce<Record<FilterKey, number>>(
    (acc, t) => { acc.all++; acc[t.status]++; return acc },
    { all: 0, dining: 0, payment: 0, paid: 0, free: 0 }
  )

  const FILTER_LABELS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',     label: 'Toutes',      count: statusCounts.all     },
    { key: 'dining',  label: 'En repas',    count: statusCounts.dining  },
    { key: 'payment', label: 'Paiement',    count: statusCounts.payment },
    { key: 'paid',    label: 'Payées',      count: statusCounts.paid    },
    { key: 'free',    label: 'Libres',      count: statusCounts.free    },
  ]

  const visible = filter === 'all' ? TABLES_FALLBACK : TABLES_FALLBACK.filter((t) => t.status === filter)

  return (
    <RestaurantLayout>
      <Topbar
        title="Tables live"
        subtitle="Mise à jour il y a 4s"
        live
      />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-5">
          {FILTER_LABELS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-sm font-medium rounded-lg px-3.5 py-1.5 transition-colors border ${
                filter === key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-mid border-border hover:bg-bg'
              }`}
            >
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-3">
          {visible.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onClick={() => setModalOpen(true)}
            />
          ))}
        </div>
      </main>

      {/* Modal Table 3 */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
          >
            <motion.div
              className="bg-white rounded-2xl overflow-hidden shadow-card-dark w-[480px]"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4" style={{ background: '#2a2724' }}>
                <div>
                  <div className="text-lg font-bold text-white">Table 3</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold bg-orange-500/20 text-orange-300 rounded-full px-3 py-1">
                    ⏳ En paiement
                  </span>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-0 border-b border-border">
                {[
                  { label: 'TOTAL',    value: '101€',  color: 'text-dark' },
                  { label: 'ENCAISSÉ', value: '44€',   color: 'text-success' },
                  { label: 'RESTANT',  value: '57€',   color: 'text-error' },
                  { label: 'POURB.',   value: '4,30€', color: 'text-muted' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="py-4 px-4 text-center border-r border-border last:border-r-0">
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wide">{label}</div>
                    <div className={`text-lg font-bold mt-1 ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Convives */}
              <div className="px-6 py-4 space-y-3">
                {TABLE3_CONVIVES.map((c) => (
                  <div key={c.name} className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-dark">{c.name}</div>
                      <div className="text-xs text-muted mt-0.5 leading-relaxed">{c.items}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-dark">{formatEur(c.amountCents)}</div>
                      <div className={`text-xs mt-0.5 ${CONVIVE_STATUS[c.status]}`}>
                        {CONVIVE_LABEL[c.status]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 px-6 pb-5">
                <button className="flex-1 bg-brand text-white font-semibold text-sm rounded-xl py-2.5 hover:bg-brand-dark transition-colors">
                  Envoyer rappel 📲
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-bg text-mid font-semibold text-sm rounded-xl py-2.5 hover:bg-border transition-colors border border-border"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RestaurantLayout>
  )
}

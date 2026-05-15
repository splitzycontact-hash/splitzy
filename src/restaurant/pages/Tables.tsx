import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { useRestaurantId } from '../../hooks/useRestaurant'
import { formatEur } from '../../utils/formatCurrency'

type TableStatus = 'free' | 'dining' | 'payment' | 'paid'

type TableData = {
  id: number
  status: TableStatus
  guests?: number
  duration?: string
  amountCents?: number
  alert?: boolean
  convexId: Id<'tables'> | null
}

type FilterKey = 'all' | TableStatus

const STATUS_STYLE: Record<TableStatus, { card: string; pill: string; label: string }> = {
  dining:  { card: 'bg-purple-50 border-purple-200',  pill: 'bg-purple-100 text-purple-700',  label: 'En repas' },
  payment: { card: 'bg-orange-50 border-orange-200',  pill: 'bg-orange-100 text-orange-700',  label: '⏳ En paiement' },
  paid:    { card: 'bg-green-50 border-green-200',    pill: 'bg-green-100 text-green-700',    label: '✓ Payé' },
  free:    { card: 'bg-gray-50 border-gray-200',      pill: 'bg-gray-100 text-gray-500',      label: 'Libre' },
}

function durationLabel(minutes?: number): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function TableCard({ table, onClick, onSimulate }: { table: TableData; onClick: () => void; onSimulate: () => void }) {
  const s = STATUS_STYLE[table.status]
  return (
    <div
      className={`relative rounded-xl border p-4 text-left transition-all hover:shadow-card cursor-pointer ${s.card}`}
      onClick={onClick}
    >
      {table.alert && (
        <span className="absolute top-3 right-3 w-5 h-5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center">!</span>
      )}
      <div className="text-xl font-bold text-dark mb-1">Table {table.id}</div>
      <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-0.5 mb-2 ${s.pill}`}>
        {s.label}
      </span>
      {table.guests && (
        <div className="text-xs text-muted">{table.guests} conv.{table.duration ? ` · ${table.duration}` : ''}</div>
      )}
      {table.amountCents ? (
        <div className="text-base font-bold text-dark mt-1">{formatEur(table.amountCents)}</div>
      ) : null}
      <button
        onClick={e => { e.stopPropagation(); onSimulate() }}
        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <span className="rounded px-1 py-px bg-amber-400 text-white text-[9px] font-bold tracking-wide">TEST</span>
        Simuler commande
      </button>
    </div>
  )
}

export function Tables() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [simulatingTable, setSimulatingTable] = useState<TableData | null>(null)
  const [simAmount, setSimAmount] = useState('')
  const [simLoading, setSimLoading] = useState(false)
  const amountInputRef = useRef<HTMLInputElement>(null)

  const restaurantId = useRestaurantId()
  const rawTables = useQuery(api.tables.list, restaurantId ? { restaurantId } : 'skip')
  const resetToFree = useMutation(api.tables.resetToFree)
  const updateStatus = useMutation(api.tables.updateStatus)

  async function confirmSimulation() {
    if (!simulatingTable?.convexId) return
    const cents = Math.round(parseFloat(simAmount.replace(',', '.')) * 100)
    if (isNaN(cents) || cents <= 0) { amountInputRef.current?.focus(); return }
    setSimLoading(true)
    try {
      await updateStatus({
        tableId: simulatingTable.convexId as Id<'tables'>,
        status: 'dining',
        guests: simulatingTable.guests ?? 2,
        amountCents: cents,
      })
    } finally {
      setSimLoading(false)
      setSimulatingTable(null)
      setSimAmount('')
    }
  }

  type ConvexTable = { _id: Id<'tables'>; number: number; status: TableStatus; guests?: number; durationMinutes?: number; amountCents?: number; alert?: boolean }

  const tables: TableData[] = rawTables
    ? (rawTables as ConvexTable[]).map(t => ({
        id: t.number,
        status: t.status,
        guests: t.guests,
        duration: durationLabel(t.durationMinutes),
        amountCents: t.amountCents,
        alert: t.alert,
        convexId: t._id,
      }))
    : []

  const statusCounts = tables.reduce<Record<FilterKey, number>>(
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

  const visible = filter === 'all' ? tables : tables.filter(t => t.status === filter)

  const isLoading = rawTables === undefined

  return (
    <RestaurantLayout>
      <Topbar title="Tables live" subtitle="Mise à jour en temps réel" live />
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

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-4xl">🪑</span>
            <span className="text-base font-semibold text-mid">
              {filter === 'all' ? 'Aucune table configurée' : 'Aucune table dans cette catégorie'}
            </span>
            <span className="text-sm text-muted">
              {filter === 'all' ? 'Vos tables apparaîtront ici dès que le service démarrera' : ''}
            </span>
          </div>
        )}

        {/* Grid */}
        {!isLoading && visible.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {visible.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => setSelectedTable(table)}
                onSimulate={() => { setSimulatingTable(table); setSimAmount(''); setTimeout(() => amountInputRef.current?.focus(), 50) }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selectedTable && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedTable(null) }}
          >
            <motion.div
              className="bg-white rounded-2xl overflow-hidden shadow-card-dark w-[420px]"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4" style={{ background: '#2a2724' }}>
                <div className="text-lg font-bold text-white">Table {selectedTable.id}</div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold rounded-full px-3 py-1 ${
                    selectedTable.status === 'free'    ? 'bg-gray-500/20 text-gray-300' :
                    selectedTable.status === 'dining'  ? 'bg-purple-500/20 text-purple-300' :
                    selectedTable.status === 'payment' ? 'bg-orange-500/20 text-orange-300' :
                                                         'bg-green-500/20 text-green-300'
                  }`}>
                    {STATUS_STYLE[selectedTable.status].label}
                  </span>
                  <button onClick={() => setSelectedTable(null)} className="text-white/60 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                {selectedTable.status === 'free' ? (
                  <div className="flex flex-col items-center py-6 gap-2 text-center">
                    <span className="text-3xl">🪑</span>
                    <div className="text-sm font-semibold text-dark">Table libre</div>
                    <div className="text-xs text-muted">En attente d'un client</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTable.guests && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Convives</span>
                        <span className="font-semibold text-dark">{selectedTable.guests}</span>
                      </div>
                    )}
                    {selectedTable.duration && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Durée</span>
                        <span className="font-semibold text-dark">{selectedTable.duration}</span>
                      </div>
                    )}
                    {selectedTable.amountCents ? (
                      <div className="flex justify-between text-sm border-t border-border pt-4">
                        <span className="text-muted">Montant</span>
                        <span className="text-lg font-bold text-dark">{formatEur(selectedTable.amountCents)}</span>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted">
                        Montant non encore défini
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 px-6 pb-5">
                {selectedTable.status === 'payment' && (
                  <button className="flex-1 bg-brand text-white font-semibold text-sm rounded-xl py-2.5 hover:bg-brand-dark transition-colors">
                    Envoyer rappel 📲
                  </button>
                )}
                {selectedTable.status !== 'free' && selectedTable.convexId && (
                  <button
                    onClick={() => {
                      resetToFree({ tableId: selectedTable.convexId as Id<'tables'> }).catch(() => {})
                      setSelectedTable(null)
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl py-2.5 hover:bg-gray-200 transition-colors border border-gray-200"
                  >
                    Libérer la table 🪑
                  </button>
                )}
                <button
                  onClick={() => setSelectedTable(null)}
                  className="flex-1 bg-bg text-mid font-semibold text-sm rounded-xl py-2.5 hover:bg-border transition-colors border border-border"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulate order modal */}
      <AnimatePresence>
        {simulatingTable && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) { setSimulatingTable(null); setSimAmount('') } }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-card-dark w-[360px] overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 bg-amber-400 text-white text-[10px] font-bold tracking-wide">TEST</span>
                  <span className="text-sm font-bold text-dark">Simuler commande — Table {simulatingTable.id}</span>
                </div>
                <button onClick={() => { setSimulatingTable(null); setSimAmount('') }} className="text-muted hover:text-dark transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <p className="text-xs text-muted">Simule ce qu'un vrai POS enverrait : met la table en "En repas" avec le montant saisi.</p>
                <div>
                  <label className="block text-xs font-semibold text-mid mb-1.5">Montant (€)</label>
                  <div className="relative">
                    <input
                      ref={amountInputRef}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="ex: 87.40"
                      value={simAmount}
                      onChange={e => setSimAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && confirmSimulation()}
                      className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-dark placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">€</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button
                  onClick={() => { setSimulatingTable(null); setSimAmount('') }}
                  className="flex-1 rounded-xl border border-border bg-bg text-mid text-sm font-semibold py-2.5 hover:bg-border transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmSimulation}
                  disabled={simLoading || !simAmount}
                  className="flex-1 rounded-xl bg-brand text-white text-sm font-semibold py-2.5 hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {simLoading ? 'Envoi…' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RestaurantLayout>
  )
}

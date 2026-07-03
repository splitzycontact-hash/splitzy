import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import {
  X, RefreshCw, Eye, Send, Plus, Minus, Bell,
  RotateCcw, Receipt, Play, Timer, AlertTriangle, CheckCircle2,
  QrCode, Search, Trash2,
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId, useRestaurantRole } from '../context/RestaurantContext'
import { formatEur } from '../../utils/formatCurrency'
import { paidPct, perGuestCents, avgBasketCents, remainingCents } from '../lib/billing'
import { Skeleton } from '../../components/ui/skeleton'
import { useConfetti } from '../components/ui/Confetti'

function TablesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 p-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="rounded-xl h-[110px]" />
      ))}
    </div>
  )
}

type TableStatus = 'free' | 'dining' | 'payment' | 'paid'
type FilterKey   = 'all' | TableStatus

type OrderLine = { name: string; qty: number; unitCents: number; paid?: boolean }
type TableData = {
  id: number; status: TableStatus
  guests?: number; durationMinutes?: number
  amountCents?: number; paidCents?: number; paidTipCents?: number
  paidGuests?: number
  sittingStartedAt?: number
  orderItems?: OrderLine[]
  alert?: boolean; convexId: Id<'tables'> | null
}
type SimItem = { name: string; qty: number; unitCents: number }
type MenuDoc = { name: string; priceCents: number; category?: string; emoji?: string; isAvailable?: boolean }

function durationLabel(minutes?: number): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`
}

function startTimeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const CATEGORY_LABELS: Record<string, string> = {
  entrees: 'Entrées', plats: 'Plats', desserts: 'Desserts', boissons: 'Boissons',
}

// Carte démo affichée dans le modal "Ajouter un article" quand le restaurant
// n'a aucun menu Convex (même convention que DEMO_ITEMS de MenuPage : données
// d'illustration, bannière explicite). L'ajout n'écrit que des lignes de
// commande (snapshot nom/prix) — il ne crée jamais d'articles dans `menuItems`.
const DEMO_MENU: MenuDoc[] = [
  { name: 'Momos Poulet',            priceCents: 890,  category: 'entrees',  emoji: '🥗' },
  { name: 'Nems Boeuf',              priceCents: 790,  category: 'entrees',  emoji: '🥗' },
  { name: 'Pad thaï crevettes',      priceCents: 1490, category: 'plats',    emoji: '🍽' },
  { name: 'Bo bun boeuf',            priceCents: 1390, category: 'plats',    emoji: '🍽' },
  { name: 'Mochi glacés (3 pièces)', priceCents: 650,  category: 'desserts', emoji: '🍮' },
  { name: 'Thé vert japonais',       priceCents: 550,  category: 'boissons', emoji: '🍷' },
]

function generateOrder(menu: { name: string; priceCents: number }[]): SimItem[] {
  if (menu.length === 0) return []
  const shuffled = [...menu].sort(() => Math.random() - 0.5)
  const count = Math.min(shuffled.length, 2 + Math.floor(Math.random() * 3))
  return shuffled.slice(0, count).map(item => ({ name: item.name, qty: Math.random() > 0.5 ? 2 : 1, unitCents: item.priceCents }))
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: TableStatus }) {
  const styles: Record<TableStatus, { bg: string; color: string; label: string }> = {
    free:    { bg: 'var(--ds-bg-subtle)', color: 'var(--ds-text-tertiary)', label: 'Libre' },
    dining:  { bg: '#27272A', color: '#FAFAFA', label: 'En repas' },
    payment: { bg: 'var(--ds-accent-soft)', color: 'var(--ds-accent-strong)', label: 'En paiement' },
    paid:    { bg: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)', label: 'Réglée' },
  }
  const s = styles[status]
  return (
    <span
      className="text-[11px] font-semibold px-2 py-[3px] rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

// ── Compact icon button ───────────────────────────────────────
function IconBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center border transition-colors hover:ds-bg-accent-soft"
      style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
      aria-label={label}
    >
      <Icon size={14} />
    </button>
  )
}

// ── Table card ────────────────────────────────────────────────
function TableCard({ table, onSimulate, onView, onAdd, onSend }: {
  table: TableData; onSimulate: () => void;
  onView: () => void; onAdd: () => void; onSend: () => void;
}) {
  const role = useRestaurantRole()
  const { status, id } = table
  const paid    = table.paidCents   ?? 0
  const total   = table.amountCents ?? 0
  const pct     = paidPct(paid, total)
  // guests = 0 si inconnu — ne jamais inventer un nombre de convives
  const guests  = table.guests ?? 0
  const perGuest = perGuestCents(total, guests)

  return (
    <m.article
      layout
      data-testid={`table-card-${id}`}
      data-status={status}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col rounded-[12px] overflow-hidden"
      style={{
        background: status === 'dining' || status === 'paid' ? '#18181B' : 'var(--ds-bg-surface)',
        border: `1px solid ${status === 'payment' ? '#F5DDB3' : status === 'paid' ? '#C6F0D2' : status === 'dining' ? '#27272A' : 'var(--ds-border)'}`,
        boxShadow: status === 'free' ? 'none' : 'var(--ds-shadow-sm)',
        minHeight: '196px',
        // Alert stripe on top
        outline: table.alert ? '1px solid rgba(232,146,10,0.3)' : 'none',
      }}
    >
      {/* Alert top bar */}
      {table.alert && (
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #E8920A, transparent)' }} />
      )}

      {/* Head */}
      <div className="flex items-start justify-between px-4 pt-3.5 pb-2.5 gap-2">
        <div>
          <div
            className="font-bold text-[14px] tracking-[-0.01em]"
            style={{ color: status === 'dining' || status === 'paid' ? '#FAFAFA' : 'var(--ds-text-primary)' }}
          >
            Table {id}
          </div>
          <div className="text-[11.5px] mt-0.5" style={{ color: status === 'dining' || status === 'paid' ? '#71717A' : 'var(--ds-text-tertiary)' }}>
            {guests} convives · Salle
            {status !== 'free' && table.sittingStartedAt && <span> · {startTimeLabel(table.sittingStartedAt)}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={status} />
          {table.alert && (
            <span
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-[2px] rounded-full border"
              style={{ background: 'var(--ds-accent-soft)', borderColor: '#F5DDB3', color: 'var(--ds-accent-strong)' }}
            >
              <AlertTriangle size={9} />
              Radar · {durationLabel(table.durationMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pb-3">
        {status === 'free' ? (
          <div className="flex flex-col items-center justify-center py-5 gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border border-dashed"
              style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border-strong)' }}
            >
              <QrCode size={18} style={{ color: 'var(--ds-text-tertiary)' }} />
            </div>
            <div className="text-[12px] text-center" style={{ color: 'var(--ds-text-tertiary)' }}>
              Disponible<br />QR code prêt
            </div>
          </div>
        ) : status === 'payment' ? (
          <>
            {/* Amount row — valeurs réelles uniquement (paidCents = sous-total
                encaissé hors pourboire, même convention que la vue convive) */}
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="font-extrabold text-[22px] tabular-nums tracking-[-0.025em] ds-text-accent" style={{ fontFamily: 'Inter, sans-serif' }}>
                {formatEur(paid)}
              </span>
              <span className="text-[12px] ds-text-secondary">
                sur {formatEur(total)} · reste {formatEur(Math.max(0, total - paid))}
                {(table.paidTipCents ?? 0) > 0 && <> · +{formatEur(table.paidTipCents!)} pourboire</>}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mb-2">
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--ds-bg-subtle)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#E8920A' }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                <span>{guests > 0 ? `${table.paidGuests ?? 0} / ${guests} convives ont payé` : 'Convives —'}</span>
                <span><strong>{pct}%</strong></span>
              </div>
            </div>
            {/* Diner segments */}
            {guests > 0 && (
              <div className="flex gap-1">
                {Array.from({ length: guests }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-[4px] rounded-full"
                    style={{ background: i < Math.min(guests, table.paidGuests ?? 0) ? '#E8920A' : 'var(--ds-bg-subtle)' }}
                  />
                ))}
              </div>
            )}
          </>
        ) : status === 'paid' ? (
          <>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="font-extrabold text-[22px] tabular-nums tracking-[-0.025em]" style={{ color: '#22C55E', fontFamily: 'Inter, sans-serif' }}>
                {formatEur(total)}
              </span>
              {(table.paidTipCents ?? 0) > 0 && (
                <span className="text-[12px]" style={{ color: '#71717A' }}>
                  + {formatEur(table.paidTipCents!)} pourboire{total > 0 ? ` (${Math.round((table.paidTipCents! / total) * 100)}%)` : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: '#A1A1AA' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
              Addition réglée via Splitzy
            </div>
          </>
        ) : ( // dining
          <>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="font-extrabold text-[22px] tabular-nums tracking-[-0.025em]" style={{ color: '#FAFAFA', fontFamily: 'Inter, sans-serif' }}>
                {total > 0 ? formatEur(total) : '—'}
              </span>
              <span className="text-[12px]" style={{ color: '#71717A' }}>
                addition en cours{perGuest !== null && <> · {formatEur(perGuest)} / couvert</>}
              </span>
            </div>
            {total === 0 && (
              <div className="text-[12px]" style={{ color: '#71717A' }}>
                En attente de la commande (caisse)
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-t"
        style={{
          borderColor: status === 'dining' || status === 'paid' ? '#27272A' : 'var(--ds-border)',
        }}
      >
        <span
          className="flex items-center gap-1.5 text-[12px]"
          style={{
            color: table.alert ? 'var(--ds-accent-strong)'
              : status === 'paid' ? '#22C55E'
              : status === 'dining' ? '#71717A'
              : 'var(--ds-text-secondary)',
          }}
        >
          {status === 'paid' ? (
            <><CheckCircle2 size={12} style={{ color: '#22C55E' }} />Réglée</>
          ) : status === 'free' ? (
            <>Libre</>
          ) : table.alert ? (
            <><AlertTriangle size={12} />{durationLabel(table.durationMinutes)} · au-delà moy.</>
          ) : (
            <><Timer size={12} />{durationLabel(table.durationMinutes) || '—'}</>
          )}
        </span>
        <div className="flex items-center gap-1">
          {status === 'payment' ? (
            <><IconBtn icon={Eye} label="Voir" onClick={onView} />{role !== 'viewer' && <IconBtn icon={Plus} label="Ajouter" onClick={onAdd} />}<IconBtn icon={Send} label="Relancer" onClick={onSend} /></>
          ) : status === 'paid' ? (
            <><IconBtn icon={Eye} label="Voir" onClick={onView} /><IconBtn icon={Receipt} label="Reçu" /><IconBtn icon={RotateCcw} label="Libérer" /></>
          ) : status === 'dining' && table.alert ? (
            <><IconBtn icon={Bell} label="Notifier" />{role !== 'viewer' && <IconBtn icon={Plus} label="Ajouter" onClick={onAdd} />}<IconBtn icon={Send} label="Relancer" onClick={onSend} /></>
          ) : status === 'dining' ? (
            <><IconBtn icon={Eye} label="Voir" onClick={onView} />{role !== 'viewer' && <IconBtn icon={Plus} label="Ajouter" onClick={onAdd} />}<IconBtn icon={Send} label="Demander paiement" onClick={onSend} /></>
          ) : role !== 'viewer' ? (
            <IconBtn icon={Play} label="Ouvrir" onClick={onAdd} />
          ) : null}
        </div>
      </div>

      {/* Simulate button — masqué pour viewer (lecture seule) */}
      {role !== 'viewer' && (
        <button
          onClick={onSimulate}
          className="mx-4 mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-[11px] font-semibold transition-colors"
          style={{ borderColor: '#FBBF24', background: 'rgba(245,158,11,0.06)', color: '#92400E' }}
        >
          <span className="rounded px-1 py-px text-white text-[9px] font-bold" style={{ background: '#FBBF24' }}>TEST</span>
          Simuler commande
        </button>
      )}
    </m.article>
  )
}

export function Tables() {
  const [filter, setFilter]           = useState<FilterKey>('all')
  const [search, setSearch]           = useState('')
  const [simulatingTable, setSimTbl]  = useState<TableData | null>(null)
  const [simItems, setSimItems]       = useState<SimItem[]>([])
  const [simLoading, setSimLoading]   = useState(false)
  const [selectedTable, setSelected]  = useState<TableData | null>(null)
  const [addModal, setAddModal]       = useState<TableData | null>(null)
  const [sendModal, setSendModal]     = useState<TableData | null>(null)
  const [sendLoading, setSendLoading] = useState(false)
  const { fire, ConfettiCanvas } = useConfetti()

  const restaurantId = useRestaurantId()
  const rawTables   = useQuery(api.tables.list,              restaurantId ? { restaurantId } : 'skip')
  const rawMenu     = useQuery(api.menuItems.listByRestaurant, restaurantId ? { restaurantId } : 'skip')
  const rawPayments = useQuery(api.payments.list,            restaurantId ? { restaurantId } : 'skip')
  const resetToFree  = useMutation(api.tables.resetToFree)
  const updateStatus = useMutation(api.tables.updateStatus)

  const menu = (rawMenu ?? []) as MenuDoc[]

  type ConvexTable = {
    _id: Id<'tables'>; number: number; status: TableStatus;
    guests?: number; durationMinutes?: number; amountCents?: number; paidCents?: number; paidTipCents?: number;
    sittingStartedAt?: number; orderItems?: OrderLine[]; alert?: boolean
  }

  // Convives payeurs de la sitting courante : paiements Encaissé de la table,
  // du plus récent au plus ancien (payments.list est trié desc), cumulés
  // jusqu'à couvrir table.paidCents — même reconstruction que /welcome côté
  // client. Évite de compter les paiements de sittings précédentes.
  const sittingPayerCount = (tableId: Id<'tables'>, paidCents: number): number => {
    if (!paidCents || !rawPayments) return 0
    let cumul = 0, count = 0
    for (const p of rawPayments) {
      if (p.tableId !== tableId || p.status !== 'Encaissé') continue
      cumul += p.subtotalCents
      count++
      if (cumul >= paidCents) break
    }
    return count
  }

  const tables: TableData[] = rawTables
    ? (rawTables as ConvexTable[]).map(t => ({
        id: t.number, status: t.status, guests: t.guests,
        durationMinutes: t.durationMinutes, amountCents: t.amountCents,
        paidCents: t.paidCents, paidTipCents: t.paidTipCents,
        paidGuests: sittingPayerCount(t._id, t.paidCents ?? 0),
        sittingStartedAt: t.sittingStartedAt, orderItems: t.orderItems,
        alert: t.alert, convexId: t._id,
      }))
    : []

  const statusCounts = tables.reduce<Record<FilterKey, number>>(
    (acc, t) => { acc.all++; acc[t.status]++; return acc },
    { all: 0, dining: 0, payment: 0, paid: 0, free: 0 }
  )

  const FILTER_LABELS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',     label: 'Toutes',      count: statusCounts.all     },
    { key: 'dining',  label: 'En repas',    count: statusCounts.dining  },
    { key: 'payment', label: 'En paiement', count: statusCounts.payment },
    { key: 'paid',    label: 'Réglées',     count: statusCounts.paid    },
    { key: 'free',    label: 'Libres',      count: statusCounts.free    },
  ]

  const filtered = (filter === 'all' ? tables : tables.filter(t => t.status === filter))
    .filter(t => !search || `table ${t.id}`.toLowerCase().includes(search.toLowerCase()))

  const isLoading = rawTables === undefined

  // Stats strip
  const activeTables  = tables.filter(t => t.status !== 'free')
  const caService     = activeTables.reduce((s, t) => s + (t.paidCents ?? 0), 0)
  const totalGuests   = activeTables.reduce((s, t) => s + (t.guests ?? 0), 0)
  // null si pas de données — la strip affiche "—" plutôt qu'un chiffre inventé
  const avgDur        = activeTables.filter(t => t.durationMinutes).length > 0
    ? Math.round(activeTables.reduce((s, t) => s + (t.durationMinutes ?? 0), 0) / activeTables.filter(t => t.durationMinutes).length)
    : null
  const avgBill       = avgBasketCents(activeTables.reduce((s, t) => s + (t.amountCents ?? 0), 0), totalGuests)

  // Floor map mini-cells
  const floorCells = tables.slice(0, 10).map(t => ({
    status: t.status, alert: t.alert,
  }))
  const cellColor = (status: TableStatus, alert?: boolean) => {
    if (alert) return '#E8920A'
    if (status === 'dining')  return '#18181B'
    if (status === 'payment') return '#E8920A'
    if (status === 'paid')    return '#22C55E'
    return 'var(--ds-bg-subtle)'
  }

  async function confirmSimulation() {
    if (!simulatingTable?.convexId || simItems.length === 0) return
    const totalCents = simItems.reduce((s, i) => s + i.qty * i.unitCents, 0)
    setSimLoading(true)
    try {
      await updateStatus({ tableId: simulatingTable.convexId as Id<'tables'>, status: 'dining', guests: simItems.reduce((s, i) => s + i.qty, 0), amountCents: totalCents, orderItems: simItems })
    } finally { setSimLoading(false); setSimTbl(null); setSimItems([]) }
  }
  const simTotal = simItems.reduce((s, i) => s + i.qty * i.unitCents, 0)
  const liveSelected = selectedTable ? (tables.find(t => t.convexId === selectedTable.convexId) ?? selectedTable) : null
  // Version live de la table du modal d'ajout — les lignes/montants restent
  // frais pendant que le modal est ouvert (ajouts/retraits réactifs).
  const liveAdd = addModal ? (tables.find(t => t.convexId === addModal.convexId) ?? addModal) : null

  return (
    <RestaurantLayout>
      <PageHeader
        title="Tables live"
        subtitle={
          <span className="flex items-center gap-2">
            Vue opérationnelle du service
            <span className="ds-text-tertiary">·</span>
            <span className="inline-flex gap-0.5">
              {floorCells.map((c, i) => (
                <span key={i} className="w-3.5 h-3.5 rounded-[3px] inline-block" style={{ background: cellColor(c.status, c.alert) }} />
              ))}
            </span>
            <span>{activeTables.length}/{tables.length} occupées</span>
          </span>
        }
        live
      />

      <div className="px-4 py-5 md:px-9 md:py-6 space-y-5">

        {/* Stats strip */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 border rounded-[12px] overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {[
            { label: 'CA du service',      value: formatEur(caService), accent: true, sub: `${tables.filter(t => t.status === 'payment').length} table(s) en paiement` },
            { label: 'Couverts en salle',  value: String(totalGuests),  sub: `sur ${activeTables.length} tables actives` },
            { label: 'Durée moy. à table', value: avgDur !== null ? `${avgDur} min` : '—', sub: 'objectif 60 min' },
            { label: 'Panier moy.',        value: avgBill !== null ? formatEur(avgBill) : '—', sub: 'par couvert' },
          ].map((cell, i) => (
            <div key={i} className="flex flex-col gap-1 px-[18px] py-3.5" style={{ borderRight: i < 3 ? `1px solid var(--ds-border)` : 'none' }}>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">{cell.label}</div>
              <div
                className="font-extrabold text-[22px] leading-[1.1] tabular-nums tracking-[-0.025em]"
                style={{ color: cell.accent ? 'var(--ds-accent)' : 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
              >
                {cell.value}
              </div>
              <div className="text-[11.5px] tabular-nums ds-text-tertiary">{cell.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3.5 flex-wrap">
          <div
            className="flex md:inline-flex w-full md:w-auto overflow-x-auto rounded-[10px] p-[3px] gap-px border"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            {FILTER_LABELS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[13px] whitespace-nowrap transition-colors"
                style={{
                  background: filter === key
                    ? (key === 'payment' ? 'var(--ds-accent-soft)' : 'var(--ds-bg-subtle)')
                    : 'none',
                  color: filter === key
                    ? (key === 'payment' ? 'var(--ds-accent-strong)' : 'var(--ds-text-primary)')
                    : 'var(--ds-text-secondary)',
                  fontWeight: filter === key ? 600 : 500,
                }}
              >
                {label}
                <span className="text-[11px] tabular-nums ds-text-tertiary">{count}</span>
              </button>
            ))}
          </div>
          <div
            className="inline-flex items-center gap-2 h-9 md:h-8 px-2.5 rounded-lg border w-full md:w-[220px]"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            <Search size={13} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une table…"
              className="flex-1 bg-transparent border-none outline-none text-[16px] md:text-[13px] min-w-0"
              style={{ color: 'var(--ds-text-primary)' }}
            />
          </div>
        </div>

        {/* Loading */}
        {isLoading && <TablesGridSkeleton />}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 ds-text-tertiary">
            <span className="text-3xl">🪑</span>
            <span className="text-sm font-medium ds-text-secondary">
              {filter === 'all' && !search ? 'Aucune table configurée' : 'Aucune table correspondante'}
            </span>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <AnimatePresence>
              {filtered.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  onSimulate={() => { setSimTbl(table); setSimItems(generateOrder(menu)) }}
                  onView={() => setSelected(table)}
                  onAdd={() => setAddModal(table)}
                  onSend={() => setSendModal(table)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <ConfettiCanvas />

      {/* Detail modal */}
      <AnimatePresence>
        {liveSelected && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
            <m.div className="rounded-2xl overflow-hidden w-[420px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ background: '#18181B' }}>
                <div className="text-[17px] font-bold text-white">Table {liveSelected.id}</div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={liveSelected.status} />
                  <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                {liveSelected.guests && <div className="flex justify-between text-sm"><span className="ds-text-tertiary">Convives</span><span className="font-semibold ds-text-primary">{liveSelected.guests}</span></div>}
                {liveSelected.durationMinutes && <div className="flex justify-between text-sm"><span className="ds-text-tertiary">Durée</span><span className="font-semibold ds-text-primary">{durationLabel(liveSelected.durationMinutes)}</span></div>}
                {liveSelected.amountCents ? (
                  <div className="border-t pt-4 space-y-2" style={{ borderColor: 'var(--ds-border)' }}>
                    <div className="flex justify-between text-sm"><span className="ds-text-tertiary">Addition totale</span><span className="text-lg font-bold ds-text-primary tabular-nums">{formatEur(liveSelected.amountCents)}</span></div>
                    {(liveSelected.paidCents ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="ds-text-tertiary">Déjà réglé</span><span className="font-semibold ds-text-success tabular-nums">{formatEur(liveSelected.paidCents ?? 0)}</span></div>}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-3 px-6 pb-5">
                {liveSelected.status !== 'free' && liveSelected.convexId && (
                  <button onClick={() => { resetToFree({ tableId: liveSelected.convexId as Id<'tables'> }).then(() => fire()).catch(() => {}); setSelected(null) }} className="flex-1 font-semibold text-sm rounded-xl py-2.5 border" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}>Libérer la table</button>
                )}
                <button onClick={() => setSelected(null)} className="flex-1 font-semibold text-sm rounded-xl py-2.5" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}>Fermer</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Simulate modal */}
      <AnimatePresence>
        {simulatingTable && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) { setSimTbl(null); setSimItems([]) } }}>
            <m.div className="rounded-2xl overflow-hidden w-[380px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-white text-[10px] font-bold" style={{ background: '#FBBF24' }}>TEST</span>
                  <span className="text-sm font-bold ds-text-primary">Simuler — Table {simulatingTable.id}</span>
                </div>
                <button onClick={() => { setSimTbl(null); setSimItems([]) }} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="px-5 py-4">
                {simItems.length === 0 ? <div className="py-6 text-center text-sm ds-text-tertiary">Aucun article — synchro Square d'abord.</div> : (
                  <div className="space-y-2">
                    {simItems.map((item, i) => <div key={i} className="flex items-center justify-between text-sm"><span className="ds-text-primary font-medium">{item.name} <span className="ds-text-tertiary font-normal">×{item.qty}</span></span><span className="font-semibold ds-text-primary tabular-nums">{formatEur(item.qty * item.unitCents)}</span></div>)}
                    <div className="flex items-center justify-between pt-3 mt-1 border-t" style={{ borderColor: 'var(--ds-border)' }}>
                      <span className="text-sm font-bold ds-text-primary">Total</span>
                      <span className="text-base font-bold ds-text-accent tabular-nums">{formatEur(simTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={() => { setSimTbl(null); setSimItems([]) }} className="flex-1 rounded-xl border text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Annuler</button>
                <button onClick={() => setSimItems(generateOrder(menu))} disabled={menu.length === 0} className="rounded-xl border px-3 py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}><RefreshCw size={15} /></button>
                <button onClick={confirmSimulation} disabled={simLoading || simItems.length === 0} className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5 disabled:opacity-50" style={{ background: '#E8920A' }}>{simLoading ? 'Envoi…' : 'Confirmer'}</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
      {/* Add item modal */}
      <AnimatePresence>
        {liveAdd && (
          <AddItemModal
            key={String(liveAdd.convexId)}
            table={liveAdd}
            menu={menu}
            menuLoading={rawMenu === undefined}
            onClose={() => setAddModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Send addition modal */}
      <AnimatePresence>
        {sendModal && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setSendModal(null) }}>
            <m.div className="rounded-2xl overflow-hidden w-[400px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ background: '#18181B' }}>
                <div className="text-[16px] font-bold text-white">Envoyer l'addition</div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-white/70">Table {sendModal.id}</span>
                  <button onClick={() => setSendModal(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
                </div>
              </div>
              <div className="px-5 py-5 space-y-3">
                <p className="text-[13px] ds-text-secondary leading-[1.5]">
                  Déclenche le flow de paiement QR pour cette table. Les convives seront invités à payer à leur prochain scan.
                </p>
                {sendModal.amountCents ? (
                  <div className="flex items-center justify-between p-3.5 rounded-[10px] border" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
                    <span className="text-[13px] ds-text-secondary">Montant à régler</span>
                    <span className="font-bold text-[16px] ds-text-primary tabular-nums">{formatEur(sendModal.amountCents)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3.5 rounded-[10px] border" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--ds-warning)' }} />
                    <span className="text-[13px] ds-text-secondary">Montant non défini — simuler une commande d'abord</span>
                  </div>
                )}
                {sendModal.status === 'payment' && (
                  <div className="p-3.5 rounded-[10px] border" style={{ background: 'var(--ds-accent-soft)', borderColor: '#F5DDB3' }}>
                    <span className="text-[12.5px]" style={{ color: 'var(--ds-accent-strong)' }}>Table déjà en paiement · les convives ont reçu la demande.</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 px-5 pb-5">
                <button onClick={() => setSendModal(null)} className="flex-1 rounded-xl border text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Annuler</button>
                {sendModal.status !== 'payment' && sendModal.convexId && (
                  <button
                    onClick={async () => {
                      setSendLoading(true)
                      try {
                        await updateStatus({ tableId: sendModal.convexId as Id<'tables'>, status: 'payment', guests: sendModal.guests, amountCents: sendModal.amountCents ?? 0 })
                      } finally { setSendLoading(false); setSendModal(null) }
                    }}
                    disabled={sendLoading || !sendModal.amountCents}
                    className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5 disabled:opacity-50"
                    style={{ background: '#E8920A' }}
                  >
                    {sendLoading ? 'Envoi…' : 'Passer en paiement'}
                  </button>
                )}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </RestaurantLayout>
  )
}

// ── Modal "Ajouter un article" ────────────────────────────────
// Menu réel du restaurant (Convex), recherche, quantités, commande en cours
// avec annulation de lignes non payées. Table libre → ouverture de la sitting
// (couverts + heure de début). Table réglée → refus : la sitting est close et
// réconciliée avec les paiements ; il faut libérer la table pour repartir
// propre. Menu vide → carte démo DEMO_MENU avec bannière (cohérent MenuPage).
function AddItemModal({ table, menu, menuLoading, onClose }: {
  table: TableData; menu: MenuDoc[]; menuLoading: boolean; onClose: () => void
}) {
  const [search, setSearch]     = useState('')
  const [selection, setSel]     = useState<Record<string, number>>({})
  const [guests, setGuests]     = useState(2)
  const [submitting, setSubmit] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const addOrderItems   = useMutation(api.tables.addOrderItems)
  const removeOrderItem = useMutation(api.tables.removeOrderItem)
  const resetToFree     = useMutation(api.tables.resetToFree)

  const isPaid  = table.status === 'paid'
  const isFree  = table.status === 'free'
  const paid    = table.paidCents ?? 0
  const total   = table.amountCents ?? 0
  const rest    = remainingCents(total, paid)

  // Articles disponibles uniquement ; menu vide → carte démo (bannière dédiée)
  const liveMenu = menu.filter(it => it.isAvailable !== false)
  const hasLiveMenu = liveMenu.length > 0
  const sourceMenu = hasLiveMenu ? liveMenu : DEMO_MENU

  const itemKey = (it: MenuDoc) => `${it.name}|${it.priceCents}`
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sourceMenu.filter(it => it.name.toLowerCase().includes(q)) : sourceMenu
  }, [sourceMenu, search])

  const grouped = useMemo(() => {
    const order = ['entrees', 'plats', 'desserts', 'boissons']
    const byCat = new Map<string, MenuDoc[]>()
    for (const it of visible) {
      const cat = it.category && CATEGORY_LABELS[it.category] ? it.category : 'plats'
      byCat.set(cat, [...(byCat.get(cat) ?? []), it])
    }
    return order.filter(c => byCat.has(c)).map(c => ({ cat: c, items: byCat.get(c)! }))
  }, [visible])

  const setQty = (key: string, qty: number) => {
    setSel(prev => {
      const next = { ...prev }
      if (qty <= 0) delete next[key]
      else next[key] = Math.min(99, qty)
      return next
    })
  }

  const pickedCount = Object.values(selection).reduce((s, q) => s + q, 0)
  const pickedCents = sourceMenu.reduce((s, it) => s + (selection[itemKey(it)] ?? 0) * it.priceCents, 0)

  async function confirm() {
    if (!table.convexId || pickedCount === 0) return
    const items = sourceMenu
      .filter(it => (selection[itemKey(it)] ?? 0) > 0)
      .map(it => ({ name: it.name, qty: selection[itemKey(it)], unitCents: it.priceCents }))
    setSubmit(true); setError(null)
    try {
      await addOrderItems({
        tableId: table.convexId,
        items,
        ...(isFree ? { guests } : {}),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout")
    } finally { setSubmit(false) }
  }

  async function removeLine(index: number, line: OrderLine) {
    if (!table.convexId) return
    setError(null)
    try {
      await removeOrderItem({
        tableId: table.convexId,
        index, name: line.name, unitCents: line.unitCents,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Annulation impossible')
    }
  }

  return (
    <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <m.div className="rounded-2xl overflow-hidden w-[440px] max-w-full flex flex-col" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)', maxHeight: 'min(640px, calc(100vh - 48px))' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold ds-text-primary">Ajouter un article — Table {table.id}</span>
            <StatusBadge status={table.status} />
          </div>
          <button onClick={onClose} className="ds-text-tertiary hover:ds-text-primary" aria-label="Fermer"><X size={16} /></button>
        </div>

        {isPaid ? (
          <>
            <div className="px-5 py-7 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-success-soft)' }}>
                <CheckCircle2 size={20} style={{ color: '#22C55E' }} />
              </div>
              <p className="text-sm ds-text-primary font-semibold">Table déjà réglée</p>
              <p className="text-[13px] ds-text-secondary leading-[1.5] max-w-[300px]">
                L'addition de cette sitting est close et réconciliée avec les paiements.
                Libérez la table pour démarrer une nouvelle commande.
              </p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={onClose} className="flex-1 rounded-xl border text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Fermer</button>
              <button
                onClick={() => { if (table.convexId) resetToFree({ tableId: table.convexId }).catch(() => {}) }}
                className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5"
                style={{ background: '#E8920A' }}
              >
                Libérer la table
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>
              {/* Contexte table */}
              {isFree ? (
                <div className="p-3 rounded-[10px] border space-y-2.5" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
                  <div className="text-[12.5px] ds-text-secondary">Table libre — valider l'ajout ouvre la table (statut <strong>En repas</strong>).</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold ds-text-primary">Couverts</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="w-7 h-7 rounded-[7px] border flex items-center justify-center" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }} aria-label="Moins de couverts"><Minus size={13} /></button>
                      <span className="w-6 text-center text-sm font-bold ds-text-primary tabular-nums">{guests}</span>
                      <button onClick={() => setGuests(g => Math.min(12, g + 1))} className="w-7 h-7 rounded-[7px] border flex items-center justify-center" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }} aria-label="Plus de couverts"><Plus size={13} /></button>
                    </div>
                  </div>
                </div>
              ) : paid > 0 ? (
                <div className="p-3 rounded-[10px] border" style={{ background: 'var(--ds-accent-soft)', borderColor: '#F5DDB3' }}>
                  <span className="text-[12.5px]" style={{ color: 'var(--ds-accent-strong)' }}>
                    Déjà encaissé <strong>{formatEur(paid)}</strong> sur {formatEur(total)} — reste <strong>{formatEur(rest)}</strong>. Les ajouts augmentent le reste à payer.
                  </span>
                </div>
              ) : null}

              {/* Commande en cours */}
              {(table.orderItems?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-2">Commande en cours · {formatEur(total)}</div>
                  <div className="rounded-[10px] border divide-y" style={{ borderColor: 'var(--ds-border)' }}>
                    {table.orderItems!.map((line, i) => (
                      <div key={`${line.name}-${i}`} className="flex items-center gap-2 px-3 py-2" style={{ borderColor: 'var(--ds-border)', opacity: line.paid ? 0.55 : 1 }}>
                        <span className="flex-1 text-[13px] ds-text-primary font-medium truncate">
                          {line.name} <span className="ds-text-tertiary font-normal">×{line.qty}</span>
                        </span>
                        {line.paid && (
                          <span className="text-[10.5px] font-semibold px-1.5 py-[2px] rounded-full" style={{ background: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' }}>Payé</span>
                        )}
                        <span className="text-[13px] font-semibold ds-text-primary tabular-nums">{formatEur(line.qty * line.unitCents)}</span>
                        {!line.paid && (
                          <button onClick={() => removeLine(i, line)} className="w-6 h-6 rounded-[6px] flex items-center justify-center ds-text-tertiary hover:text-red-500" aria-label={`Annuler ${line.name}`}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bannière démo */}
              {!menuLoading && !hasLiveMenu && (
                <div className="flex items-center gap-2 p-3 rounded-[10px] border" style={{ background: 'rgba(245,158,11,0.06)', borderColor: '#FBBF24' }}>
                  <span className="rounded px-1.5 py-0.5 text-white text-[10px] font-bold flex-shrink-0" style={{ background: '#FBBF24' }}>DÉMO</span>
                  <span className="text-[12px]" style={{ color: '#92400E' }}>Carte d'exemple — synchronisez votre menu (Square ou page Menu) pour vos vrais articles.</span>
                </div>
              )}

              {/* Recherche */}
              <div className="flex items-center gap-2 h-9 px-3 rounded-[10px] border" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
                <Search size={13} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un article…"
                  className="flex-1 bg-transparent border-none outline-none text-[16px] md:text-[13px] min-w-0"
                  style={{ color: 'var(--ds-text-primary)' }}
                />
              </div>

              {/* Menu */}
              {menuLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E8920A', borderTopColor: 'transparent' }} />
                </div>
              ) : grouped.length === 0 ? (
                <div className="py-8 text-center text-[13px] ds-text-tertiary">—</div>
              ) : (
                grouped.map(({ cat, items }) => (
                  <div key={cat}>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-2">{CATEGORY_LABELS[cat]}</div>
                    <div className="rounded-[10px] border divide-y" style={{ borderColor: 'var(--ds-border)' }}>
                      {items.map(it => {
                        const key = itemKey(it)
                        const qty = selection[key] ?? 0
                        return (
                          <div key={key} className="flex items-center gap-2.5 px-3 py-2" style={{ borderColor: 'var(--ds-border)' }}>
                            <span className="flex-1 min-w-0 text-[13px] ds-text-primary font-medium truncate">
                              {it.emoji ? `${it.emoji} ` : ''}{it.name}
                            </span>
                            <span className="text-[12.5px] ds-text-secondary tabular-nums flex-shrink-0">{formatEur(it.priceCents)}</span>
                            {qty === 0 ? (
                              <button
                                onClick={() => setQty(key, 1)}
                                className="h-7 px-2.5 rounded-[7px] border text-[12px] font-semibold flex items-center gap-1 flex-shrink-0"
                                style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                                aria-label={`Ajouter ${it.name}`}
                              >
                                <Plus size={12} /> Ajouter
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => setQty(key, qty - 1)} className="w-7 h-7 rounded-[7px] border flex items-center justify-center" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }} aria-label={`Diminuer ${it.name}`}><Minus size={13} /></button>
                                <span className="w-5 text-center text-[13px] font-bold ds-text-accent tabular-nums">{qty}</span>
                                <button onClick={() => setQty(key, qty + 1)} className="w-7 h-7 rounded-[7px] border flex items-center justify-center" style={{ background: 'var(--ds-accent-soft)', borderColor: '#F5DDB3', color: 'var(--ds-accent-strong)' }} aria-label={`Augmenter ${it.name}`}><Plus size={13} /></button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t space-y-2.5" style={{ borderColor: 'var(--ds-border)' }}>
              {error && (
                <div className="flex items-center gap-2 text-[12.5px] font-medium" style={{ color: '#DC2626' }}>
                  <AlertTriangle size={13} className="flex-shrink-0" />{error}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 rounded-xl border text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Annuler</button>
                <button
                  onClick={confirm}
                  disabled={submitting || pickedCount === 0}
                  className="flex-[1.4] rounded-xl text-white text-sm font-semibold py-2.5 disabled:opacity-50"
                  style={{ background: '#E8920A' }}
                >
                  {submitting ? 'Ajout…' : pickedCount === 0 ? 'Ajouter' : `Ajouter ${pickedCount} article${pickedCount > 1 ? 's' : ''} · ${formatEur(pickedCents)}`}
                </button>
              </div>
            </div>
          </>
        )}
      </m.div>
    </m.div>
  )
}

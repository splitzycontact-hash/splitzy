import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId } from '../context/RestaurantContext'
import {
  Printer, Search, SlidersHorizontal, LayoutGrid, List,
  X, ChevronLeft, ChevronRight, Euro, HandCoins, Percent, CreditCard, CheckCircle, Clock, RotateCcw, AlertCircle, FileText, Mail, Trash2, Check, Info, Download,
} from 'lucide-react'

// ─── À REMPLACER par query Convex + Tiime API quand SIRET obtenu ───────────
type SplitzyInvoice = {
  id: string
  number: string       // ex: "2026-000001"
  period: string       // ex: "Mai 2026"
  issuedAt: string     // ex: "01/06/2026"
  dueAt: string        // ex: "15/06/2026"
  amountHT: number     // en euros
  tva: number          // en euros
  amountTTC: number    // en euros
  status: 'Payée' | 'En attente' | 'En retard'
  tiimePdfUrl: string | null  // lien PDF Tiime, null si pas encore émise
}

const SPLITZY_COMPANY_CONFIG = {
  siret: 'En cours d\'immatriculation',  // ← remplacer dès réception du SIRET
  tvaNumber: '',                          // ← remplacer dès activation TVA
  commissionRate: 0.015,
  tvaRate: 0.20,
}

const MOCK_SPLITZY_INVOICES: SplitzyInvoice[] = [
  { id: '1', number: '2026-000001', period: 'Avril 2026', issuedAt: '01/05/2026', dueAt: '15/05/2026', amountHT: 48.50, tva: 9.70, amountTTC: 58.20, status: 'Payée', tiimePdfUrl: null },
  { id: '2', number: '2026-000002', period: 'Mai 2026', issuedAt: '01/06/2026', dueAt: '15/06/2026', amountHT: 62.30, tva: 12.46, amountTTC: 74.76, status: 'En attente', tiimePdfUrl: null },
]
// ────────────────────────────────────────────────────────────────────────────

type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'custom'

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today',   label: "Aujourd'hui" },
  { key: 'week',    label: 'Cette semaine' },
  { key: 'month',   label: 'Ce mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'custom',  label: 'Personnalisé…' },
]

type RowStatus = 'Encaissé' | 'En attente' | 'Remboursé' | 'Partiel'
type PayMethod = 'card' | 'apay' | 'gpay'

type LocalRow = {
  d: string; time: string; table: string; guests: number; method: PayMethod
  ref: string; amount: number; tip: number; fee: number; status: RowStatus
  partialPaid?: number
}

const METHOD_LABELS: Record<PayMethod, { ic: string; name: string; cls: string }> = {
  apay: { ic: 'Pay', name: 'Apple Pay',  cls: '#1A1A1A' },
  gpay: { ic: 'G',   name: 'Google Pay', cls: '#4285F4' },
  card: { ic: 'CB',  name: 'Carte',      cls: '#52525B' },
}

const STATUS_STYLE: Record<RowStatus, { bg: string; color: string }> = {
  'Encaissé':  { bg: 'var(--ds-success-soft)',  color: 'var(--ds-success-strong)' },
  'En attente':{ bg: 'var(--ds-warning-soft)',  color: 'var(--ds-warning)' },
  'Remboursé': { bg: 'var(--ds-bg-subtle)',     color: 'var(--ds-text-tertiary)' },
  'Partiel':   { bg: 'var(--ds-accent-soft)',   color: 'var(--ds-accent-strong)' },
}

const DAY_LABELS: Record<string, string> = {
  '28/05': "Aujourd'hui · jeudi 29 mai",
  '27/05': 'Hier · mercredi 28 mai',
  '26/05': 'Mardi 27 mai',
}

// Static demo rows that complement real Convex data
const DEMO_ROWS: LocalRow[] = [
  { d:'28/05', time:'13:42', table:'T2', guests:2, method:'apay', ref:'SPZ-26052828-0042', amount:52.80, tip:4.80, fee:0.72, status:'Encaissé' },
  { d:'28/05', time:'13:28', table:'T6', guests:3, method:'card', ref:'SPZ-26052828-0041', amount:84.20, tip:7.50, fee:1.41, status:'Encaissé' },
  { d:'28/05', time:'12:54', table:'T2', guests:2, method:'gpay', ref:'SPZ-26052828-0040', amount:22.00, tip:2.00, fee:0.30, status:'Encaissé' },
  { d:'28/05', time:'12:18', table:'T4', guests:4, method:'apay', ref:'SPZ-26052828-0038', amount:118.50, tip:12.00, fee:1.93, status:'Partiel', partialPaid:88 },
  { d:'27/05', time:'22:14', table:'T1', guests:2, method:'card', ref:'SPZ-26052728-0037', amount:24.20, tip:2.20, fee:0.33, status:'Encaissé' },
  { d:'27/05', time:'21:48', table:'T1', guests:5, method:'apay', ref:'SPZ-26052728-0036', amount:73.70, tip:6.70, fee:1.01, status:'Encaissé' },
  { d:'27/05', time:'20:55', table:'T3', guests:4, method:'card', ref:'SPZ-26052728-0034', amount:142.80, tip:14.80, fee:2.29, status:'Encaissé' },
  { d:'27/05', time:'19:58', table:'T3', guests:3, method:'card', ref:'SPZ-26052728-0032', amount:55.00, tip:5.00, fee:0.75, status:'Remboursé' },
  { d:'26/05', time:'22:01', table:'T5', guests:6, method:'card', ref:'SPZ-26052628-0030', amount:218.40, tip:22.00, fee:3.43, status:'Encaissé' },
  { d:'26/05', time:'20:48', table:'T4', guests:3, method:'card', ref:'SPZ-26052628-0028', amount:76.20, tip:0, fee:1.04, status:'En attente' },
]

type ConvexPayment = {
  dateLabel: string; tableNumber: number; guests: number;
  totalCents: number; tipCents: number; commissionCents: number;
  subtotalCents: number; paymentMethod: string;
  status: 'Encaissé' | 'En attente' | 'Remboursé'
  createdAt: number
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status }: { status: RowStatus }) {
  const s = STATUS_STYLE[status]
  const Icon = status === 'Encaissé' ? CheckCircle : status === 'En attente' ? Clock : status === 'Remboursé' ? RotateCcw : AlertCircle
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon size={10} />
      {status}
    </span>
  )
}

function Drawer({ row, onClose }: { row: LocalRow; onClose: () => void }) {
  const ttc = row.amount
  const tip = row.tip
  const ht = ttc - tip
  const tva = (ht * 0.1) / 1.1
  const htNet = ht - tva
  const m = METHOD_LABELS[row.method]

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden border-l"
        style={{
          width: '420px',
          background: 'var(--ds-bg-surface)',
          borderColor: 'var(--ds-border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="font-bold text-[15px] ds-text-primary">Transaction · {row.table}</div>
            <div className="text-[11.5px] ds-text-tertiary mt-0.5 font-mono">{row.ref}</div>
          </div>
          <button onClick={onClose} className="ds-text-tertiary hover:ds-text-primary transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Amount */}
          <div>
            <div
              className="font-extrabold tabular-nums tracking-[-0.04em] leading-none"
              style={{ fontSize: '48px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
            >
              {fmt(row.amount).split(',')[0]}<span className="text-[24px] ds-text-tertiary">,{fmt(row.amount).split(',')[1]} €</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={row.status} />
              <span className="text-[12px] ds-text-tertiary">{DAY_LABELS[row.d] ?? row.d} · {row.time}</span>
            </div>
          </div>

          {/* Payment detail */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Détail du paiement</h4>
            <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--ds-border)' }}>
              {[
                { k: 'Sous-total HT', v: `${fmt(htNet)} €`, color: undefined },
                { k: 'TVA 10%',       v: `${fmt(tva)} €`,   color: undefined },
                { k: 'Pourboire',     v: `+ ${fmt(tip)} €`, color: 'var(--ds-success)' },
                { k: 'Total encaissé', v: `${fmt(row.amount)} €`, bold: true },
              ].map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                  style={{
                    borderBottom: i < 3 ? `1px solid var(--ds-border)` : 'none',
                    background: r.bold ? 'var(--ds-bg-base)' : 'var(--ds-bg-surface)',
                  }}
                >
                  <span className={r.bold ? 'font-semibold ds-text-primary' : 'ds-text-secondary'}>{r.k}</span>
                  <span
                    className={`font-semibold tabular-nums ${r.bold ? 'ds-text-primary' : 'ds-text-secondary'}`}
                    style={{ color: r.color ?? undefined }}
                  >
                    {r.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Informations</h4>
            <div className="space-y-2">
              {[
                { k: 'Table', v: row.table },
                { k: 'Convives', v: `${row.guests} personnes · partage par article` },
                { k: 'Méthode', v: m.name },
                { k: 'Commission Splitzy', v: `${fmt(row.fee)} € (1,5% + 0,15 €)` },
                { k: 'Net pour le restaurant', v: `${fmt(row.amount - row.fee)} €`, highlight: true },
              ].map(row => (
                <div key={row.k} className="flex items-center justify-between text-[13px]">
                  <span className="ds-text-secondary">{row.k}</span>
                  <span
                    className="font-semibold tabular-nums"
                    style={{ color: row.highlight ? 'var(--ds-success-strong)' : 'var(--ds-text-primary)' }}
                  >
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Actions</h4>
            <div className="flex flex-col gap-2">
              {[
                { icon: FileText, label: 'Télécharger le justificatif PDF', danger: false },
                { icon: Mail,     label: 'Envoyer le reçu par email',        danger: false },
                { icon: Trash2,   label: 'Initier un remboursement',          danger: true  },
              ].map(({ icon: Icon, label, danger }) => (
                <button
                  key={label}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[9px] border text-[13px] font-medium transition-colors"
                  style={{
                    background: danger ? 'var(--ds-error-soft)' : 'var(--ds-bg-surface)',
                    borderColor: danger ? 'var(--ds-error-soft)' : 'var(--ds-border)',
                    color: danger ? 'var(--ds-error)' : 'var(--ds-text-primary)',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

const STATUS_OPTS: { label: string; value: RowStatus }[] = [
  { label: 'Payée',      value: 'Encaissé'   },
  { label: 'En attente', value: 'En attente'  },
  { label: 'Remboursée', value: 'Remboursé'  },
]
const METHOD_OPTS: { label: string; value: PayMethod }[] = [
  { label: 'Carte',       value: 'card' },
  { label: 'Apple Pay',   value: 'apay' },
  { label: 'Google Pay',  value: 'gpay' },
]

const SPLITZY_STATUS_STYLE: Record<SplitzyInvoice['status'], { bg: string; color: string; Icon: typeof CheckCircle }> = {
  'Payée':      { bg: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)', Icon: CheckCircle },
  'En attente': { bg: 'var(--ds-warning-soft)', color: 'var(--ds-warning)',        Icon: Clock },
  'En retard':  { bg: 'var(--ds-error-soft)',   color: 'var(--ds-error)',          Icon: AlertCircle },
}

function SplitzyStatusBadge({ status }: { status: SplitzyInvoice['status'] }) {
  const s = SPLITZY_STATUS_STYLE[status]
  const Icon = s.Icon
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon size={10} />
      {status}
    </span>
  )
}

const SPLITZY_GRID = '130px 1fr 110px 90px 120px 120px 170px'

function SplitzyInvoicesTab() {
  const invoices = MOCK_SPLITZY_INVOICES
  const totalTTC   = invoices.reduce((s, i) => s + i.amountTTC, 0)
  const paidTTC    = invoices.filter(i => i.status === 'Payée').reduce((s, i) => s + i.amountTTC, 0)
  const pendingTTC = invoices.filter(i => i.status === 'En attente').reduce((s, i) => s + i.amountTTC, 0)

  return (
    <div className="px-9 py-6 space-y-5">

      {/* Info banner */}
      <div
        className="flex items-start gap-2.5 px-4 py-3 rounded-[10px] border text-[12.5px]"
        style={{ background: 'var(--ds-accent-soft)', borderColor: '#F5DDB3', color: 'var(--ds-accent-strong)' }}
      >
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Vos factures de commission Splitzy (1,5% + TVA). SIRET : {SPLITZY_COMPANY_CONFIG.siret}</span>
      </div>

      {/* KPI row */}
      <section
        className="grid grid-cols-1 sm:grid-cols-3 border rounded-[12px] overflow-hidden"
        style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
      >
        {/* Total facturé TTC */}
        <div className="flex flex-col gap-1.5 px-5 py-4" style={{ borderRight: '1px solid var(--ds-border)' }}>
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
            <Euro size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
            Total facturé TTC
          </div>
          <div className="font-extrabold tabular-nums leading-none tracking-[-0.025em]" style={{ fontSize: '22px', color: 'var(--ds-accent)', fontFamily: 'Inter, sans-serif' }}>
            {fmt(totalTTC)} €
          </div>
          <div className="text-[11.5px] ds-text-tertiary">{invoices.length} factures émises</div>
        </div>

        {/* Payé */}
        <div className="flex flex-col gap-1.5 px-5 py-4" style={{ borderRight: '1px solid var(--ds-border)' }}>
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
            <CheckCircle size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
            Payé
          </div>
          <div className="font-extrabold tabular-nums leading-none tracking-[-0.025em] ds-text-success" style={{ fontSize: '22px', fontFamily: 'Inter, sans-serif' }}>
            {fmt(paidTTC)} €
          </div>
          <div className="text-[11.5px] ds-text-tertiary">{invoices.filter(i => i.status === 'Payée').length} facture(s) réglée(s)</div>
        </div>

        {/* En attente */}
        <div className="flex flex-col gap-1.5 px-5 py-4">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
            <Clock size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
            En attente
          </div>
          <div className="font-extrabold tabular-nums leading-none tracking-[-0.025em]" style={{ fontSize: '22px', color: 'var(--ds-warning)', fontFamily: 'Inter, sans-serif' }}>
            {fmt(pendingTTC)} €
          </div>
          <div className="text-[11.5px] ds-text-tertiary">{invoices.filter(i => i.status === 'En attente').length} facture(s) à régler</div>
        </div>
      </section>

      {/* Table */}
      <div className="ds-panel">
        {/* Header */}
        <div
          className="grid text-[10.5px] font-bold uppercase tracking-[0.07em] px-5 py-2.5"
          style={{
            gridTemplateColumns: SPLITZY_GRID,
            background: 'var(--ds-bg-subtle)',
            color: 'var(--ds-text-tertiary)',
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <div>Numéro</div>
          <div>Période</div>
          <div className="text-right">Montant HT</div>
          <div className="text-right">TVA</div>
          <div className="text-right">Montant TTC</div>
          <div>Statut</div>
          <div className="text-right">Action</div>
        </div>

        {/* Rows */}
        {invoices.map((inv, i) => (
          <div
            key={inv.id}
            className="grid items-center px-5 py-3 border-b"
            style={{
              gridTemplateColumns: SPLITZY_GRID,
              borderColor: 'var(--ds-border)',
              background: i % 2 === 1 ? 'var(--ds-bg-base)' : 'var(--ds-bg-surface)',
            }}
          >
            <div className="font-mono text-[12px] font-semibold ds-text-primary">{inv.number}</div>
            <div>
              <div className="text-[13px] ds-text-primary font-medium">{inv.period}</div>
              <div className="text-[11px] ds-text-tertiary mt-0.5">Émise {inv.issuedAt} · Éch. {inv.dueAt}</div>
            </div>
            <div className="text-right text-[13px] ds-text-secondary tabular-nums">{fmt(inv.amountHT)} €</div>
            <div className="text-right text-[13px] ds-text-tertiary tabular-nums">{fmt(inv.tva)} €</div>
            <div className="text-right text-[13px] font-semibold ds-text-primary tabular-nums">{fmt(inv.amountTTC)} €</div>
            <div><SplitzyStatusBadge status={inv.status} /></div>
            <div className="text-right">
              {inv.tiimePdfUrl ? (
                <button
                  onClick={() => window.open(inv.tiimePdfUrl!, '_blank')}
                  className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-lg border text-[12px] font-medium transition-colors"
                  style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
                >
                  <Download size={13} />
                  Télécharger PDF
                </button>
              ) : (
                <button
                  disabled
                  title="PDF disponible après émission"
                  className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-lg border text-[12px] font-medium cursor-not-allowed"
                  style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-tertiary)', opacity: 0.6 }}
                >
                  <Download size={13} />
                  Télécharger PDF
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-[11.5px] ds-text-tertiary pt-1">
        Factures émises via Tiime · Pour toute question : splitzy.contact@gmail.com
      </div>
    </div>
  )
}

export function Factures() {
  const [activeTab, setActiveTab]       = useState<'transactions' | 'splitzy'>('transactions')
  const [period, setPeriod]             = useState<PeriodKey>('week')
  const [search, setSearch]             = useState('')
  const [drawerRow, setDrawerRow]       = useState<LocalRow | null>(null)
  const [activeStatuses, setActiveStatuses] = useState<Set<RowStatus>>(new Set(['Encaissé', 'En attente', 'Remboursé']))
  const [activeMethods, setActiveMethods]   = useState<Set<PayMethod>>(new Set(['card', 'apay', 'gpay']))
  const [openDropdown, setOpenDropdown] = useState<'status' | 'method' | null>(null)
  const [moreDrawer, setMoreDrawer]     = useState(false)
  const [gridView, setGridView]         = useState(false)
  const [amountMin, setAmountMin]       = useState('')
  const [amountMax, setAmountMax]       = useState('')
  const dropdownRef                     = useRef<HTMLDivElement>(null)
  const restaurantId = useRestaurantId()

  useEffect(() => {
    if (!openDropdown) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openDropdown])
  const rawPayments = useQuery(api.payments.list, restaurantId ? { restaurantId } : 'skip')

  // Map Convex payments or use demo rows
  const rows: LocalRow[] = rawPayments != null
    ? (rawPayments as ConvexPayment[]).map((p, i) => ({
        d: p.dateLabel,
        time: new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        table: `T${p.tableNumber}`,
        guests: p.guests,
        method: 'card' as PayMethod,
        ref: `SPZ-${String(i).padStart(8, '0')}`,
        amount: p.totalCents / 100,
        tip: p.tipCents / 100,
        fee: p.commissionCents / 100,
        status: p.status as RowStatus,
      }))
    : DEMO_ROWS

  const filteredRows = rows.filter(r => {
    const matchSearch = !search || r.table.toLowerCase().includes(search.toLowerCase()) || r.ref.includes(search)
    const matchStatus = activeStatuses.has(r.status) || (r.status === 'Partiel' && activeStatuses.has('Encaissé'))
    const matchMethod = activeMethods.has(r.method)
    const min = amountMin ? parseFloat(amountMin.replace(',', '.')) : null
    const max = amountMax ? parseFloat(amountMax.replace(',', '.')) : null
    return matchSearch && matchStatus && matchMethod && (!min || r.amount >= min) && (!max || r.amount <= max)
  })

  const encaisse   = rows.filter(r => r.status === 'Encaissé')
  const caGros     = encaisse.reduce((s, r) => s + r.amount, 0)
  const pourboires = encaisse.reduce((s, r) => s + r.tip, 0)
  const commission = encaisse.reduce((s, r) => s + r.fee, 0)
  const net        = caGros - commission + pourboires

  // Group by day
  const grouped = filteredRows.reduce<Record<string, LocalRow[]>>((acc, r) => {
    (acc[r.d] = acc[r.d] || []).push(r)
    return acc
  }, {})

  const openDrawer = useCallback((row: LocalRow) => setDrawerRow(row), [])

  return (
    <RestaurantLayout>
      <PageHeader
        title="Factures"
        subtitle={
          <span>
            Historique des paiements
            <span className="mx-2 ds-text-tertiary">·</span>
            <span className="ds-text-tertiary">{rows.length} transactions</span>
          </span>
        }
        actions={
          <>
            <button
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium transition-colors"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Printer size={14} />
              Rapport mensuel
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="px-9 pt-5">
        <div
          className="inline-flex rounded-[10px] p-[3px] gap-px border"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {([{ k: 'transactions', label: 'Transactions' }, { k: 'splitzy', label: 'Factures Splitzy' }] as const).map(t => (
            <button
              key={t.k}
              onClick={() => setActiveTab(t.k)}
              className="px-4 py-[6px] rounded-[7px] text-[12.5px] transition-colors whitespace-nowrap"
              style={{
                background: activeTab === t.k ? 'var(--ds-bg-subtle)' : 'none',
                color: activeTab === t.k ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                fontWeight: activeTab === t.k ? 600 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'splitzy' && <SplitzyInvoicesTab />}

      {activeTab === 'transactions' && (
      <div className="px-9 py-6 space-y-5">

        {/* KPI row */}
        <section
          className="grid grid-cols-2 xl:grid-cols-4 border rounded-[12px] overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {/* CA Brut */}
          <div className="flex flex-col gap-1.5 px-5 py-4" style={{ borderRight: '1px solid var(--ds-border)' }}>
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
              <Euro size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
              CA Brut
            </div>
            <div className="font-extrabold tabular-nums leading-none tracking-[-0.025em]" style={{ fontSize: '22px', color: 'var(--ds-accent)', fontFamily: 'Inter, sans-serif' }}>
              {fmt(caGros)} €
            </div>
            <div className="text-[11.5px] ds-text-tertiary">
              <span className="font-semibold" style={{ color: 'var(--ds-success-strong)' }}>+14,2%</span> vs semaine préc.
            </div>
          </div>

          {/* Pourboires */}
          <div className="flex flex-col gap-1.5 px-5 py-4" style={{ borderRight: '1px solid var(--ds-border)' }}>
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
              <HandCoins size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
              Pourboires
            </div>
            <div className="font-extrabold tabular-nums leading-none tracking-[-0.025em] ds-text-success" style={{ fontSize: '22px', fontFamily: 'Inter, sans-serif' }}>
              {fmt(pourboires)} €
            </div>
            <div className="text-[11.5px] ds-text-tertiary">
              {caGros > 0 ? ((pourboires / caGros) * 100).toFixed(1) : '9,1'}% du CA · moy. client
            </div>
          </div>

          {/* Commission */}
          <div className="flex flex-col gap-1.5 px-5 py-4" style={{ borderRight: '1px solid var(--ds-border)' }}>
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
              <Percent size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
              Commission Splitzy
            </div>
            <div className="font-extrabold tabular-nums leading-none tracking-[-0.025em] ds-text-primary" style={{ fontSize: '22px', fontFamily: 'Inter, sans-serif' }}>
              {fmt(commission)} €
            </div>
            <div className="text-[11.5px] ds-text-tertiary">1,5% + 0,15 € / transaction</div>
          </div>

          {/* Net à recevoir — dark */}
          <div className="flex flex-col gap-1.5 px-5 py-4" style={{ background: '#0A0A0A' }}>
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: '#A1A1AA' }}>
              <CreditCard size={12} style={{ color: '#71717A' }} />
              Net à recevoir
            </div>
            <div className="font-extrabold tabular-nums leading-none tracking-[-0.025em]" style={{ fontSize: '22px', color: 'white', fontFamily: 'Inter, sans-serif' }}>
              {fmt(net)} €
            </div>
            <div className="text-[11.5px]" style={{ color: '#A1A1AA' }}>
              <span
                className="inline-flex items-center gap-1 font-semibold px-1.5 py-[2px] rounded-[4px] mr-1.5"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
              >
                Virement
              </span>
              prévu lundi 1<sup>er</sup> juin
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Period segmented */}
          <div
            className="inline-flex rounded-[10px] p-[3px] gap-px border"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className="px-3 py-[5px] rounded-[7px] text-[12.5px] transition-colors whitespace-nowrap"
                style={{
                  background: period === key ? 'var(--ds-bg-subtle)' : 'none',
                  color: period === key ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                  fontWeight: period === key ? 600 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-lg border flex-1 max-w-[280px]"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            <Search size={13} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par n° table, référence…"
              className="flex-1 bg-transparent border-none outline-none min-w-0"
              style={{ fontSize: '13px', color: 'var(--ds-text-primary)' }}
            />
          </div>

          {/* Right actions */}
          <div ref={dropdownRef} className="flex items-center gap-2 ml-auto">
            {/* Statut dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(d => d === 'status' ? null : 'status')}
                className="inline-flex items-center gap-1.5 px-3 py-[5px] h-8 rounded-lg border text-[12.5px] font-medium transition-colors"
                style={{
                  background: openDropdown === 'status' ? 'var(--ds-accent-soft)' : 'var(--ds-bg-surface)',
                  borderColor: openDropdown === 'status' ? '#F5DDB3' : 'var(--ds-border)',
                  color: openDropdown === 'status' ? 'var(--ds-accent-strong)' : 'var(--ds-text-primary)',
                  boxShadow: 'var(--ds-shadow-sm)',
                }}
              >
                Statut
                <span className="text-[10.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: '#E8920A', color: 'white' }}>
                  {activeStatuses.size}
                </span>
              </button>
              {openDropdown === 'status' && (
                <div className="absolute right-0 top-9 z-60 w-44 rounded-[10px] border py-1 shadow-lg" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                  {STATUS_OPTS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setActiveStatuses(s => {
                        const n = new Set(s)
                        n.has(opt.value) ? n.delete(opt.value) : n.add(opt.value)
                        return n
                      })}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left transition-colors hover:ds-bg-subtle"
                      style={{ color: 'var(--ds-text-primary)' }}
                    >
                      <span className="w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0" style={{ background: activeStatuses.has(opt.value) ? '#E8920A' : 'transparent', borderColor: activeStatuses.has(opt.value) ? '#E8920A' : 'var(--ds-border-strong)' }}>
                        {activeStatuses.has(opt.value) && <Check size={10} color="white" />}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Méthode dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(d => d === 'method' ? null : 'method')}
                className="inline-flex items-center gap-1.5 px-3 py-[5px] h-8 rounded-lg border text-[12.5px] font-medium transition-colors"
                style={{
                  background: openDropdown === 'method' ? 'var(--ds-accent-soft)' : 'var(--ds-bg-surface)',
                  borderColor: openDropdown === 'method' ? '#F5DDB3' : 'var(--ds-border)',
                  color: openDropdown === 'method' ? 'var(--ds-accent-strong)' : 'var(--ds-text-primary)',
                  boxShadow: 'var(--ds-shadow-sm)',
                }}
              >
                Méthode
                {activeMethods.size < 3 && (
                  <span className="text-[10.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: '#E8920A', color: 'white' }}>
                    {activeMethods.size}
                  </span>
                )}
              </button>
              {openDropdown === 'method' && (
                <div className="absolute right-0 top-9 z-60 w-44 rounded-[10px] border py-1 shadow-lg" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                  {METHOD_OPTS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setActiveMethods(s => {
                        const n = new Set(s)
                        n.has(opt.value) ? n.delete(opt.value) : n.add(opt.value)
                        return n
                      })}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left transition-colors hover:ds-bg-subtle"
                      style={{ color: 'var(--ds-text-primary)' }}
                    >
                      <span className="w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0" style={{ background: activeMethods.has(opt.value) ? '#E8920A' : 'transparent', borderColor: activeMethods.has(opt.value) ? '#E8920A' : 'var(--ds-border-strong)' }}>
                        {activeMethods.has(opt.value) && <Check size={10} color="white" />}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Plus de filtres */}
            <button
              onClick={() => setMoreDrawer(true)}
              className="inline-flex items-center gap-1.5 px-3 py-[5px] h-8 rounded-lg border text-[12.5px] font-medium transition-colors"
              style={{ background: (amountMin || amountMax) ? 'var(--ds-accent-soft)' : 'var(--ds-bg-surface)', borderColor: (amountMin || amountMax) ? '#F5DDB3' : 'var(--ds-border)', color: (amountMin || amountMax) ? 'var(--ds-accent-strong)' : 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <SlidersHorizontal size={13} />
              Plus de filtres
            </button>
            <div className="w-px h-[22px] mx-1" style={{ background: 'var(--ds-border)' }} />
            {/* Grid toggle */}
            <button
              onClick={() => setGridView(v => !v)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border transition-colors"
              style={{ background: gridView ? 'var(--ds-accent-soft)' : 'var(--ds-bg-surface)', borderColor: gridView ? '#F5DDB3' : 'var(--ds-border)', color: gridView ? 'var(--ds-accent-strong)' : 'var(--ds-text-secondary)', boxShadow: 'var(--ds-shadow-sm)' }}
              title={gridView ? 'Vue liste' : 'Vue grille'}
            >
              {gridView ? <List size={15} /> : <LayoutGrid size={15} />}
            </button>
          </div>
        </div>

        {/* Table / Grid */}
        <div className="ds-panel">
          {gridView && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
              {filteredRows.length === 0 ? (
                <div className="col-span-3 py-10 text-center text-[13px] ds-text-tertiary">Aucune transaction.</div>
              ) : filteredRows.map((row, i) => {
                const ml = METHOD_LABELS[row.method]
                return (
                  <div
                    key={i}
                    className="rounded-[12px] border p-4 cursor-pointer transition-all hover:-translate-y-px"
                    style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
                    onClick={() => openDrawer(row)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[13px] px-2 py-[2px] rounded-[5px]" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)' }}>{row.table}</span>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="font-extrabold text-[24px] tabular-nums tracking-[-0.025em] ds-text-primary mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>{fmt(row.amount)} €</div>
                    <div className="flex items-center justify-between text-[12px] ds-text-tertiary">
                      <span>{row.d} · {row.time}</span>
                      <span className="inline-flex items-center justify-center font-bold text-[9px] px-1.5 py-[2px] rounded-[3px] text-white" style={{ background: ml.cls }}>{ml.ic}</span>
                    </div>
                    {row.tip > 0 && <div className="text-[12px] font-medium mt-1" style={{ color: 'var(--ds-success-strong)' }}>+{fmt(row.tip)} € pourboire</div>}
                  </div>
                )
              })}
            </div>
          )}
          {!gridView && (
          <>
          {/* Table header */}
          <div
            className="grid text-[10.5px] font-bold uppercase tracking-[0.07em] px-5 py-2.5"
            style={{
              gridTemplateColumns: '1fr 120px 80px 80px 90px 100px 80px 80px 100px',
              background: 'var(--ds-bg-subtle)',
              color: 'var(--ds-text-tertiary)',
              borderBottom: '1px solid var(--ds-border)',
            }}
          >
            <div>Heure / Référence</div>
            <div>Table</div>
            <div>Conv.</div>
            <div>Méthode</div>
            <div className="text-right">Montant</div>
            <div className="text-right">Pourboire</div>
            <div className="text-right">Commission</div>
            <div className="text-right">Statut</div>
            <div />
          </div>

          {/* Grouped rows */}
          {Object.entries(grouped).length === 0 ? (
            <div className="py-12 text-center text-[13px] ds-text-tertiary">Aucune transaction pour cette période.</div>
          ) : (
            Object.entries(grouped).map(([day, dayRows]) => {
              const dayTotal = dayRows.filter(r => r.status !== 'Remboursé').reduce((s, r) => s + r.amount, 0)
              const dayTips  = dayRows.filter(r => r.status !== 'Remboursé').reduce((s, r) => s + r.tip, 0)
              return (
                <div key={day}>
                  {/* Day header */}
                  <div
                    className="flex items-center gap-2 px-5 py-2.5 text-[12px]"
                    style={{ background: 'var(--ds-bg-base)', borderBottom: '1px solid var(--ds-border)', borderTop: '1px solid var(--ds-border)' }}
                  >
                    <span className="font-semibold ds-text-primary">{DAY_LABELS[day] ?? day}</span>
                    <span className="ds-text-tertiary">·</span>
                    <span className="ds-text-secondary">{dayRows.length} transactions</span>
                    <div className="ml-auto flex items-center gap-4">
                      <span className="ds-text-secondary">
                        Pourboires <strong className="ds-text-primary tabular-nums">{fmt(dayTips)} €</strong>
                      </span>
                      <span className="ds-text-secondary">
                        Total <strong className="ds-text-primary tabular-nums">{fmt(dayTotal)} €</strong>
                      </span>
                    </div>
                  </div>

                  {/* Rows */}
                  {dayRows.map((row, i) => {
                    const m = METHOD_LABELS[row.method]
                    const tipPct = row.amount > 0 && row.tip > 0 ? Math.round((row.tip / (row.amount - row.tip)) * 100) : 0
                    return (
                      <div
                        key={i}
                        className="grid items-center px-5 py-3 border-b cursor-pointer transition-colors hover:ds-bg-subtle"
                        style={{
                          gridTemplateColumns: '1fr 120px 80px 80px 100px 80px 80px 100px 40px',
                          borderColor: 'var(--ds-border)',
                          background: i % 2 === 1 ? 'var(--ds-bg-base)' : 'var(--ds-bg-surface)',
                        }}
                        onClick={() => openDrawer(row)}
                      >
                        <div>
                          <div className="font-semibold text-[13px] ds-text-primary tabular-nums">{row.time}</div>
                          <div className="text-[11px] ds-text-tertiary font-mono mt-0.5">
                            {row.ref.split('-').slice(0, 3).join('-')}-<strong>{row.ref.split('-').pop()}</strong>
                          </div>
                        </div>
                        <div>
                          <span
                            className="inline-flex items-center justify-center font-bold text-[12px] px-2 py-[2px] rounded-[5px]"
                            style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)' }}
                          >
                            {row.table}
                          </span>
                        </div>
                        <div className="text-[13px] ds-text-secondary">{row.guests}</div>
                        <div className="flex items-center gap-1">
                          <span
                            className="inline-flex items-center justify-center font-bold text-[9px] w-6 h-5 rounded-[3px] text-white"
                            style={{ background: m.cls, letterSpacing: '0.02em' }}
                          >
                            {m.ic}
                          </span>
                          <span className="text-[11.5px] ds-text-secondary">{m.name}</span>
                        </div>
                        <div className="text-right font-semibold text-[13px] ds-text-primary tabular-nums">
                          {fmt(row.amount)} €
                        </div>
                        <div className="text-right">
                          {row.tip > 0 ? (
                            <span>
                              <span className="font-medium text-[13px] ds-text-success tabular-nums">{fmt(row.tip)} €</span>
                              <span className="text-[11px] ds-text-tertiary ml-1">{tipPct}%</span>
                            </span>
                          ) : (
                            <span className="ds-text-tertiary">—</span>
                          )}
                        </div>
                        <div className="text-right text-[13px] ds-text-tertiary tabular-nums">{fmt(row.fee)} €</div>
                        <div className="text-right">
                          <StatusBadge status={row.status} />
                        </div>
                        <div />
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}

          {/* Pagination */}
          <div
            className="flex items-center justify-between px-5 py-3 border-t"
            style={{ borderColor: 'var(--ds-border)' }}
          >
            <span className="text-[12px] ds-text-tertiary">
              <strong className="ds-text-primary tabular-nums">{filteredRows.length}</strong> transactions · {fmt(caGros)} € au total
            </span>
            <div className="flex items-center gap-1">
              <button className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{ color: 'var(--ds-text-tertiary)' }}>
                <ChevronLeft size={14} />
              </button>
              {[1, 2, 3].map(p => (
                <button
                  key={p}
                  className="w-7 h-7 rounded-md text-[12px] font-medium transition-colors"
                  style={{
                    background: p === 1 ? '#E8920A' : 'none',
                    color: p === 1 ? 'white' : 'var(--ds-text-secondary)',
                  }}
                >
                  {p}
                </button>
              ))}
              <span className="px-1 ds-text-tertiary text-[12px]">…</span>
              <button className="w-7 h-7 rounded-md text-[12px] font-medium ds-text-secondary">9</button>
              <button className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" style={{ color: 'var(--ds-text-tertiary)' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          </>
          )}
        </div>

      </div>
      )}

      {/* Plus de filtres drawer */}
      <AnimatePresence>
        {moreDrawer && (
          <>
            <m.div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.3)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreDrawer(false)} />
            <m.aside
              className="fixed right-0 top-0 bottom-0 z-50 flex flex-col border-l"
              style={{ width: '320px', background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px] ds-text-primary">Filtres avancés</span>
                <button onClick={() => setMoreDrawer(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {/* Montant */}
                <div>
                  <div className="text-[11.5px] font-semibold ds-text-secondary uppercase tracking-[0.06em] mb-2.5">Fourchette de montant</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text" inputMode="decimal" value={amountMin} onChange={e => setAmountMin(e.target.value)}
                      placeholder="Min (€)"
                      className="flex-1 rounded-lg border px-3 py-2 outline-none text-[13px]"
                      style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                    />
                    <span className="ds-text-tertiary text-sm">—</span>
                    <input
                      type="text" inputMode="decimal" value={amountMax} onChange={e => setAmountMax(e.target.value)}
                      placeholder="Max (€)"
                      className="flex-1 rounded-lg border px-3 py-2 outline-none text-[13px]"
                      style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                    />
                  </div>
                </div>
                {/* Période personnalisée */}
                <div>
                  <div className="text-[11.5px] font-semibold ds-text-secondary uppercase tracking-[0.06em] mb-2.5">Période personnalisée</div>
                  <div className="flex flex-col gap-2">
                    <input type="date" className="rounded-lg border px-3 py-2 outline-none text-[13px]" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }} />
                    <input type="date" className="rounded-lg border px-3 py-2 outline-none text-[13px]" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
                <button onClick={() => { setAmountMin(''); setAmountMax('') }} className="flex-1 rounded-xl border text-sm font-semibold py-2.5" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Réinitialiser</button>
                <button onClick={() => setMoreDrawer(false)} className="flex-1 rounded-xl text-white text-sm font-semibold py-2.5" style={{ background: '#E8920A' }}>Appliquer</button>
              </div>
            </m.aside>
          </>
        )}
      </AnimatePresence>

      {/* Drawer */}
      {drawerRow && <Drawer row={drawerRow} onClose={() => setDrawerRow(null)} />}
    </RestaurantLayout>
  )
}

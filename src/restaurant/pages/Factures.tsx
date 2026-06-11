import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { toast } from 'sonner'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId, useRestaurant, useRestaurantRole } from '../context/RestaurantContext'
import {
  Printer, Search, SlidersHorizontal, LayoutGrid, List,
  X, Euro, HandCoins, Percent, CreditCard, CheckCircle, Clock, RotateCcw, AlertCircle, FileText, Mail, Trash2, Check, Info, Download,
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

// Aucune facture émise pour l'instant (SIRET en cours). Quand Tiime sera
// branché : remplacer par une query Convex / API Tiime — ne jamais remettre
// de fausses factures ici, elles s'affichaient comme réelles aux gérants.
const SPLITZY_INVOICES: SplitzyInvoice[] = []
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
  paymentId?: string
  tableNumber?: number
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

// Libellé de groupe de jour dérivé de la date réelle (dd/mm)
function dayLabel(d: string): string {
  const [dd, mm] = d.split('/').map(Number)
  if (!dd || !mm) return d
  const now = new Date()
  const date = new Date(now.getFullYear(), mm - 1, dd)
  if (date > now) date.setFullYear(date.getFullYear() - 1)
  const sameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  const yesterday = new Date(now.getTime() - 86400000)
  const full = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (sameDay(date, now)) return `Aujourd'hui · ${full}`
  if (sameDay(date, yesterday)) return `Hier · ${full}`
  return full.charAt(0).toUpperCase() + full.slice(1)
}

type ConvexPayment = {
  _id: string
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

function Drawer({ row, restaurantId, restaurantName, onClose }: {
  row: LocalRow
  restaurantId: Id<'restaurants'> | null
  restaurantName: string
  onClose: () => void
}) {
  const role = useRestaurantRole()
  const canAct = role !== 'viewer' // viewer = lecture seule : ni email reçu, ni remboursement
  const updateStatusMut = useMutation(api.payments.updateStatus)
  const sendCampaignAction = useAction(api.campaigns.sendCampaign)
  const crmCustomers = useQuery(api.customers.getByRestaurant, restaurantId ? { restaurantId } : 'skip') ?? []

  const [refundModal, setRefundModal] = useState(false)
  const [emailModal, setEmailModal]   = useState(false)
  const [refunding, setRefunding]     = useState(false)
  const [emailing, setEmailing]       = useState(false)

  const ttc  = row.amount
  const tip  = row.tip
  const ht   = ttc - tip
  const tva  = (ht * 0.1) / 1.1
  const htNet = ht - tva
  const meth = METHOD_LABELS[row.method]

  // Client CRM avec email + consentement, sur cette table
  const clientRow = row.tableNumber != null
    ? crmCustomers.find(c => c.tableNumber === row.tableNumber && !!c.email && c.marketingConsent === true)
    : undefined

  const handlePDF = async () => {
    const { jsPDF: JsPDF } = await import('jspdf')
    const doc = new JsPDF({ unit: 'mm', format: 'a4' })
    const net = ttc - row.fee

    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, 210, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text('SPLITZY', 15, 12)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal')
    doc.text('Justificatif de transaction', 15, 20)
    doc.setTextColor(160, 160, 160); doc.setFontSize(8)
    doc.text(`${row.d} · ${row.time}`, 15, 27)
    doc.setTextColor(255, 255, 255); doc.setFontSize(9)
    doc.text(restaurantName, 195, 12, { align: 'right' })

    doc.setTextColor(30, 30, 30)
    let y = 45
    const refBlock: [string, string][] = [
      ['Référence', row.ref],
      ['Table', row.table],
      ['Date / Heure', `${row.d} · ${row.time}`],
    ]
    refBlock.forEach(([k, v]) => {
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
      doc.text(k, 15, y)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text(v, 90, y)
      y += 7
    })
    y += 5

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Détail du paiement', 15, y); y += 6
    const payRows: [string, string, boolean][] = [
      ['Sous-total HT', `${fmt(htNet)} €`, false],
      ['TVA 10%', `${fmt(tva)} €`, false],
      ['Pourboire', `+ ${fmt(tip)} €`, false],
      ['Total encaissé', `${fmt(ttc)} €`, true],
    ]
    payRows.forEach(([label, value, bold], i) => {
      const rowY = y + i * 9
      doc.setFillColor(i % 2 === 0 ? 248 : 252, i % 2 === 0 ? 248 : 252, i % 2 === 0 ? 248 : 252)
      doc.rect(15, rowY - 5, 180, 9, 'F')
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(30, 30, 30); doc.setFontSize(8.5)
      doc.text(label, 20, rowY)
      doc.text(value, 192, rowY, { align: 'right' })
    })
    y += payRows.length * 9 + 8

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('Informations', 15, y); y += 6
    const infoRows: [string, string][] = [
      ['Méthode de paiement', meth.name],
      [`Convives`, `${row.guests} personne${row.guests > 1 ? 's' : ''}`],
      ['Commission Splitzy', `${fmt(row.fee)} €`],
      ['Net restaurant', `${fmt(net)} €`],
    ]
    infoRows.forEach(([k, v]) => {
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100)
      doc.text(k, 15, y)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30)
      doc.text(v, 192, y, { align: 'right' })
      y += 7
    })

    doc.setFontSize(7.5); doc.setTextColor(160, 160, 160)
    doc.text('Document généré par Splitzy · splitzy.fr', 105, 285, { align: 'center' })
    doc.save(`justificatif-${row.ref}-${row.d.replace('/', '-')}.pdf`)
  }

  const handleEmailClick = () => {
    if (!clientRow?.email) {
      toast.warning('Aucun email client disponible pour cette transaction')
      return
    }
    setEmailModal(true)
  }

  const doSendEmail = async () => {
    if (!clientRow || !restaurantId) return
    setEmailing(true)
    try {
      const body = `Bonjour,\n\nVoici le résumé de votre transaction du ${row.d} à ${row.time}.\n\nTable : ${row.table}\nMontant total : ${fmt(ttc)} €\nPourboire : ${fmt(tip)} €\n\nMerci de votre visite !\n\nL'équipe ${restaurantName}`
      await sendCampaignAction({ restaurantId, customerIds: [clientRow._id], subject: `Votre reçu - ${restaurantName}`, body, restaurantName })
      toast.success('Reçu envoyé')
      setEmailModal(false)
    } catch {
      toast.error("Erreur lors de l'envoi")
    } finally {
      setEmailing(false)
    }
  }

  const doRefund = async () => {
    if (!row.paymentId) {
      toast.error('Identifiant de paiement manquant — transaction démo.')
      return
    }
    setRefunding(true)
    try {
      await updateStatusMut({ paymentId: row.paymentId as Id<'payments'>, status: 'Remboursé' as const })
      toast.success("Statut mis à jour — pensez à effectuer le remboursement via votre PSP")
      setRefundModal(false)
      onClose()
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    } finally {
      setRefunding(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden border-l"
        style={{ width: '420px', background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="font-bold text-[15px] ds-text-primary">Transaction · {row.table}</div>
            <div className="text-[11.5px] ds-text-tertiary mt-0.5 font-mono">{row.ref}</div>
          </div>
          <button onClick={onClose} className="ds-text-tertiary hover:ds-text-primary transition-colors mt-0.5"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <div className="font-extrabold tabular-nums tracking-[-0.04em] leading-none" style={{ fontSize: '48px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}>
              {fmt(row.amount).split(',')[0]}<span className="text-[24px] ds-text-tertiary">,{fmt(row.amount).split(',')[1]} €</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={row.status} />
              <span className="text-[12px] ds-text-tertiary">{dayLabel(row.d)} · {row.time}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Détail du paiement</h4>
            <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--ds-border)' }}>
              {[
                { k: 'Sous-total HT', v: `${fmt(htNet)} €`, color: undefined, bold: false },
                { k: 'TVA 10%',       v: `${fmt(tva)} €`,   color: undefined, bold: false },
                { k: 'Pourboire',     v: `+ ${fmt(tip)} €`, color: 'var(--ds-success)' as string, bold: false },
                { k: 'Total encaissé', v: `${fmt(row.amount)} €`, color: undefined, bold: true },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-[13px]" style={{ borderBottom: i < 3 ? `1px solid var(--ds-border)` : 'none', background: r.bold ? 'var(--ds-bg-base)' : 'var(--ds-bg-surface)' }}>
                  <span className={r.bold ? 'font-semibold ds-text-primary' : 'ds-text-secondary'}>{r.k}</span>
                  <span className={`font-semibold tabular-nums ${r.bold ? 'ds-text-primary' : 'ds-text-secondary'}`} style={{ color: r.color ?? undefined }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Informations</h4>
            <div className="space-y-2">
              {[
                { k: 'Table', v: row.table, highlight: false },
                { k: 'Convives', v: `${row.guests} personne${row.guests > 1 ? 's' : ''} · partage par article`, highlight: false },
                { k: 'Méthode', v: meth.name, highlight: false },
                { k: 'Commission Splitzy', v: `${fmt(row.fee)} € (1,5% + 0,15 €)`, highlight: false },
                { k: 'Net pour le restaurant', v: `${fmt(row.amount - row.fee)} €`, highlight: true },
              ].map(r => (
                <div key={r.k} className="flex items-center justify-between text-[13px]">
                  <span className="ds-text-secondary">{r.k}</span>
                  <span className="font-semibold tabular-nums" style={{ color: r.highlight ? 'var(--ds-success-strong)' : 'var(--ds-text-primary)' }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Actions</h4>
            <div className="flex flex-col gap-2">
              <button onClick={handlePDF} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[9px] border text-[13px] font-medium transition-colors" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}>
                <FileText size={14} /> Télécharger le justificatif PDF
              </button>
              {canAct && (
                <button onClick={handleEmailClick} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[9px] border text-[13px] font-medium transition-colors" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}>
                  <Mail size={14} /> Envoyer le reçu par email
                </button>
              )}
              {canAct && row.status !== 'Remboursé' && (
                <button onClick={() => setRefundModal(true)} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[9px] border text-[13px] font-medium transition-colors" style={{ background: 'var(--ds-error-soft)', borderColor: 'var(--ds-error-soft)', color: 'var(--ds-error)' }}>
                  <Trash2 size={14} /> Initier un remboursement
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {emailModal && (
          <m.div key="email-modal" className="fixed inset-0 flex items-center justify-center z-[60] p-4" style={{ background: 'rgba(0,0,0,0.5)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setEmailModal(false) }}>
            <m.div className="rounded-2xl overflow-hidden w-[400px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px] ds-text-primary">Envoyer le reçu</span>
                <button onClick={() => setEmailModal(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="px-5 py-5">
                <p className="text-[13.5px] ds-text-primary leading-[1.6]">Envoyer le reçu à <strong>{clientRow?.email}</strong> ?</p>
                <p className="text-[12px] ds-text-tertiary mt-1">Transaction {row.ref} · {fmt(row.amount)} €</p>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button onClick={() => setEmailModal(false)} className="flex-1 rounded-xl text-sm font-medium py-2.5 border" style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Annuler</button>
                <button onClick={doSendEmail} disabled={emailing} className="flex-1 rounded-xl text-sm font-semibold py-2.5 text-white" style={{ background: '#E8920A', opacity: emailing ? 0.6 : 1 }}>{emailing ? 'Envoi…' : 'Envoyer'}</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {refundModal && (
          <m.div key="refund-modal" className="fixed inset-0 flex items-center justify-center z-[60] p-4" style={{ background: 'rgba(0,0,0,0.5)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setRefundModal(false) }}>
            <m.div className="rounded-2xl overflow-hidden w-[420px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-error-soft)' }}>
                <span className="font-bold text-[15px]" style={{ color: 'var(--ds-error)' }}>Initier un remboursement</span>
                <button onClick={() => setRefundModal(false)} style={{ color: 'var(--ds-error)' }}><X size={16} /></button>
              </div>
              <div className="px-5 py-5">
                <p className="text-[13.5px] ds-text-primary leading-[1.6]">Confirmer le remboursement de <strong>{fmt(row.amount)} €</strong> pour la transaction <strong>{row.ref}</strong> ?</p>
                <div className="mt-3 px-3 py-2.5 rounded-[8px] text-[12px] ds-text-secondary" style={{ background: 'var(--ds-bg-base)', borderLeft: '3px solid var(--ds-warning)' }}>
                  Le remboursement devra être effectué manuellement via votre PSP.
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button onClick={() => setRefundModal(false)} className="flex-1 rounded-xl text-sm font-medium py-2.5 border" style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}>Annuler</button>
                <button onClick={doRefund} disabled={refunding} className="flex-1 rounded-xl text-sm font-semibold py-2.5 text-white" style={{ background: 'var(--ds-error)', opacity: refunding ? 0.6 : 1 }}>{refunding ? 'Traitement…' : 'Confirmer le remboursement'}</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
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
  const invoices = SPLITZY_INVOICES
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
        {invoices.length === 0 && (
          <div className="px-5 py-10 text-center text-[12.5px]" style={{ color: 'var(--ds-text-tertiary)' }}>
            Aucune facture émise pour le moment — la première facture de commission arrivera ici en début de mois.
          </div>
        )}
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
  const restaurant   = useRestaurant()

  useEffect(() => {
    if (!openDropdown) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openDropdown])
  const rawPayments = useQuery(api.payments.list, restaurantId ? { restaurantId } : 'skip')

  const isLoadingPayments = rawPayments === undefined
  // Données réelles uniquement — pas de lignes démo (faux chiffres en prod)
  const rows: LocalRow[] = (rawPayments != null)
    ? (rawPayments as ConvexPayment[]).map(p => ({
        d: p.dateLabel,
        time: new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        table: `T${p.tableNumber}`,
        guests: p.guests,
        method: 'card' as PayMethod,
        ref: `SPZ-${p._id.slice(-8).toUpperCase()}`,
        amount: p.totalCents / 100,
        tip: p.tipCents / 100,
        fee: p.commissionCents / 100,
        status: p.status as RowStatus,
        paymentId: p._id,
        tableNumber: p.tableNumber,
      }))
    : []

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

  // Variation réelle vs les 7 jours précédents (null si pas de base → "—")
  const nowTs = Date.now()
  const allEnc = (rawPayments ?? []) as ConvexPayment[]
  const thisWeekCA = allEnc.filter(p => p.status === 'Encaissé' && p.createdAt >= nowTs - 7 * 86400000).reduce((s, p) => s + p.totalCents, 0)
  const prevWeekCA = allEnc.filter(p => p.status === 'Encaissé' && p.createdAt >= nowTs - 14 * 86400000 && p.createdAt < nowTs - 7 * 86400000).reduce((s, p) => s + p.totalCents, 0)
  const weekDelta = prevWeekCA > 0 ? Math.round(((thisWeekCA - prevWeekCA) / prevWeekCA) * 100) : null

  // Prochain lundi (jour de virement)
  const nextMonday = new Date(nowTs + ((8 - new Date(nowTs).getDay()) % 7 || 7) * 86400000)
  const nextMondayLabel = nextMonday.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
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
              {weekDelta !== null
                ? <><span className="font-semibold" style={{ color: weekDelta >= 0 ? 'var(--ds-success-strong)' : 'var(--ds-error-strong)' }}>{weekDelta >= 0 ? '+' : ''}{weekDelta}%</span> vs semaine préc.</>
                : <>pas de comparaison disponible</>}
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
              {caGros > 0 ? ((pourboires / caGros) * 100).toFixed(1).replace('.', ',') + '% du CA · moy. client' : '— aucune donnée'}
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
              prévu {nextMondayLabel}
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
                <div className="col-span-3 py-10 text-center text-[13px] ds-text-tertiary">{isLoadingPayments ? 'Chargement des transactions…' : 'Aucune transaction.'}</div>
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
            <div className="py-12 text-center text-[13px] ds-text-tertiary">{isLoadingPayments ? 'Chargement des transactions…' : 'Aucune transaction pour cette période.'}</div>
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
                    <span className="font-semibold ds-text-primary">{dayLabel(day)}</span>
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
      {drawerRow && (
        <Drawer
          row={drawerRow}
          restaurantId={restaurantId}
          restaurantName={restaurant?.name ?? ''}
          onClose={() => setDrawerRow(null)}
        />
      )}
    </RestaurantLayout>
  )
}

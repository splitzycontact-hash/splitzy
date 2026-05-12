import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import {
  TABLES, FEEDBACKS, INVOICE_ROWS,
  WEEKLY_REVENUE_DAYS, WEEKLY_SUMMARY, RESTAURANT_INFO,
} from '../data/mockData'
import { formatEur } from '../../utils/formatCurrency'

interface PrintReportProps {
  open: boolean
  onClose: () => void
}

const STATUS_LABEL: Record<string, string> = {
  dining:  'En repas',
  payment: 'En paiement',
  paid:    'Payé',
  free:    'Libre',
}

const STATUS_PRINT_COLOR: Record<string, string> = {
  dining:  '#7c3aed',
  payment: '#d97706',
  paid:    '#16a34a',
  free:    '#9ca3af',
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#d97706', letterSpacing: 1 }}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

function ReportContent() {
  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = today.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const diningCount  = TABLES.filter(t => t.status === 'dining').length
  const paymentCount = TABLES.filter(t => t.status === 'payment').length
  const paidCount    = TABLES.filter(t => t.status === 'paid').length
  const freeCount    = TABLES.filter(t => t.status === 'free').length

  const avgStars = FEEDBACKS.length
    ? (FEEDBACKS.reduce((s, f) => s + f.stars, 0) / FEEDBACKS.length).toFixed(1)
    : '—'

  const starDist = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: FEEDBACKS.filter(f => f.stars === s).length,
  }))

  const encaisseRows = INVOICE_ROWS.filter(r => r.status === 'Encaissé')
  const totalTx = INVOICE_ROWS.length
  const totalEncaisse = encaisseRows.reduce((s, r) => s + r.amountCents, 0)
  const totalTips = encaisseRows.reduce((s, r) => s + r.tipCents, 0)
  const totalComm = encaisseRows.reduce((s, r) => s + r.commissionCents, 0)
  const totalNet = totalEncaisse - totalComm

  return (
    <div
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#111827',
        background: 'white',
        maxWidth: 860,
        margin: '0 auto',
        padding: '40px 48px',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #111827' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>
            Split<span style={{ color: '#E8920A' }}>zy</span>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>splitzy.fr · Paiement à table sans application</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{RESTAURANT_INFO.name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{RESTAURANT_INFO.address}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{RESTAURANT_INFO.phone} · {RESTAURANT_INFO.email}</div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Rapport de service</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
          {dateStr} · Généré à {timeStr}
        </div>
      </div>

      {/* ── SECTION 1 : KPIs ── */}
      <SectionTitle>Performances du service du soir</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <KpiCard label="CA DU SOIR" value="1 847€" sub="▲ +12% vs hier" accent="#E8920A" />
        <KpiCard label="TABLES ACTIVES" value="8 / 14" sub={`${paymentCount} en paiement`} accent="#111827" />
        <KpiCard label="NOTE MOYENNE" value={`${avgStars} / 5`} sub={`${FEEDBACKS.length} avis reçus`} accent="#b88500" />
        <KpiCard label="POURBOIRES" value="124€" sub="moy. 9,2% du ticket" accent="#16a34a" />
      </div>

      {/* ── SECTION 2 : Revenus semaine ── */}
      <SectionTitle>Revenus de la semaine</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
        <thead>
          <tr style={{ background: '#111827', color: 'white' }}>
            <Th>Jour</Th>
            <Th>Date</Th>
            <Th align="right">CA journalier</Th>
            <Th align="right">Part semaine</Th>
          </tr>
        </thead>
        <tbody>
          {WEEKLY_REVENUE_DAYS.map((row, i) => {
            const pct = ((row.totalCents / WEEKLY_SUMMARY.caGros) * 100).toFixed(1)
            return (
              <tr key={i} style={{ background: i % 2 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                <Td bold>{row.day}</Td>
                <Td muted>{row.date}</Td>
                <Td align="right" bold>{formatEur(row.totalCents)}</Td>
                <Td align="right" muted>{pct}%</Td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #111827', background: '#fffbf2' }}>
            <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13 }}>TOTAL SEMAINE</td>
            <td style={{ padding: '10px 12px', fontWeight: 900, textAlign: 'right', fontSize: 15, color: '#E8920A' }}>{formatEur(WEEKLY_SUMMARY.caGros)}</td>
            <td style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'right', color: '#6b7280' }}>100%</td>
          </tr>
        </tfoot>
      </table>
      <div style={{ display: 'flex', gap: 24, marginBottom: 32, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, fontSize: 12 }}>
        <SummaryItem label="CA brut" value={formatEur(WEEKLY_SUMMARY.caGros)} color="#E8920A" />
        <SummaryItem label="Pourboires équipe" value={formatEur(WEEKLY_SUMMARY.pourboires)} color="#16a34a" />
        <SummaryItem label="Commission Splitzy (3%)" value={formatEur(WEEKLY_SUMMARY.commission)} color="#9ca3af" />
        <SummaryItem label="Net restaurateur" value={formatEur(WEEKLY_SUMMARY.net)} color="#111827" />
      </div>

      {/* ── SECTION 3 : Tables ── */}
      <div className="print-break" />
      <SectionTitle>État des tables — Service en cours</SectionTitle>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <StatBadge icon="●" color="#7c3aed" label="En repas" value={diningCount} />
        <StatBadge icon="●" color="#d97706" label="En paiement" value={paymentCount} />
        <StatBadge icon="●" color="#16a34a" label="Payées" value={paidCount} />
        <StatBadge icon="●" color="#9ca3af" label="Libres" value={freeCount} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 32 }}>
        {TABLES.map(t => (
          <div
            key={t.id}
            style={{
              border: `2px solid ${STATUS_PRINT_COLOR[t.status]}`,
              borderRadius: 8,
              padding: '8px 6px',
              textAlign: 'center',
              background: t.status === 'free' ? '#f9fafb' : `${STATUS_PRINT_COLOR[t.status]}18`,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13, color: STATUS_PRINT_COLOR[t.status] }}>T{t.id}</div>
            <div style={{ fontSize: 10, color: STATUS_PRINT_COLOR[t.status], marginTop: 2 }}>{STATUS_LABEL[t.status]}</div>
            {t.amountCents && (
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>{formatEur(t.amountCents)}</div>
            )}
            {t.guests && (
              <div style={{ fontSize: 10, color: '#6b7280' }}>{t.guests} conv.</div>
            )}
          </div>
        ))}
      </div>

      {/* ── SECTION 4 : Feedbacks ── */}
      <SectionTitle>Feedbacks clients du jour</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 28 }}>
        {/* Distribution */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Distribution des notes</div>
          {starDist.map(({ stars, count }) => (
            <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 28, fontSize: 12, fontWeight: 700, color: '#d97706' }}>{stars}★</span>
              <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: '#E8920A',
                  width: `${(count / Math.max(FEEDBACKS.length, 1)) * 100}%`,
                }} />
              </div>
              <span style={{ width: 20, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Note moyenne</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#b88500' }}>{avgStars} <span style={{ fontSize: 14 }}>/ 5</span></div>
          </div>
        </div>
        {/* Signaux récurrents */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Signaux récurrents</div>
          {countTags(FEEDBACKS).map(({ tag, count, isNegative }) => (
            <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #f3f4f6', fontSize: 13 }}>
              <span>{tag}</span>
              <span style={{ fontWeight: 700, color: isNegative ? '#dc2626' : '#16a34a' }}>×{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Verbatim */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {FEEDBACKS.map(fb => {
          const isNeg = fb.stars <= 2
          const isPos = fb.stars >= 4
          const borderColor = isNeg ? '#dc2626' : isPos ? '#16a34a' : '#d97706'
          const bgColor     = isNeg ? '#fef2f2' : isPos ? '#f0fdf4' : '#fffbeb'
          return (
            <div
              key={fb.id}
              style={{
                borderLeft: `4px solid ${borderColor}`,
                background: bgColor,
                borderRadius: '0 8px 8px 0',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Stars n={fb.stars} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Table {fb.tableId}</span>
                  {fb.isNew && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 10, border: '1px solid #fcd34d' }}>NOUVEAU</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{fb.timeLabel}</span>
              </div>
              <div style={{ fontStyle: 'italic', color: '#374151', fontSize: 13, marginBottom: 8 }}>
                « {fb.text} »
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {fb.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: isNeg ? '#fee2e2' : '#dcfce7',
                      color: isNeg ? '#991b1b' : '#166534',
                      border: `1px solid ${isNeg ? '#fca5a5' : '#86efac'}`,
                    }}
                  >{tag}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── SECTION 5 : Factures ── */}
      <div className="print-break" />
      <SectionTitle>Récapitulatif des transactions ({totalTx} factures)</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#111827', color: 'white' }}>
            <Th>Date</Th>
            <Th>Table</Th>
            <Th>Conv.</Th>
            <Th align="right">Montant</Th>
            <Th align="right">Pourboire</Th>
            <Th align="right">Commission</Th>
            <Th align="right">Statut</Th>
          </tr>
        </thead>
        <tbody>
          {INVOICE_ROWS.map((row, i) => (
            <tr key={i} style={{ background: i % 2 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
              <Td muted>{row.date}</Td>
              <Td bold>T{row.tableId}</Td>
              <Td>{row.guests}</Td>
              <Td align="right" bold>{formatEur(row.amountCents)}</Td>
              <Td align="right" style={{ color: '#16a34a' }}>{formatEur(row.tipCents)}</Td>
              <Td align="right" muted>{formatEur(row.commissionCents)}</Td>
              <Td align="right">
                <StatusBadge status={row.status} />
              </Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #111827', background: '#fffbf2' }}>
            <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13 }}>TOTAL ENCAISSÉ ({encaisseRows.length} tx)</td>
            <td style={{ padding: '10px 12px', fontWeight: 900, textAlign: 'right', fontSize: 14, color: '#E8920A' }}>{formatEur(totalEncaisse)}</td>
            <td style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right', color: '#16a34a' }}>{formatEur(totalTips)}</td>
            <td style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right', color: '#6b7280' }}>{formatEur(totalComm)}</td>
            <td />
          </tr>
          <tr style={{ background: '#f0fdf4' }}>
            <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 800, fontSize: 13 }}>NET RESTAURATEUR</td>
            <td colSpan={4} style={{ padding: '8px 12px', fontWeight: 900, textAlign: 'right', fontSize: 15, color: '#16a34a' }}>{formatEur(totalNet)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
        <span>Généré par Splitzy · splitzy.fr · {dateStr} à {timeStr}</span>
        <span>{RESTAURANT_INFO.name} · Document confidentiel</span>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#E8920A', marginBottom: 4 }}>
        {children}
      </div>
      <div style={{ height: 1, background: '#e5e7eb' }} />
    </div>
  )
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>{sub}</div>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: string }) {
  return (
    <th style={{ padding: '9px 12px', textAlign: align as 'left' | 'right', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
      {children}
    </th>
  )
}

function Td({ children, align = 'left', bold, muted, style: extraStyle }: {
  children: React.ReactNode; align?: string; bold?: boolean; muted?: boolean; style?: React.CSSProperties
}) {
  return (
    <td style={{
      padding: '9px 12px',
      textAlign: align as 'left' | 'right',
      fontWeight: bold ? 700 : 400,
      color: muted ? '#6b7280' : undefined,
      fontSize: 13,
      ...extraStyle,
    }}>
      {children}
    </td>
  )
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}

function StatBadge({ icon, color, label, value }: { icon: string; color: string; label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      <span style={{ color, fontSize: 16 }}>{icon}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
      <span style={{ color: '#6b7280' }}>{label}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    'Encaissé':   { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
    'En attente': { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
    'Remboursé':  { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
  }
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, ...styles[status] }}>
      {status}
    </span>
  )
}

const NEGATIVE_TAGS = new Set(['⏱ Service lent', '🥘 Plat froid', '💸 Erreur addition', '📢 Trop bruyant'])

function countTags(feedbacks: typeof FEEDBACKS) {
  const counts: Record<string, number> = {}
  feedbacks.forEach(f => f.tags.forEach(t => { counts[t] = (counts[t] ?? 0) + 1 }))
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count, isNegative: NEGATIVE_TAGS.has(tag) }))
}

/* ── Main export ── */

export function PrintReport({ open, onClose }: PrintReportProps) {
  if (!open) return null

  const handlePrint = () => window.print()

  return createPortal(
    <div
      className="splitzy-print-portal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#1a1a1a',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Controls bar (hidden on print) */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>
            Aperçu du rapport
          </div>
          <span style={{ fontSize: 11, color: '#9ca3af', background: '#374151', padding: '2px 10px', borderRadius: 20 }}>
            Le Comptoir Parisien
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#E8920A', color: 'white', border: 'none',
              borderRadius: 8, padding: '9px 18px', fontSize: 14,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Printer size={16} />
            Imprimer / Enregistrer PDF
          </button>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#374151', color: '#d1d5db', border: 'none',
              borderRadius: 8, padding: '9px 14px', fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <X size={16} />
            Fermer
          </button>
        </div>
      </div>

      {/* Paper */}
      <div style={{ flex: 1, padding: '32px 24px', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            background: 'white',
            borderRadius: 4,
            boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
            width: '100%',
            maxWidth: 900,
            minHeight: 600,
          }}
        >
          <ReportContent />
        </div>
      </div>
    </div>,
    document.body,
  )
}

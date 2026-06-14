import { createPortal } from 'react-dom'
import { X, Printer } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useRestaurant, useRestaurantId } from '../context/RestaurantContext'
import { formatEur } from '../../utils/formatCurrency'
import {
  reportHeaderTitle,
  reportPeriodLabel,
  buildBuckets,
  rangeDays,
  BUCKET_GRANULARITY,
  type ReportRange,
} from '../lib/reportPeriod'

interface PrintReportProps {
  open: boolean
  range: ReportRange | null
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

type PaymentRow = {
  dateLabel: string; tableNumber: number; guests: number
  totalCents: number; tipCents: number; commissionCents: number
  subtotalCents: number; status: string; createdAt: number
}
type TableRow = {
  number: number; status: string
  amountCents?: number; guests?: number
}
type FeedbackRow = {
  _id: string; stars: number; tableId: number | string
  timeLabel: string; isNew: boolean; text: string; tags: string[]
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#d97706', letterSpacing: 1 }}>
      {'★'.repeat(n)}{'☆'.repeat(Math.max(0, 5 - n))}
    </span>
  )
}

function ReportContent({ range }: { range: ReportRange }) {
  const restaurant   = useRestaurant()
  const restaurantId = useRestaurantId()
  // Queries filtrées par la plage choisie (args from/to rétrocompatibles).
  const rawPayments  = useQuery(api.payments.list,  restaurantId ? { restaurantId, from: range.from, to: range.to } : 'skip')
  const rawTables    = useQuery(api.tables.list,    restaurantId ? { restaurantId } : 'skip')
  const rawFeedbacks = useQuery(api.feedbacks.list, restaurantId ? { restaurantId, from: range.from, to: range.to } : 'skip')

  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const isSingleDay = rangeDays(range) <= 1
  const granularity = BUCKET_GRANULARITY(range)
  const headerTitle = reportHeaderTitle(range)
  const periodLabel = reportPeriodLabel(range)

  if (rawPayments === undefined || rawTables === undefined || rawFeedbacks === undefined) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: '#6b7280', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Chargement des données…
      </div>
    )
  }

  // Toutes les lignes renvoyées sont déjà dans la plage [from, to).
  const payments  = rawPayments as PaymentRow[]
  const tables    = rawTables as TableRow[]
  const feedbacks = rawFeedbacks as FeedbackRow[]

  const encaisse       = payments.filter(p => p.status === 'Encaissé')
  const caPeriod   = encaisse.reduce((s, p) => s + p.totalCents, 0)
  const tipsPeriod = encaisse.reduce((s, p) => s + p.tipCents, 0)
  const subPeriod  = encaisse.reduce((s, p) => s + p.subtotalCents, 0)
  const tipPctPeriod = subPeriod > 0 ? ((tipsPeriod / subPeriod) * 100).toFixed(1).replace('.', ',') : null

  const diningCount  = tables.filter(t => t.status === 'dining').length
  const paymentCount = tables.filter(t => t.status === 'payment').length
  const paidCount    = tables.filter(t => t.status === 'paid').length
  const freeCount    = tables.filter(t => t.status === 'free').length
  const activeCount  = diningCount + paymentCount + paidCount

  const avgStars = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.stars, 0) / feedbacks.length).toFixed(1)
    : '—'

  const starDist = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: feedbacks.filter(f => f.stars === s).length,
  }))

  // Revenus agrégés par jour (≤31j) ou par semaine (>31j) ; vide pour un seul jour.
  const buckets = buildBuckets(range).map(b => ({
    ...b,
    totalCents: encaisse
      .filter(p => p.createdAt >= b.from && p.createdAt < b.to)
      .reduce((s, p) => s + p.totalCents, 0),
  }))
  const periodComm = encaisse.reduce((s, p) => s + p.commissionCents, 0)

  // Transactions de la période, plus récentes en premier
  const txRows = [...payments].sort((a, b) => b.createdAt - a.createdAt)
  const txEncaisse = txRows.filter(r => r.status === 'Encaissé')
  const totalEncaisse = txEncaisse.reduce((s, r) => s + r.totalCents, 0)
  const totalTips = txEncaisse.reduce((s, r) => s + r.tipCents, 0)
  const totalComm = txEncaisse.reduce((s, r) => s + r.commissionCents, 0)
  const totalNet = totalEncaisse - totalComm

  const restaurantName = restaurant?.name ?? ''

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
          <div style={{ fontSize: 18, fontWeight: 800 }}>{restaurantName}</div>
          {restaurant?.address && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{restaurant.address}</div>}
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {[restaurant?.phone, restaurant?.email].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af' }}>Rapport de service</div>
        <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{headerTitle}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          Généré le {dateStr} à {timeStr}
        </div>
      </div>

      {/* ── SECTION 1 : KPIs ── */}
      <SectionTitle>{isSingleDay ? 'Performances du jour' : 'Performances de la période'}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <KpiCard label={isSingleDay ? 'CA DU JOUR' : 'CA DE LA PÉRIODE'} value={formatEur(caPeriod)} sub={`${encaisse.length} paiement${encaisse.length > 1 ? 's' : ''} encaissé${encaisse.length > 1 ? 's' : ''}`} accent="#E8920A" />
        <KpiCard label="TABLES ACTIVES" value={`${activeCount} / ${tables.length}`} sub={`${paymentCount} en paiement`} accent="#111827" />
        <KpiCard label="NOTE MOYENNE" value={`${avgStars} / 5`} sub={`${feedbacks.length} avis reçus`} accent="#b88500" />
        <KpiCard label="POURBOIRES" value={formatEur(tipsPeriod)} sub={tipPctPeriod !== null ? `moy. ${tipPctPeriod}% du ticket` : 'aucun sur la période'} accent="#16a34a" />
      </div>

      {/* ── SECTION 2 : Revenus par jour/semaine (omise pour un jour unique) ── */}
      {!isSingleDay && (
        <>
          <SectionTitle>{granularity === 'week' ? 'Revenus par semaine' : 'Revenus par jour'}</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr style={{ background: '#111827', color: 'white' }}>
                <Th>{granularity === 'week' ? 'Semaine' : 'Jour'}</Th>
                <Th>{granularity === 'week' ? 'Fin' : 'Date'}</Th>
                <Th align="right">{granularity === 'week' ? 'CA hebdo.' : 'CA journalier'}</Th>
                <Th align="right">Part période</Th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((row, i) => {
                const pct = caPeriod > 0 ? ((row.totalCents / caPeriod) * 100).toFixed(1) : '0.0'
                return (
                  <tr key={i} style={{ background: i % 2 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                    <Td bold>{row.label}</Td>
                    <Td muted>{row.sublabel}</Td>
                    <Td align="right" bold>{formatEur(row.totalCents)}</Td>
                    <Td align="right" muted>{pct.replace('.', ',')}%</Td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #111827', background: '#fffbf2' }}>
                <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13 }}>TOTAL PÉRIODE</td>
                <td style={{ padding: '10px 12px', fontWeight: 900, textAlign: 'right', fontSize: 15, color: '#E8920A' }}>{formatEur(caPeriod)}</td>
                <td style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'right', color: '#6b7280' }}>100%</td>
              </tr>
            </tfoot>
          </table>
          <div style={{ display: 'flex', gap: 24, marginBottom: 32, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, fontSize: 12 }}>
            <SummaryItem label="CA brut" value={formatEur(caPeriod)} color="#E8920A" />
            <SummaryItem label="Pourboires équipe" value={formatEur(tipsPeriod)} color="#16a34a" />
            <SummaryItem label="Commission Splitzy (1,5%)" value={formatEur(periodComm)} color="#9ca3af" />
            <SummaryItem label="Net restaurateur" value={formatEur(caPeriod - periodComm)} color="#111827" />
          </div>
        </>
      )}

      {/* ── SECTION 3 : Tables ── */}
      <div className="print-break" />
      <SectionTitle>État des tables — Service en cours</SectionTitle>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <StatBadge icon="●" color="#7c3aed" label="En repas" value={diningCount} />
        <StatBadge icon="●" color="#d97706" label="En paiement" value={paymentCount} />
        <StatBadge icon="●" color="#16a34a" label="Payées" value={paidCount} />
        <StatBadge icon="●" color="#9ca3af" label="Libres" value={freeCount} />
      </div>
      {tables.length === 0 ? (
        <EmptyNote>Aucune table configurée.</EmptyNote>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 32 }}>
          {tables.map(t => (
            <div
              key={t.number}
              style={{
                border: `2px solid ${STATUS_PRINT_COLOR[t.status] ?? '#9ca3af'}`,
                borderRadius: 8,
                padding: '8px 6px',
                textAlign: 'center',
                background: t.status === 'free' ? '#f9fafb' : `${STATUS_PRINT_COLOR[t.status] ?? '#9ca3af'}18`,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13, color: STATUS_PRINT_COLOR[t.status] ?? '#9ca3af' }}>T{t.number}</div>
              <div style={{ fontSize: 10, color: STATUS_PRINT_COLOR[t.status] ?? '#9ca3af', marginTop: 2 }}>{STATUS_LABEL[t.status] ?? t.status}</div>
              {(t.amountCents ?? 0) > 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>{formatEur(t.amountCents!)}</div>
              )}
              {(t.guests ?? 0) > 0 && (
                <div style={{ fontSize: 10, color: '#6b7280' }}>{t.guests} conv.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION 4 : Feedbacks ── */}
      <SectionTitle>Feedbacks clients</SectionTitle>
      {feedbacks.length === 0 ? (
        <EmptyNote>Aucun feedback reçu pour le moment.</EmptyNote>
      ) : (
        <>
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
                      width: `${(count / Math.max(feedbacks.length, 1)) * 100}%`,
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
              {countTags(feedbacks).length === 0 && (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Aucun tag relevé.</div>
              )}
              {countTags(feedbacks).map(({ tag, count, isNegative }) => (
                <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #f3f4f6', fontSize: 13 }}>
                  <span>{tag}</span>
                  <span style={{ fontWeight: 700, color: isNegative ? '#dc2626' : '#16a34a' }}>×{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verbatim — 8 plus récents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {feedbacks.slice(0, 8).map(fb => {
              const isNeg = fb.stars <= 2
              const isPos = fb.stars >= 4
              const borderColor = isNeg ? '#dc2626' : isPos ? '#16a34a' : '#d97706'
              const bgColor     = isNeg ? '#fef2f2' : isPos ? '#f0fdf4' : '#fffbeb'
              return (
                <div
                  key={fb._id}
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
                  {fb.text && (
                    <div style={{ fontStyle: 'italic', color: '#374151', fontSize: 13, marginBottom: 8 }}>
                      « {fb.text} »
                    </div>
                  )}
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
        </>
      )}

      {/* ── SECTION 5 : Transactions ── */}
      <div className="print-break" />
      <SectionTitle>Récapitulatif des transactions — {periodLabel.replace(/^Rapport d[eu] /, '')} ({txRows.length})</SectionTitle>
      {txRows.length === 0 ? (
        <EmptyNote>Aucune transaction sur la période.</EmptyNote>
      ) : (
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
            {txRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                <Td muted>{row.dateLabel}</Td>
                <Td bold>T{row.tableNumber}</Td>
                <Td>{row.guests}</Td>
                <Td align="right" bold>{formatEur(row.totalCents)}</Td>
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
              <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13 }}>TOTAL ENCAISSÉ ({txEncaisse.length} tx)</td>
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
      )}

      {/* ── FOOTER ── */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
        <span>Généré par Splitzy · splitzy.fr · {dateStr} à {timeStr}</span>
        <span>{restaurantName} · Document confidentiel</span>
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

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 16px', marginBottom: 28, border: '1px dashed #e5e7eb', borderRadius: 8, color: '#9ca3af', fontSize: 12.5, textAlign: 'center' }}>
      {children}
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

// Un tag est "négatif" si la note moyenne des feedbacks qui le portent est ≤ 3
function countTags(feedbacks: FeedbackRow[]) {
  const counts: Record<string, { count: number; starsSum: number }> = {}
  feedbacks.forEach(f => f.tags.forEach(t => {
    counts[t] = counts[t] ?? { count: 0, starsSum: 0 }
    counts[t].count += 1
    counts[t].starsSum += f.stars
  }))
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([tag, { count, starsSum }]) => ({ tag, count, isNegative: starsSum / count <= 3 }))
}

/* ── Main export ── */

export function PrintReport({ open, range, onClose }: PrintReportProps) {
  const restaurant = useRestaurant()
  if (!open || !range) return null

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
          {restaurant?.name && (
            <span style={{ fontSize: 11, color: '#9ca3af', background: '#374151', padding: '2px 10px', borderRadius: 20 }}>
              {restaurant.name}
            </span>
          )}
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
          <ReportContent range={range} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

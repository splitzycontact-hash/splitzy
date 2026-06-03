import { jsPDF } from 'jspdf'
import type { SessionState } from '../context/types'
import { formatEur } from './formatCurrency'

function calcAmounts(state: SessionState) {
  // Montants réellement payés par le convive, figés au moment du paiement.
  return {
    subtotal: state.paidSubtotalCents,
    tipAmount: state.paidTipCents,
    total: state.paidTotalCents,
  }
}

function methodLabel(method: string): string {
  if (method === 'apple_pay') return 'Apple Pay'
  if (method === 'google_pay') return 'Google Pay'
  return 'Carte bancaire'
}

export function generateInvoicePDF(state: SessionState) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { subtotal, tipAmount, total } = calcAmounts(state)
  const M = 20 // left/right margin
  const W = 210 - M * 2
  let y = 0

  // Détails du paiement (avec fallbacks si la session n'a pas été renseignée).
  const paymentDate = new Date(state.paymentTimestamp || Date.now())
  const heureStr = paymentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const label = methodLabel(state.paymentMethod)

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── Header band ──────────────────────────────────────────
  doc.setFillColor(24, 24, 27)
  doc.rect(0, 0, 210, 38, 'F')

  doc.setTextColor(232, 146, 10)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Splitzy', M, 16)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Reçu de paiement', M, 24)

  doc.setTextColor(180, 180, 180)
  doc.text(dateStr, 210 - M, 24, { align: 'right' })

  y = 50

  // ── Restaurant info ───────────────────────────────────────
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text(state.restaurantName, M, y)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(107, 114, 128)
  doc.text(`Table ${state.tableNumber}  ·  Payé par ${state.userName}`, M, y + 7)

  y += 18

  // ── Separator ────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(M, y, 210 - M, y)

  y += 10

  // ── Items section ─────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(156, 163, 175)
  doc.text('VOS ARTICLES', M, y)

  y += 6

  if (state.selectedItems.length > 0) {
    // Articles réellement sélectionnés et payés par le convive.
    state.selectedItems.forEach(si => {
      const linePrice = Math.round(si.priceCents / si.splitFactor)
      const itemLabel = si.splitFactor > 1 ? `${si.name}  (÷${si.splitFactor})` : si.name

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(17, 24, 39)
      doc.text(itemLabel, M, y)
      doc.text(formatEur(linePrice), 210 - M, y, { align: 'right' })
      y += 7
    })
  } else {
    // Parts égales / montant libre : pas de détail article, juste la part payée.
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(17, 24, 39)
    doc.text('Part du repas', M, y)
    doc.text(formatEur(subtotal), 210 - M, y, { align: 'right' })
    y += 7
  }

  y += 5

  // ── Dashed separator ──────────────────────────────────────
  doc.setDrawColor(209, 213, 219)
  doc.setLineWidth(0.2)
  // Draw a dashed line manually
  let xPos = M
  while (xPos < 210 - M) {
    doc.line(xPos, y, Math.min(xPos + 2, 210 - M), y)
    xPos += 4
  }

  y += 8

  // ── Totals ────────────────────────────────────────────────
  const row = (
    rowLabel: string,
    value: string,
    opts: { bold?: boolean; labelRgb?: [number, number, number]; valueRgb?: [number, number, number] } = {}
  ) => {
    const labelColor = opts.labelRgb ?? [107, 114, 128]
    const valueColor = opts.valueRgb ?? [17, 24, 39]
    doc.setFontSize(10)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2])
    doc.text(rowLabel, M, y)
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2])
    doc.text(value, 210 - M, y, { align: 'right' })
    y += 7
  }

  row('Sous-total', formatEur(subtotal))

  if (tipAmount > 0) {
    row(
      `Pourboire (${state.tipPercent}%)`,
      `+${formatEur(tipAmount)}`,
      { labelRgb: [180, 83, 9], valueRgb: [180, 83, 9] }
    )
  }

  y += 2
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.5)
  doc.line(M, y, 210 - M, y)
  y += 7

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(17, 24, 39)
  doc.text('Total payé', M, y)
  doc.setTextColor(232, 146, 10)
  doc.text(formatEur(total), 210 - M, y, { align: 'right' })

  y += 16

  // ── Footer card ───────────────────────────────────────────
  const disclaimer =
    'Ce document est un justificatif de paiement et ne constitue pas une facture TVA. Pour une facture de votre repas, contactez le restaurant directement.'

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const discLines = doc.splitTextToSize(disclaimer, W - 12) as string[]
  const cardH = 28 + discLines.length * 4

  doc.setFillColor(249, 250, 251)
  doc.roundedRect(M, y, W, cardH, 3, 3, 'F')

  doc.setTextColor(107, 114, 128)
  doc.text(`Ref : ${state.paymentRef || 'N/A'}  ·  Payé le ${dateStr} à ${heureStr}`, M + 6, y + 7)
  doc.text(`Méthode : ${label}`, M + 6, y + 13)

  doc.setTextColor(156, 163, 175)
  doc.text('Paiement traité par Splitzy  ·  splitzy.fr', M + 6, y + 19)

  let dy = y + 25
  discLines.forEach(ln => {
    doc.text(ln, M + 6, dy)
    dy += 4
  })

  // ── Save ──────────────────────────────────────────────────
  const slug = state.restaurantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const fileDate = paymentDate.toISOString().slice(0, 10)
  doc.save(`recu-${slug}-table${state.tableNumber}-${fileDate}.pdf`)
}

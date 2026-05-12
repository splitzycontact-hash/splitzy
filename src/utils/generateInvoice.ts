import { jsPDF } from 'jspdf'
import type { SessionState } from '../context/types'
import { MENU_ITEMS } from '../data/menu'
import { formatEur } from './formatCurrency'
import { TABLE_TOTAL_CENTS } from '../data/session'

function calcAmounts(state: SessionState) {
  let subtotal = 0
  if (state.splitMode === 'item') {
    subtotal = state.selectedItems.reduce((acc, si) => {
      const item = MENU_ITEMS.find(m => m.id === si.menuItemId)
      return item ? acc + Math.round(item.price / si.splitFactor) : acc
    }, 0)
  } else if (state.splitMode === 'equal') {
    subtotal = Math.round(TABLE_TOTAL_CENTS / state.equalSplitCount)
  } else {
    subtotal = state.customAmount
  }
  const tipAmount = Math.round(subtotal * state.tipPercent / 100)
  const splitzyFee = Math.round(subtotal * 0.015)
  const total = subtotal + tipAmount
  return { subtotal, tipAmount, splitzyFee, total }
}

export function generateInvoicePDF(state: SessionState) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { subtotal, tipAmount, splitzyFee, total } = calcAmounts(state)
  const M = 20 // left/right margin
  const W = 210 - M * 2
  let y = 0

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

  if (state.splitMode === 'item') {
    state.selectedItems.forEach(si => {
      const item = MENU_ITEMS.find(m => m.id === si.menuItemId)
      if (!item) return
      const linePrice = Math.round(item.price / si.splitFactor)
      const label = si.splitFactor > 1 ? `${item.name}  (÷${si.splitFactor})` : item.name

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(17, 24, 39)
      doc.text(label, M, y)
      doc.text(formatEur(linePrice), 210 - M, y, { align: 'right' })
      y += 7
    })
  } else {
    const label = state.splitMode === 'equal'
      ? `Part égale  (1/${state.equalSplitCount})`
      : 'Montant libre'
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(17, 24, 39)
    doc.text(label, M, y)
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
    label: string,
    value: string,
    opts: { bold?: boolean; labelRgb?: [number, number, number]; valueRgb?: [number, number, number] } = {}
  ) => {
    const labelColor = opts.labelRgb ?? [107, 114, 128]
    const valueColor = opts.valueRgb ?? [17, 24, 39]
    doc.setFontSize(10)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2])
    doc.text(label, M, y)
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

  row(
    'Commission Splitzy (1,5%)',
    formatEur(splitzyFee),
    { labelRgb: [156, 163, 175], valueRgb: [156, 163, 175] }
  )

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
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(M, y, W, 22, 3, 3, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text('Paiement traité par Splitzy  ·  splitzy.fr', 210 / 2, y + 8, { align: 'center' })
  doc.text('Ce document tient lieu de reçu de paiement.', 210 / 2, y + 14, { align: 'center' })

  // ── Save ──────────────────────────────────────────────────
  const slug = state.restaurantName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  doc.save(`facture-${slug}-table${state.tableNumber}.pdf`)
}

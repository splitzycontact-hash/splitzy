import { jsPDF } from 'jspdf'

export interface BillingInvoiceData {
  id: string
  date: string
  plan: string
  amountTTC: number   // cents
  status: string
  restaurant: {
    name: string
    address: string
    email: string
  }
  billing: {
    company: string
    address: string
    vatNumber: string
    email: string
  }
}

const BRAND_ORANGE: [number, number, number] = [232, 146, 10]
const DARK: [number, number, number] = [24, 24, 27]
const GRAY: [number, number, number] = [107, 114, 128]
const LIGHT_GRAY: [number, number, number] = [156, 163, 175]
const WHITE: [number, number, number] = [255, 255, 255]
const BG: [number, number, number] = [249, 250, 251]
const BORDER: [number, number, number] = [229, 231, 235]

function formatEur(cents: number) {
  if (cents === 0) return '0,00 €'
  const euros = cents / 100
  return euros.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function generateBillingInvoicePDF(inv: BillingInvoiceData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 20
  const W = 210 - M * 2
  let y = 0

  const amountHT = inv.amountTTC === 0 ? 0 : Math.round(inv.amountTTC / 1.2)
  const amountTVA = inv.amountTTC - amountHT
  const isFree = inv.amountTTC === 0

  const companyName = inv.billing.company || inv.restaurant.name || 'Restaurant'
  const companyAddress = inv.billing.address || inv.restaurant.address || ''
  const companyEmail = inv.billing.email || inv.restaurant.email || ''
  const vatNumber = inv.billing.vatNumber || ''

  // ── Header band ───────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, 210, 42, 'F')

  // Splitzy logo text
  doc.setTextColor(...BRAND_ORANGE)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Splitzy', M, 17)

  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('splitzy.fr  ·  contact@splitzy.fr', M, 25)

  // Invoice label on right
  doc.setTextColor(...WHITE)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE', 210 - M, 17, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text(`N° ${inv.id}`, 210 - M, 25, { align: 'right' })
  doc.text(`Date : ${inv.date}`, 210 - M, 31, { align: 'right' })

  y = 54

  // ── Emetteur / Destinataire columns ──────────────────────
  const colW = (W - 10) / 2

  // Emetteur box
  doc.setFillColor(...BG)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, colW, 38, 3, 3, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...LIGHT_GRAY)
  doc.text('ÉMETTEUR', M + 5, y + 7)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Splitzy SAS', M + 5, y + 15)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('contact@splitzy.fr', M + 5, y + 22)
  doc.text("SIRET : en cours d'immatriculation", M + 5, y + 28)

  // Destinataire box
  const col2X = M + colW + 10
  doc.setFillColor(...BG)
  doc.roundedRect(col2X, y, colW, 38, 3, 3, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...LIGHT_GRAY)
  doc.text('DESTINATAIRE', col2X + 5, y + 7)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(companyName, col2X + 5, y + 15)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  const addressLines = doc.splitTextToSize(companyAddress, colW - 10)
  doc.text(addressLines.slice(0, 2), col2X + 5, y + 22)
  if (vatNumber) {
    doc.text(`N° TVA : ${vatNumber}`, col2X + 5, y + 34)
  }
  if (companyEmail) {
    doc.text(companyEmail, col2X + 5, vatNumber ? y + 28 : y + 34)
  }

  y += 50

  // ── Status badge ──────────────────────────────────────────
  const badgeColor: [number, number, number] = isFree
    ? [156, 163, 175]
    : inv.status === 'Payée'
    ? [21, 128, 61]
    : [180, 83, 9]
  const badgeBg: [number, number, number] = isFree
    ? [243, 244, 246]
    : inv.status === 'Payée'
    ? [240, 253, 244]
    : [255, 251, 235]
  doc.setFillColor(...badgeBg)
  doc.setDrawColor(...badgeColor)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, 30, 8, 2, 2, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...badgeColor)
  doc.text(isFree ? 'GRATUIT' : inv.status.toUpperCase(), M + 15, y + 5.5, { align: 'center' })

  y += 16

  // ── Items table ───────────────────────────────────────────
  // Table header
  doc.setFillColor(24, 24, 27)
  doc.roundedRect(M, y, W, 9, 2, 2, 'F')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('DÉSIGNATION', M + 4, y + 6)
  doc.text('QTÉ', M + 95, y + 6, { align: 'center' })
  doc.text('P.U. HT', M + 120, y + 6, { align: 'right' })
  doc.text('TVA', M + 145, y + 6, { align: 'right' })
  doc.text('TOTAL TTC', M + W, y + 6, { align: 'right' })

  y += 13

  // Item row
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(`Abonnement Plan ${inv.plan}`, M + 4, y)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(inv.date, M + 4, y + 6)

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text('1', M + 95, y, { align: 'center' })
  doc.text(formatEur(amountHT), M + 120, y, { align: 'right' })
  doc.text(isFree ? '—' : '20 %', M + 145, y, { align: 'right' })
  doc.text(formatEur(inv.amountTTC), M + W, y, { align: 'right' })

  y += 14

  // ── Separator line ────────────────────────────────────────
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(M, y, M + W, y)

  y += 8

  // ── Totals block ──────────────────────────────────────────
  const totX = M + W / 2
  const totW = W / 2

  const totRow = (label: string, value: string, bold = false, color: [number, number, number] = DARK) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...GRAY)
    doc.text(label, totX, y)
    doc.setTextColor(...color)
    doc.text(value, totX + totW, y, { align: 'right' })
    y += 7
  }

  totRow('Total HT', formatEur(amountHT))
  totRow(`TVA (20%)`, isFree ? '0,00 €' : formatEur(amountTVA))

  y += 1
  doc.setDrawColor(...BORDER)
  doc.line(totX, y, totX + totW, y)
  y += 6

  doc.setFillColor(249, 250, 251)
  doc.roundedRect(totX - 4, y - 5, totW + 4, 12, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('TOTAL TTC', totX, y + 3)
  doc.setTextColor(...BRAND_ORANGE)
  doc.text(formatEur(inv.amountTTC), totX + totW, y + 3, { align: 'right' })

  y += 20

  // ── Payment info ──────────────────────────────────────────
  doc.setFillColor(239, 246, 255)
  doc.setDrawColor(191, 219, 254)
  doc.setLineWidth(0.3)
  doc.roundedRect(M, y, W, 18, 3, 3, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text('MODE DE PAIEMENT', M + 5, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(37, 99, 235)
  doc.text('Prélèvement automatique SEPA', M + 5, y + 12)
  doc.text('Échéance au 1er du mois', M + W, y + 12, { align: 'right' })

  y += 26

  // ── Legal footer ──────────────────────────────────────────
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.2)
  doc.line(M, y, M + W, y)

  y += 6
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT_GRAY)
  doc.text("Splitzy SAS — SIRET en cours d'immatriculation", M, y)
  doc.text("Conformement a la loi, aucun escompte n'est accorde pour paiement anticipe.", M, y + 5)
  doc.text('En cas de retard, des penalites de 3x le taux legal seront appliquees.', M, y + 10)
  doc.text(`Facture générée le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} par Splitzy.`, M + W, y + 10, { align: 'right' })

  const fileName = `${inv.id}-splitzy.pdf`
  doc.save(fileName)
}

export async function downloadAllInvoices(invoices: BillingInvoiceData[]) {
  for (const inv of invoices) {
    generateBillingInvoicePDF(inv)
    await new Promise(r => setTimeout(r, 300))
  }
}

export type TableStatus = 'dining' | 'payment' | 'paid' | 'free'

export interface TableData {
  id: number
  status: TableStatus
  guests?: number
  duration?: string
  amountCents?: number
  alert?: boolean
}

export interface ConviveDetail {
  name: string
  items: string
  amountCents: number
  status: 'paid' | 'paying' | 'selecting'
}

export interface ActivityItem {
  tableId: number
  type: 'payment' | 'feedback' | 'opened' | 'waiting'
  description: string
  detail: string
  minutesAgo: number
}

export interface FeedbackItem {
  id: number
  stars: number
  tableId: number
  timeLabel: string
  isNew: boolean
  text: string
  tags: string[]
}

export interface InvoiceRow {
  date: string
  tableId: number
  guests: number
  amountCents: number
  tipCents: number
  commissionCents: number
  status: 'Encaissé' | 'En attente' | 'Remboursé'
}

export const TABLES: TableData[] = [
  { id: 1,  status: 'dining',   guests: 2, duration: '1h10', amountCents: 7800 },
  { id: 2,  status: 'free' },
  { id: 3,  status: 'payment',  guests: 3, duration: '1h42', amountCents: 10100, alert: true },
  { id: 4,  status: 'dining',   guests: 2, duration: '45min', amountCents: 5200 },
  { id: 5,  status: 'dining',   guests: 4, duration: '32min', amountCents: 3400 },
  { id: 6,  status: 'free' },
  { id: 7,  status: 'paid',     guests: 2, duration: '2h05', amountCents: 6200 },
  { id: 8,  status: 'dining',   guests: 3, duration: '58min', amountCents: 8800 },
  { id: 9,  status: 'payment',  guests: 4, duration: '1h55', amountCents: 7800, alert: true },
  { id: 10, status: 'free' },
  { id: 11, status: 'dining',   guests: 2, duration: '25min', amountCents: 5600 },
  { id: 12, status: 'payment',  guests: 3, duration: '2h10', amountCents: 5500, alert: true },
  { id: 13, status: 'paid',     guests: 5, duration: '2h30', amountCents: 14200 },
  { id: 14, status: 'free' },
]

export const TABLE3_CONVIVES: ConviveDetail[] = [
  { name: 'Léo',  items: 'Entrecôte Bordelaise, Verre de Bordeaux', amountCents: 3500, status: 'paid' },
  { name: 'Mia',  items: 'Dos de cabillaud, Tagliatelles truffes',  amountCents: 4000, status: 'paying' },
  { name: 'Alex', items: 'Salade César, Fondant chocolat',           amountCents: 2600, status: 'selecting' },
]

export const RECENT_ACTIVITY: ActivityItem[] = [
  { tableId: 7,  type: 'payment',  description: 'Paiement reçu ✓',        detail: '62,70€ dont 5,70€ pourboire',         minutesAgo: 2  },
  { tableId: 3,  type: 'feedback', description: 'Feedback ⭐⭐⭐⭐',       detail: '« Service rapide, plat délicieux »',   minutesAgo: 8  },
  { tableId: 9,  type: 'opened',   description: 'Session ouverte',         detail: '4 convives · Commande en cours',       minutesAgo: 15 },
  { tableId: 12, type: 'waiting',  description: 'Paiement en attente',     detail: '101€ · 3 convives',                   minutesAgo: 22 },
]

export const FEEDBACKS: FeedbackItem[] = [
  {
    id: 1,
    stars: 2,
    tableId: 12,
    timeLabel: 'hier 21h47',
    isNew: true,
    text: 'Service vraiment trop lent, mon plat était tiède à l\'arrivée. Dommage car la qualité est là.',
    tags: ['⏱ Service lent', '🥘 Plat froid'],
  },
  {
    id: 2,
    stars: 3,
    tableId: 4,
    timeLabel: 'hier 20h12',
    isNew: true,
    text: 'Addition incorrecte, on a dû demander deux fois pour corriger. Sinon plats corrects.',
    tags: ['💸 Erreur addition'],
  },
  {
    id: 3,
    stars: 5,
    tableId: 7,
    timeLabel: 'hier 22h15',
    isNew: false,
    text: 'Accueil chaleureux, entrecôte parfaite, on reviendra !',
    tags: ['😊 Super ambiance', '✨ On reviendra !'],
  },
  {
    id: 4,
    stars: 3,
    tableId: 9,
    timeLabel: 'hier 19h44',
    isNew: false,
    text: 'Bon dîner, table un peu bruyante près de la cuisine.',
    tags: ['📢 Trop bruyant'],
  },
]

export const WEEKLY_REVENUE_DAYS = [
  { day: 'Lun', date: '06/05', totalCents: 95000 },
  { day: 'Mar', date: '07/05', totalCents: 117000 },
  { day: 'Mer', date: '08/05', totalCents: 85000 },
  { day: 'Jeu', date: '09/05', totalCents: 134000 },
  { day: 'Ven', date: '10/05', totalCents: 160000 },
  { day: 'Sam', date: '11/05', totalCents: 214000 },
  { day: 'Dim', date: '12/05', totalCents: 89700 },
]

export const WEEKLY_SUMMARY = {
  caGros:      894700,
  pourboires:   62400,
  commission:   26800,
  net:         867900,
}

export const RESTAURANT_INFO = {
  name:    'Le Comptoir Parisien',
  address: '12 rue de Rivoli, 75004 Paris',
  phone:   '01 42 33 44 55',
  email:   'gerant@lecomptoir.fr',
  type:    'Restaurant',
}

export const INVOICE_ROWS: InvoiceRow[] = [
  { date: '11/05', tableId: 7,  guests: 2, amountCents: 6270,  tipCents: 570,  commissionCents: 219, status: 'Encaissé' },
  { date: '11/05', tableId: 13, guests: 5, amountCents: 14200, tipCents: 1280, commissionCents: 497, status: 'Encaissé' },
  { date: '11/05', tableId: 3,  guests: 3, amountCents: 10100, tipCents: 430,  commissionCents: 354, status: 'En attente' },
  { date: '11/05', tableId: 9,  guests: 4, amountCents: 7800,  tipCents: 720,  commissionCents: 273, status: 'En attente' },
  { date: '11/05', tableId: 12, guests: 3, amountCents: 5500,  tipCents: 330,  commissionCents: 193, status: 'En attente' },
  { date: '10/05', tableId: 2,  guests: 2, amountCents: 4820,  tipCents: 440,  commissionCents: 169, status: 'Encaissé' },
  { date: '10/05', tableId: 5,  guests: 4, amountCents: 8950,  tipCents: 810,  commissionCents: 313, status: 'Encaissé' },
  { date: '10/05', tableId: 11, guests: 2, amountCents: 3760,  tipCents: 340,  commissionCents: 132, status: 'Encaissé' },
  { date: '09/05', tableId: 6,  guests: 3, amountCents: 7240,  tipCents: 650,  commissionCents: 253, status: 'Encaissé' },
  { date: '09/05', tableId: 1,  guests: 2, amountCents: 5130,  tipCents: 460,  commissionCents: 180, status: 'Encaissé' },
  { date: '08/05', tableId: 8,  guests: 4, amountCents: 9870,  tipCents: 890,  commissionCents: 345, status: 'Encaissé' },
  { date: '07/05', tableId: 4,  guests: 2, amountCents: 4310,  tipCents: 390,  commissionCents: 151, status: 'Remboursé' },
]

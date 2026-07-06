export interface MenuItem {
  id: string
  category: 'entrees' | 'plats' | 'desserts' | 'boissons'
  emoji: string
  name: string
  description: string
  price: number
  badges?: ('signature' | 'vegetarian' | 'seasonal' | 'spicy')[]
  takenBy?: Convive | null
}

export interface Convive {
  id: string
  name: string
  avatarIndex: number
  color: string
}

export interface SelectedItem {
  menuItemId: string
  splitFactor: 1 | 2 | 3 | 4
  priceCents: number
  name: string
  // GOAL_PAIEMENTS_05 — adressage serveur de l'unité (unités modernes avec
  // lineId ; absent sur les lignes legacy, non réclamables) et part réclamée
  // (posée par claims:claimPart au moment de la sélection).
  lineId?: string
  partId?: string
}

export type TipChoice = number | null // 0-30 as percentage, or null

export interface CachedOrderItem {
  name: string
  qty: number
  unitCents: number
  paid?: boolean
  lineId?: string
  paidCents?: number
}

export interface SessionState {
  restaurantName: string
  tableNumber: number
  tableCapacity: number
  convexRestaurantId: string | null
  convexTableId: string | null
  tableTotalCents: number
  cachedOrderItems: CachedOrderItem[]
  cachedPaidCents: number
  userName: string
  userAvatarIndex: number
  convives: Convive[]
  splitMode: 'item' | 'equal' | 'custom'
  equalSplitCount: number
  customAmount: number
  selectedItems: SelectedItem[]
  tipPercent: number // 0-30
  selectedCardId: string
  paymentConfirmed: boolean
  feedbackStars: number
  feedbackTags: string[]
  feedbackText: string
  feedbackSent: boolean
  paymentMethod: string
  paymentRef: string
  paymentTimestamp: number
  paidSubtotalCents: number
  paidTipCents: number
  paidTotalCents: number
  lastPaymentId: string // id du dernier paiement créé (payments:create) — lie le contact CRM au paiement
  // GOAL_PAIEMENTS_05 — identifiant anonyme de CE convive (claimedBy des
  // holds) : distingue « réservé pour moi » de « réservé par un autre ».
  clientId: string
  // GOAL_PAIEMENTS_08 — rollout : true si le restaurant est dans l'allowlist
  // du flag NOUVEAU_PAIEMENT_FRACTIONNE (évalué serveur, transmis par
  // getTableContext). false → écran historique 3 onglets + contrat
  // payments:create legacy, strictement inchangés.
  newPaymentFlow: boolean
}

export type SessionAction =
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_USER_AVATAR'; payload: number }
  | { type: 'SET_SPLIT_MODE'; payload: 'item' | 'equal' | 'custom' }
  | { type: 'SET_EQUAL_SPLIT_COUNT'; payload: number }
  | { type: 'SET_CUSTOM_AMOUNT'; payload: number }
  | { type: 'TOGGLE_ITEM'; payload: { itemId: string; priceCents: number; name: string; lineId?: string } }
  | { type: 'SET_ITEM_SPLIT'; payload: { itemId: string; factor: 1 | 2 | 3 | 4 } }
  | { type: 'SET_ITEM_PART'; payload: { itemId: string; partId?: string } }
  | { type: 'SET_TIP_PERCENT'; payload: number }
  | { type: 'SET_SELECTED_CARD'; payload: string }
  | { type: 'CONFIRM_PAYMENT' }
  | { type: 'SET_PAYMENT_DETAILS'; payload: { method: string; ref: string; timestamp: number; subtotalCents: number; tipCents: number; totalCents: number } }
  | { type: 'SET_LAST_PAYMENT_ID'; payload: string }
  | { type: 'SET_FEEDBACK_STARS'; payload: number }
  | { type: 'TOGGLE_FEEDBACK_TAG'; payload: string }
  | { type: 'SET_FEEDBACK_TEXT'; payload: string }
  | { type: 'SEND_FEEDBACK' }
  | { type: 'SET_TABLE_CONTEXT'; payload: { restaurantName: string; tableNumber: number; tableCapacity: number; convexRestaurantId: string; convexTableId: string | null; tableTotalCents: number; cachedOrderItems?: CachedOrderItem[]; cachedPaidCents?: number; newPaymentFlow?: boolean } }
  | { type: 'ADD_CACHED_PAID_CENTS'; payload: number }
  | { type: 'MARK_CACHED_ITEMS_PAID' }
  | { type: 'MARK_SPECIFIC_ITEMS_PAID'; payload: string[] }
  | { type: 'RESET_SESSION' }

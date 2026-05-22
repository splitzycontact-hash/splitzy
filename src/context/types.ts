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
}

// Article réellement commandé sur la table (posé par le POS ou la simulation
// dashboard). `id` est synthétique et stable pour la session (index dans la commande).
export interface OrderItem {
  id: string
  name: string
  qty: number
  unitCents: number
}

export type TipChoice = number | null // 0-30 as percentage, or null

export interface SessionState {
  restaurantName: string
  tableNumber: number
  tableCapacity: number
  convexRestaurantId: string | null
  convexTableId: string | null
  tableTotalCents: number
  userName: string
  userAvatarIndex: number
  convives: Convive[]
  splitMode: 'item' | 'equal' | 'custom'
  equalSplitCount: number
  customAmount: number
  orderItems: OrderItem[]
  selectedItems: SelectedItem[]
  tipPercent: number // 0-30
  selectedCardId: string
  paymentConfirmed: boolean
  feedbackStars: number
  feedbackTags: string[]
  feedbackText: string
  feedbackSent: boolean
}

export type SessionAction =
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'SET_USER_AVATAR'; payload: number }
  | { type: 'SET_SPLIT_MODE'; payload: 'item' | 'equal' | 'custom' }
  | { type: 'SET_EQUAL_SPLIT_COUNT'; payload: number }
  | { type: 'SET_CUSTOM_AMOUNT'; payload: number }
  | { type: 'TOGGLE_ITEM'; payload: { itemId: string; priceCents: number } }
  | { type: 'SET_ITEM_SPLIT'; payload: { itemId: string; factor: 1 | 2 | 3 | 4 } }
  | { type: 'SET_TIP_PERCENT'; payload: number }
  | { type: 'SET_SELECTED_CARD'; payload: string }
  | { type: 'CONFIRM_PAYMENT' }
  | { type: 'SET_FEEDBACK_STARS'; payload: number }
  | { type: 'TOGGLE_FEEDBACK_TAG'; payload: string }
  | { type: 'SET_FEEDBACK_TEXT'; payload: string }
  | { type: 'SEND_FEEDBACK' }
  | { type: 'SET_TABLE_CONTEXT'; payload: { restaurantName: string; tableNumber: number; tableCapacity: number; convexRestaurantId: string; convexTableId: string | null; tableTotalCents: number; orderItems: { name: string; qty: number; unitCents: number }[] } }
  | { type: 'RESET_SESSION' }

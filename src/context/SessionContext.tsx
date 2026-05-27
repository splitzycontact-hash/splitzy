import { type Dispatch, type ReactNode, createContext, useContext, useReducer } from 'react'
import type { SessionState, SessionAction } from './types'
import { MOCK_SESSION } from '../data/session'

const initialState: SessionState = {
  restaurantName: '',
  tableNumber: 0,
  tableCapacity: 4,
  convexRestaurantId: null,
  convexTableId: null,
  tableTotalCents: MOCK_SESSION.tableTotalCents,
  cachedOrderItems: [],
  cachedPaidCents: 0,
  userName: '',
  userAvatarIndex: 0,
  convives: MOCK_SESSION.convives,
  splitMode: 'item',
  equalSplitCount: 2,
  customAmount: 0,
  selectedItems: [],
  tipPercent: 10,
  selectedCardId: 'visa',
  paymentConfirmed: false,
  feedbackStars: 0,
  feedbackTags: [],
  feedbackText: '',
  feedbackSent: false,
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_USER_NAME':
      return { ...state, userName: action.payload }
    case 'SET_USER_AVATAR':
      return { ...state, userAvatarIndex: action.payload }
    case 'SET_SPLIT_MODE':
      return { ...state, splitMode: action.payload }
    case 'SET_EQUAL_SPLIT_COUNT':
      return { ...state, equalSplitCount: action.payload }
    case 'SET_CUSTOM_AMOUNT':
      return { ...state, customAmount: action.payload }
    case 'TOGGLE_ITEM': {
      const { itemId, priceCents, name } = action.payload
      const exists = state.selectedItems.find(i => i.menuItemId === itemId)
      if (exists) {
        return { ...state, selectedItems: state.selectedItems.filter(i => i.menuItemId !== itemId) }
      }
      return { ...state, selectedItems: [...state.selectedItems, { menuItemId: itemId, splitFactor: 1, priceCents, name }] }
    }
    case 'SET_ITEM_SPLIT': {
      return {
        ...state,
        selectedItems: state.selectedItems.map(i =>
          i.menuItemId === action.payload.itemId
            ? { ...i, splitFactor: action.payload.factor }
            : i
        ),
      }
    }
    case 'SET_TIP_PERCENT':
      return { ...state, tipPercent: action.payload }
    case 'SET_SELECTED_CARD':
      return { ...state, selectedCardId: action.payload }
    case 'CONFIRM_PAYMENT':
      return { ...state, paymentConfirmed: true }
    case 'SET_FEEDBACK_STARS':
      return { ...state, feedbackStars: action.payload }
    case 'TOGGLE_FEEDBACK_TAG': {
      const tags = state.feedbackTags.includes(action.payload)
        ? state.feedbackTags.filter(t => t !== action.payload)
        : [...state.feedbackTags, action.payload]
      return { ...state, feedbackTags: tags }
    }
    case 'SET_FEEDBACK_TEXT':
      return { ...state, feedbackText: action.payload }
    case 'SEND_FEEDBACK':
      return { ...state, feedbackSent: true }
    case 'ADD_CACHED_PAID_CENTS':
      return { ...state, cachedPaidCents: state.cachedPaidCents + action.payload }
    case 'MARK_CACHED_ITEMS_PAID':
      return { ...state, cachedOrderItems: state.cachedOrderItems.map(i => ({ ...i, paid: true })) }
    case 'MARK_SPECIFIC_ITEMS_PAID': {
      // Marque dans le cache les articles spécifiques payés (mode "par article").
      // payload = tableau de noms d'articles (doublons possibles si qty > 1).
      // Pour chaque cachedOrderItem, on consomme les noms correspondants et on
      // réduit la qty (ou on marque paid: true si toute la qty est couverte).
      const remaining = [...action.payload]
      return {
        ...state,
        cachedOrderItems: state.cachedOrderItems.map(item => {
          if (item.paid) return item
          let count = 0
          for (let i = remaining.length - 1; i >= 0 && count < item.qty; i--) {
            if (remaining[i] === item.name) {
              remaining.splice(i, 1)
              count++
            }
          }
          if (count === 0) return item
          if (count >= item.qty) return { ...item, paid: true }
          // Qty partiellement payée : on réduit la qty restante
          return { ...item, qty: item.qty - count }
        }),
      }
    }
    case 'SET_TABLE_CONTEXT':
      return { ...state, ...action.payload }
    case 'RESET_SESSION':
      // Préserve le contexte de table pour que /welcome reflète l'état Convex
      // après "Bonne soirée". Seule l'action "Libérer la table" (gérant) doit
      // purger tout l'état — pas le retour d'un client après son paiement.
      return {
        ...initialState,
        restaurantName: state.restaurantName,
        tableNumber: state.tableNumber,
        tableCapacity: state.tableCapacity,
        convexRestaurantId: state.convexRestaurantId,
        convexTableId: state.convexTableId,
        tableTotalCents: state.tableTotalCents,
        cachedOrderItems: state.cachedOrderItems,
        cachedPaidCents: state.cachedPaidCents,
      }
    default:
      return state
  }
}

interface SessionContextValue {
  state: SessionState
  dispatch: Dispatch<SessionAction>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

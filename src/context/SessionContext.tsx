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
      const { itemId, priceCents } = action.payload
      const exists = state.selectedItems.find(i => i.menuItemId === itemId)
      if (exists) {
        return { ...state, selectedItems: state.selectedItems.filter(i => i.menuItemId !== itemId) }
      }
      return { ...state, selectedItems: [...state.selectedItems, { menuItemId: itemId, splitFactor: 1, priceCents }] }
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
    case 'SET_TABLE_CONTEXT':
      return { ...state, ...action.payload }
    case 'RESET_SESSION':
      return { ...initialState }
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

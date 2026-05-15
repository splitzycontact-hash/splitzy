export const TABLE_TOTAL_CENTS = 0

export const MOCK_SESSION = {
  restaurantName: '',
  tableNumber: 0,
  tableCapacity: 4,
  tableTotalCents: TABLE_TOTAL_CENTS,
  convives: [] as { id: string; name: string; avatarIndex: number; color: string }[],
}

export const FEEDBACK_TAGS = [
  '😊 Super ambiance',
  '🥘 Plat froid',
  '⏱ Service lent',
  '👨‍🍳 Serveur top',
  '💰 Rapport qualité/prix',
  '🍷 Carte des vins',
  '📢 Trop bruyant',
  '✨ On reviendra !',
]

export const NAME_SUGGESTIONS = [
  'Alice', 'Marc', 'Léa', 'Tom', 'Sarah',
  'Emma', 'Yann', 'Nico', 'Julie', 'Lucas',
]

export const MOCK_CARDS = [
  { id: 'visa', brand: 'Visa', last4: '4321', expiry: '04/28', holder: 'Marin' },
  { id: 'mc', brand: 'Mastercard', last4: '9087', expiry: '11/26', holder: 'Marin' },
]


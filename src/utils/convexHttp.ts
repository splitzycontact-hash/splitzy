// Mutation Convex via HTTP direct (pas WebSocket).
//
// Pourquoi : sur iOS Safari, le WS Convex peut prendre 15-30s à s'établir, et
// peut être suspendu/déconnecté quand l'app passe en arrière-plan. useMutation()
// queue alors la mutation côté client ; si l'utilisateur ferme l'onglet avant
// que le WS soit prêt, la mutation est perdue → le gérant ne voit rien.
//
// fetch({ keepalive: true }) garantit que la requête est envoyée même si la
// page se décharge juste après l'appel (max 64KB par requête — largement assez
// pour une mutation Convex).

function getHttpUrl(): string {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined
  if (!url) throw new Error('VITE_CONVEX_URL manquant')
  return url.replace(/^wss?:\/\//, 'https://')
}

// Erreur applicative Convex (ConvexError côté serveur). `data` porte le
// payload structuré — ex. { code: "STATE_CHANGED", ... } du nouveau contrat
// payments:create (GOAL_PAIEMENTS_03/05).
export class ConvexHttpError extends Error {
  data?: unknown
  constructor(message: string, data?: unknown) {
    super(message)
    this.name = 'ConvexHttpError'
    this.data = data
  }
}

export function convexErrorCode(err: unknown): string | null {
  if (err instanceof ConvexHttpError && err.data && typeof err.data === 'object') {
    const code = (err.data as { code?: unknown }).code
    if (typeof code === 'string') return code
  }
  // Fallback : le message contient le payload sérialisé (format Convex HTTP).
  if (err instanceof Error && err.message.includes('STATE_CHANGED')) return 'STATE_CHANGED'
  if (err instanceof Error && err.message.includes('CAPACITY_EXCEEDED')) return 'CAPACITY_EXCEEDED'
  return null
}

export async function httpMutation<T = unknown>(path: string, args: object): Promise<T> {
  const res = await fetch(`${getHttpUrl()}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, format: 'json', args: [args] }),
    keepalive: true,
  })
  if (!res.ok) throw new Error(`mutation ${path} HTTP ${res.status}`)
  const data = await res.json() as
    | { status: 'success'; value: T }
    | { status: 'error'; errorMessage: string; errorData?: unknown }
  if (data.status === 'error') throw new ConvexHttpError(data.errorMessage, data.errorData)
  return data.value
}

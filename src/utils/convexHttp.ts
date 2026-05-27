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

export async function httpMutation<T = unknown>(path: string, args: object): Promise<T> {
  const res = await fetch(`${getHttpUrl()}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, format: 'json', args: [args] }),
    keepalive: true,
  })
  if (!res.ok) throw new Error(`mutation ${path} HTTP ${res.status}`)
  const data = await res.json() as { status: 'success'; value: T } | { status: 'error'; errorMessage: string }
  if (data.status === 'error') throw new Error(data.errorMessage)
  return data.value
}

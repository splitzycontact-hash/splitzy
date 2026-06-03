import { Navigate } from 'react-router-dom'
import { useRestaurantRole } from '../context/RestaurantContext'
import type { RestaurantRole } from '../lib/roles'

// Garde de route par rôle : redirige vers /restaurant si le rôle courant n'est pas
// dans `allowed`. Monté à l'intérieur de RestaurantGuard → le rôle est déjà résolu
// (non null) quand ce composant rend. Si null (hors contexte), on ne rend rien plutôt
// que de boucler en redirection.
export function RoleGuard({
  allowed,
  children,
}: {
  allowed: RestaurantRole[]
  children: React.ReactNode
}) {
  const role = useRestaurantRole()
  if (role === null) return null
  if (!allowed.includes(role)) return <Navigate to="/restaurant" replace />
  return <>{children}</>
}

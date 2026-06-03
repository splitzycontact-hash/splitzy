import { createContext, useContext, type ReactNode } from 'react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import type { RestaurantRole } from '../lib/roles'

type Restaurant = Doc<'restaurants'>

interface RestaurantContextValue {
  restaurant: Restaurant
  role: RestaurantRole
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null)

export function RestaurantProvider({
  restaurant,
  role,
  children,
}: {
  restaurant: Restaurant
  role: RestaurantRole
  children: ReactNode
}) {
  return (
    <RestaurantContext.Provider value={{ restaurant, role }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant(): Restaurant | null {
  return useContext(RestaurantContext)?.restaurant ?? null
}

export function useRestaurantId(): Id<'restaurants'> | null {
  return useContext(RestaurantContext)?.restaurant._id ?? null
}

// Rôle de l'utilisateur courant sur CE restaurant (owner | manager | viewer).
// null tant que le contexte n'est pas fourni (hors RestaurantGuard).
export function useRestaurantRole(): RestaurantRole | null {
  return useContext(RestaurantContext)?.role ?? null
}

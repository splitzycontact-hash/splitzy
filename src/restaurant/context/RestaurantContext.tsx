import { createContext, useContext, type ReactNode } from 'react'
import type { Doc, Id } from '../../../convex/_generated/dataModel'

type Restaurant = Doc<'restaurants'>

const RestaurantContext = createContext<Restaurant | null>(null)

export function RestaurantProvider({ restaurant, children }: { restaurant: Restaurant; children: ReactNode }) {
  return <RestaurantContext.Provider value={restaurant}>{children}</RestaurantContext.Provider>
}

export function useRestaurant(): Restaurant | null {
  return useContext(RestaurantContext)
}

export function useRestaurantId(): Id<'restaurants'> | null {
  return useContext(RestaurantContext)?._id ?? null
}

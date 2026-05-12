import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { Navigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { RestaurantProvider } from '../context/RestaurantContext'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

const SLUG = import.meta.env.VITE_RESTAURANT_SLUG ?? 'le-comptoir-parisien'

// When Clerk is active: fetch restaurant by Clerk user ID
function GuardWithClerk({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const restaurant = useQuery(
    api.restaurants.getByClerkId,
    user ? { clerkUserId: user.id } : 'skip',
  )

  if (restaurant === undefined) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!restaurant) {
    return <Navigate to="/restaurant/onboarding" replace />
  }

  return <RestaurantProvider restaurant={restaurant}>{children}</RestaurantProvider>
}

// When Clerk is off (dev mode): fetch by slug so the dashboard still works
function GuardNoClerk({ children }: { children: React.ReactNode }) {
  const restaurant = useQuery(api.restaurants.getBySlug, { slug: SLUG })

  if (restaurant === undefined) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!restaurant) return <>{children}</>
  return <RestaurantProvider restaurant={restaurant}>{children}</RestaurantProvider>
}

export function RestaurantGuard({ children }: { children: React.ReactNode }) {
  if (!clerkReady) return <GuardNoClerk>{children}</GuardNoClerk>
  return <GuardWithClerk>{children}</GuardWithClerk>
}

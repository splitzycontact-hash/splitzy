import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { Navigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { RestaurantProvider } from '../context/RestaurantContext'
import { memberRoleToAppRole } from '../lib/roles'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

const SLUG = import.meta.env.VITE_RESTAURANT_SLUG ?? 'le-comptoir-parisien'

// When Clerk is active: fetch restaurant by Clerk user ID
function GuardWithClerk({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  // 1) propriétaire → sa ligne dans `restaurants`
  const ownerRestaurant = useQuery(
    api.restaurants.getByClerkId,
    user ? {} : 'skip',
  )
  // 2) sinon membre invité → restaurant rattaché via `members` (invitation acceptée)
  const memberRestaurant = useQuery(
    api.restaurants.getByMembership,
    user ? {} : 'skip',
  )
  // Rôle du membre invité : on lit sa ligne `members` via la query EXISTANTE
  // getTeamMembers (pas de nouvelle query Convex). Skip tant qu'on n'est pas sur le
  // chemin membre (non-propriétaire mais rattaché).
  const isMemberPath = ownerRestaurant === null && !!memberRestaurant
  const teamMembers = useQuery(
    api.members.getTeamMembers,
    isMemberPath && memberRestaurant ? { restaurantId: memberRestaurant._id } : 'skip',
  )

  const spinner = (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Attendre la résolution propriétaire
  if (ownerRestaurant === undefined) return spinner
  if (ownerRestaurant) {
    // Propriétaire du restaurant (ligne restaurants.clerkUserId) → rôle owner.
    return <RestaurantProvider restaurant={ownerRestaurant} role="owner">{children}</RestaurantProvider>
  }

  // Pas propriétaire → tenter le rattachement par invitation acceptée
  if (memberRestaurant === undefined) return spinner
  if (memberRestaurant) {
    // On a besoin du rôle de la ligne `members` avant de rendre.
    if (teamMembers === undefined) return spinner
    const own = teamMembers.find(m => m.clerkUserId === user?.id)
    const role = memberRoleToAppRole(own?.role)
    return <RestaurantProvider restaurant={memberRestaurant} role={role}>{children}</RestaurantProvider>
  }

  // 3) ni propriétaire ni membre → onboarding (nouveau restaurant)
  return <Navigate to="/restaurant/onboarding" replace />
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
  // Dev sans Clerk : accès complet (owner) pour ne rien masquer.
  return <RestaurantProvider restaurant={restaurant} role="owner">{children}</RestaurantProvider>
}

export function RestaurantGuard({ children }: { children: React.ReactNode }) {
  if (!clerkReady) return <GuardNoClerk>{children}</GuardNoClerk>
  return <GuardWithClerk>{children}</GuardWithClerk>
}

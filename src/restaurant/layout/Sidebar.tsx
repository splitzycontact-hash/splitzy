import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Grid2x2, Sun, Receipt, Settings, LogOut } from 'lucide-react'
import { UserButton, useUser, useClerk } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useRestaurant, useRestaurantId } from '../context/RestaurantContext'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

const NAV_ITEMS = [
  { label: "Vue d'ensemble", icon: LayoutDashboard, to: '/restaurant',           exact: true },
  { label: 'Tables live',    icon: Grid2x2,         to: '/restaurant/tables' },
  { label: 'Feedbacks matin',icon: Sun,             to: '/restaurant/feedbacks', feedbackBadge: true },
  { label: 'Factures',       icon: Receipt,         to: '/restaurant/factures' },
  { label: 'Paramètres',     icon: Settings,        to: '/restaurant/settings' },
]

// Sous-composant isolé — n'est rendu que si ClerkProvider est actif
function UserSection() {
  const { user } = useUser()
  const { signOut } = useClerk()
  return (
    <div className="flex items-center gap-3 px-1">
      <UserButton appearance={{ variables: { colorPrimary: '#E8920A' } }} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-dark truncate">
          {user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'Gérant'}
        </div>
        <div className="text-[11px] text-muted truncate">
          {user?.emailAddresses[0]?.emailAddress}
        </div>
      </div>
      <button
        onClick={() => signOut({ redirectUrl: '/restaurant/sign-in' })}
        title="Se déconnecter"
        className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-red-50 transition-colors shrink-0"
      >
        <LogOut size={14} />
      </button>
    </div>
  )
}

export function Sidebar() {
  const restaurant = useRestaurant()
  const restaurantId = useRestaurantId()
  const newFeedbackCount = useQuery(
    api.feedbacks.getNewCount,
    restaurantId ? { restaurantId } : 'skip',
  ) ?? 0

  return (
    <aside className="w-60 h-full hidden md:flex flex-col bg-white border-r border-border shrink-0">
      <div className="px-5 pt-6 pb-4">
        <div className="text-xl font-bold tracking-tight text-dark">
          Split<span className="text-brand">zy</span>
        </div>
        <div className="text-xs text-muted mt-0.5">{restaurant?.name ?? '—'}</div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, to, exact, feedbackBadge }) => {
          const badge = feedbackBadge && newFeedbackCount > 0 ? String(newFeedbackCount) : undefined
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-brand-bg text-brand border-l-[3px] border-brand pl-[9px]'
                    : 'text-mid hover:bg-bg border-l-[3px] border-transparent pl-[9px]'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-xs bg-brand text-white rounded-full px-1.5 py-0.5 leading-none font-semibold">
                  {badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="px-4 pb-5 space-y-3">
        <div className="bg-brand-bg border border-brand/20 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-brand">Plan Pro</div>
          <div className="text-sm font-bold text-dark">39€<span className="text-xs font-normal text-muted">/mois</span></div>
        </div>
        {clerkReady && <UserSection />}
      </div>
    </aside>
  )
}

import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Grid2x2, Sun, Receipt, Settings } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Sidebar } from './Sidebar'
import { PrintProvider, usePrintState } from '../context/PrintContext'
import { PrintReport } from '../components/PrintReport'
import { useRestaurantId } from '../context/RestaurantContext'

interface RestaurantLayoutProps {
  children: ReactNode
}

const MOBILE_NAV_ITEMS = [
  { label: 'Accueil',   icon: LayoutDashboard, to: '/restaurant',           exact: true },
  { label: 'Tables',    icon: Grid2x2,         to: '/restaurant/tables' },
  { label: 'Feedbacks', icon: Sun,             to: '/restaurant/feedbacks', feedbackBadge: true },
  { label: 'Factures',  icon: Receipt,         to: '/restaurant/factures' },
  { label: 'Réglages',  icon: Settings,        to: '/restaurant/settings' },
]

function MobileBottomNav() {
  const restaurantId = useRestaurantId()
  const newFeedbackCount = useQuery(
    api.feedbacks.getNewCount,
    restaurantId ? { restaurantId } : 'skip',
  ) ?? 0

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {MOBILE_NAV_ITEMS.map(({ label, icon: Icon, to, exact, feedbackBadge }) => {
        const badge = feedbackBadge && newFeedbackCount > 0 ? String(newFeedbackCount) : undefined
        return (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-brand' : 'text-muted'
              }`
            }
          >
            <div className="relative">
              <Icon size={20} />
              {badge && (
                <span className="absolute -top-1 -right-1.5 text-[9px] bg-brand text-white rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                  {badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export function RestaurantLayout({ children }: RestaurantLayoutProps) {
  const print = usePrintState()

  return (
    <PrintProvider onOpen={print.open}>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </div>
      </div>
      <MobileBottomNav />
      <PrintReport open={print.isOpen} onClose={print.close} />
    </PrintProvider>
  )
}

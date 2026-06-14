import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Grid3x3, Star,
  Receipt, Settings,
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Sidebar } from './Sidebar'
import { PrintProvider, usePrintState } from '../context/PrintContext'
import { PrintReport } from '../components/PrintReport'
import { ReportPeriodSelector } from '../components/ReportPeriodSelector'
import { ThemeProvider, useTheme } from '../context/ThemeContext'
import { useRestaurantId, useRestaurantRole } from '../context/RestaurantContext'
import type { RestaurantRole } from '../lib/roles'

interface RestaurantLayoutProps {
  children: ReactNode
}

// `roles` = rôles autorisés (absent = tous). Réglages owner-only (cf goal Étape 2).
const MOBILE_NAV: { label: string; icon: React.ElementType; to: string; exact?: boolean; feedbackBadge?: boolean; roles?: RestaurantRole[] }[] = [
  { label: 'Accueil',   icon: LayoutDashboard, to: '/restaurant',            exact: true },
  { label: 'Tables',    icon: Grid3x3,          to: '/restaurant/tables' },
  { label: 'Réputation',icon: Star,             to: '/restaurant/reputation', feedbackBadge: true },
  { label: 'Factures',  icon: Receipt,          to: '/restaurant/factures' },
  { label: 'Réglages',  icon: Settings,         to: '/restaurant/settings', roles: ['owner', 'manager'] },
]

function MobileBottomNav() {
  const restaurantId = useRestaurantId()
  const role = useRestaurantRole() ?? 'owner'
  const items = MOBILE_NAV.filter(item => !item.roles || item.roles.includes(role))
  const { theme } = useTheme()
  const newFeedbackCount = useQuery(
    api.feedbacks.getNewCount,
    restaurantId ? { restaurantId } : 'skip',
  ) ?? 0

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t"
      style={{
        background: 'var(--ds-bg-surface)',
        borderColor: 'var(--ds-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        color: theme === 'dark' ? '#FAFAFA' : '#0A0A0A',
      }}
    >
      {items.map(({ label, icon: Icon, to, exact, feedbackBadge }) => {
        const badge = feedbackBadge && newFeedbackCount > 0 ? newFeedbackCount : 0
        return (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                isActive ? 'ds-text-accent' : 'ds-text-tertiary'
              }`
            }
          >
            <div className="relative">
              <Icon size={20} />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1.5 text-[9px] bg-[#E8920A] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
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

function LayoutInner({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const print = usePrintState()

  return (
    <PrintProvider onOpen={print.openSelector}>
      <div
        className="restaurant-root flex h-[100dvh] w-full overflow-hidden"
        data-theme={theme}
        style={{ background: 'var(--ds-bg-base)' }}
      >
        <Sidebar />
        <div className="flex-1 overflow-y-auto min-w-0 pb-16 md:pb-0">
          {children}
        </div>
        <MobileBottomNav />
        <ReportPeriodSelector
          open={print.selectorOpen}
          onClose={print.closeSelector}
          onChoose={print.chooseRange}
        />
        <PrintReport open={print.reportOpen} range={print.range} onClose={print.closeReport} />
      </div>
    </PrintProvider>
  )
}

export function RestaurantLayout({ children }: RestaurantLayoutProps) {
  return (
    <ThemeProvider>
      <LayoutInner>{children}</LayoutInner>
      <Toaster position="bottom-right" richColors closeButton />
    </ThemeProvider>
  )
}

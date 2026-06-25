import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { m, AnimatePresence } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Grid3x3, Star, TrendingUp,
  Receipt, Settings, Plus, X, LayoutGrid, MessageSquare,
  Utensils, Users, CalendarDays, UserPlus, Plug,
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Sidebar } from './Sidebar'
import { FloatingChat } from '../components/FloatingChat'
import { PrintProvider, usePrintState } from '../context/PrintContext'
import { PrintReport } from '../components/PrintReport'
import { ReportPeriodSelector } from '../components/ReportPeriodSelector'
import { ThemeProvider, useTheme } from '../context/ThemeContext'
import { useRestaurantId, useRestaurantRole } from '../context/RestaurantContext'
import { useServiceStartTs } from '../hooks/useServiceStartTs'
import type { RestaurantRole } from '../lib/roles'

interface RestaurantLayoutProps {
  children: ReactNode
}

// `roles` = rôles autorisés (absent = tous).
type NavEntry = {
  label: string; icon: React.ElementType; to: string
  exact?: boolean; feedbackBadge?: boolean; unreadBadge?: boolean; roles?: RestaurantRole[]
}

// 4 onglets primaires de la barre du bas (5ᵉ slot = bouton « Plus »).
const MOBILE_PRIMARY: NavEntry[] = [
  { label: 'Accueil',    icon: LayoutDashboard, to: '/restaurant',            exact: true },
  { label: 'Tables',     icon: Grid3x3,         to: '/restaurant/tables' },
  { label: 'Réputation', icon: Star,            to: '/restaurant/reputation', feedbackBadge: true },
  { label: 'Analytics',  icon: TrendingUp,      to: '/restaurant/analytics' },
]

// Pages secondaires accessibles via le bottom sheet « Plus » (mobile only).
const MOBILE_OVERFLOW: NavEntry[] = [
  { label: 'Salle',        icon: LayoutGrid,    to: '/restaurant/salle',        roles: ['owner', 'manager'] },
  { label: 'Chat équipe',  icon: MessageSquare, to: '/restaurant/chat',         unreadBadge: true },
  { label: 'Menu',         icon: Utensils,      to: '/restaurant/menu',         roles: ['owner', 'manager'] },
  { label: 'Clients',      icon: Users,         to: '/restaurant/clients',      roles: ['owner', 'manager'] },
  { label: 'Planning',     icon: CalendarDays,  to: '/restaurant/planning',     roles: ['owner', 'manager'] },
  { label: 'Extras',       icon: UserPlus,      to: '/restaurant/extras',       roles: ['owner', 'manager'] },
  { label: 'Factures',     icon: Receipt,       to: '/restaurant/factures' },
  { label: 'Intégrations', icon: Plug,          to: '/restaurant/integrations', roles: ['owner'] },
  { label: 'Réglages',     icon: Settings,      to: '/restaurant/settings',     roles: ['owner', 'manager'] },
]

function MobileBottomNav() {
  const restaurantId = useRestaurantId()
  const role = useRestaurantRole() ?? 'owner'
  const location = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)

  const newFeedbackCount = useQuery(
    api.feedbacks.getNewCount,
    restaurantId ? { restaurantId } : 'skip',
  ) ?? 0
  const sinceTs = useServiceStartTs()
  const unread = useQuery(
    api.messages.getUnreadCount,
    restaurantId ? { restaurantId, sinceTs } : 'skip',
  ) ?? 0

  const overflow = MOBILE_OVERFLOW.filter(item => !item.roles || item.roles.includes(role))
  const overflowActive = overflow.some(item => location.pathname.startsWith(item.to))
  // Chat vit dans l'overflow → remonter son badge non-lu sur le bouton « Plus ».
  const plusUnread = overflow.some(i => i.unreadBadge) ? unread : 0

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t"
        style={{
          background: 'var(--ds-bg-surface)',
          borderColor: 'var(--ds-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -1px 12px rgba(0,0,0,0.04)',
        }}
      >
        {MOBILE_PRIMARY.map(({ label, icon: Icon, to, exact, feedbackBadge }) => {
          const badge = feedbackBadge && newFeedbackCount > 0 ? newFeedbackCount : 0
          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] pt-2 pb-1.5 transition-colors"
            >
              {({ isActive }) => (
                <NavTab Icon={Icon} label={label} badge={badge} isActive={isActive} />
              )}
            </NavLink>
          )
        })}

        {/* Bouton « Plus » → bottom sheet */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Plus de pages"
          className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] pt-2 pb-1.5 transition-colors"
        >
          <NavTab Icon={Plus} label="Plus" badge={plusUnread} isActive={sheetOpen || overflowActive} />
        </button>
      </nav>

      <MobilePlusSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        items={overflow}
        unread={unread}
        pathname={location.pathname}
      />
    </>
  )
}

// Onglet unique de la barre : pastille active + icône + label + badge.
function NavTab({
  Icon, label, badge, isActive,
}: { Icon: React.ElementType; label: string; badge: number; isActive: boolean }) {
  return (
    <>
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-full px-3 py-1 transition-colors"
          style={{ background: isActive ? 'var(--ds-bg-accent-soft)' : 'transparent' }}
        >
          <Icon
            size={21}
            strokeWidth={isActive ? 2.2 : 1.9}
            style={{ color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-tertiary)' }}
          />
        </div>
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-[#E8920A] text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold leading-none tabular-nums">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span
        className="text-[10px] font-semibold leading-none"
        style={{ color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-tertiary)' }}
      >
        {label}
      </span>
    </>
  )
}

// Bottom sheet « Plus » — grille des pages secondaires (mobile only).
function MobilePlusSheet({
  open, onClose, items, unread, pathname,
}: {
  open: boolean; onClose: () => void; items: NavEntry[]; unread: number; pathname: string
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <m.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <m.div
            className="absolute bottom-0 left-0 right-0 rounded-t-[20px] overflow-hidden"
            style={{
              background: 'var(--ds-bg-surface)',
              paddingBottom: 'max(20px, calc(8px + env(safe-area-inset-bottom)))',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--ds-border)' }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-1 pb-3">
              <span className="text-[15px] font-bold ds-text-primary">Plus de pages</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center ds-text-tertiary hover:ds-bg-subtle transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 px-3 pt-1">
              {items.map(({ label, icon: Icon, to, exact, unreadBadge }) => {
                const isActive = exact ? pathname === to : pathname.startsWith(to)
                const badge = unreadBadge && unread > 0 ? unread : 0
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={onClose}
                    className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl py-2 transition-colors active:scale-95"
                    style={{ background: isActive ? 'var(--ds-bg-accent-soft)' : 'transparent' }}
                  >
                    <div className="relative">
                      <Icon
                        size={23}
                        strokeWidth={1.9}
                        style={{ color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-secondary)' }}
                      />
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 text-[9px] bg-[#EF4444] text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold leading-none tabular-nums">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-medium text-center leading-tight px-0.5"
                      style={{ color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-secondary)' }}
                    >
                      {label}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function LayoutInner({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const print = usePrintState()
  const restaurantId = useRestaurantId()

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
        {restaurantId && <FloatingChat restaurantId={restaurantId} />}
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

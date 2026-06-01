import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Grid3x3, Star, TrendingUp,
  Utensils, Users, Receipt, Plug, Settings,
  ArrowUpRight, ChevronsUpDown, Sun, Moon,
} from 'lucide-react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useRestaurant, useRestaurantId } from '../context/RestaurantContext'
import { useTheme } from '../context/ThemeContext'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

const PILOTAGE_ITEMS = [
  { label: "Vue d'ensemble", icon: LayoutDashboard, to: '/restaurant',            exact: true, badge: false },
  { label: 'Tables live',   icon: Grid3x3,          to: '/restaurant/tables',     exact: false, badge: false },
  { label: 'Réputation',    icon: Star,             to: '/restaurant/reputation', exact: false, badge: true  },
  { label: 'Analytics',     icon: TrendingUp,       to: '/restaurant/analytics',  exact: false, badge: false },
]

const RESTAURANT_ITEMS = [
  { label: 'Menu / Carte',  icon: Utensils, to: '/restaurant/menu'          },
  { label: 'Clients',       icon: Users,    to: '/restaurant/clients'       },
  { label: 'Factures',      icon: Receipt,  to: '/restaurant/factures'      },
  { label: 'Intégrations',  icon: Plug,     to: '/restaurant/integrations'  },
  { label: 'Paramètres',    icon: Settings, to: '/restaurant/settings'      },
]

function SplitzyLogo() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: '#1A1A1A' }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="5.5" width="6" height="9" rx="1.4" fill="#FFFFFF"/>
        <rect x="4.4" y="7.4" width="3.2" height="0.9" rx="0.45" fill="#D4D4D8"/>
        <rect x="4.4" y="9.1" width="3.2" height="0.9" rx="0.45" fill="#D4D4D8"/>
        <rect x="4.4" y="10.8" width="2" height="0.9" rx="0.45" fill="#D4D4D8"/>
        <rect x="11" y="5.5" width="6" height="9" rx="1.4" fill="#E8920A"/>
        <rect x="12.4" y="7.4" width="3.2" height="0.9" rx="0.45" fill="#B8730A"/>
        <rect x="12.4" y="9.1" width="3.2" height="0.9" rx="0.45" fill="#B8730A"/>
        <rect x="12.4" y="10.8" width="2" height="0.9" rx="0.45" fill="#B8730A"/>
      </svg>
    </div>
  )
}

function NavSectionLabel({ label }: { label: string }) {
  return (
    <div
      className="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: 'var(--ds-text-tertiary)' }}
    >
      {label}
    </div>
  )
}

function NavItem({
  to, exact, icon: Icon, label, count,
}: {
  to: string; exact?: boolean; icon: React.ElementType; label: string; count?: number
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-[7px] rounded-[7px] text-[13.5px] font-medium transition-colors w-full ${
          isActive ? 'ds-bg-accent-soft ds-text-accent-strong font-semibold' : 'ds-text-secondary hover:ds-bg-subtle'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            strokeWidth={1.8}
            style={{ color: isActive ? 'var(--ds-accent)' : 'var(--ds-text-tertiary)', flexShrink: 0 }}
          />
          <span className="flex-1 truncate">{label}</span>
          {count !== undefined && count > 0 && (
            <span
              className="text-[11px] px-1.5 py-px rounded-full font-semibold tabular-nums"
              style={{
                background: isActive ? '#FFE2BB' : 'var(--ds-bg-subtle)',
                color: isActive ? 'var(--ds-accent-strong)' : 'var(--ds-text-secondary)',
              }}
            >
              {count}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function UserSection() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const initials = user?.firstName
    ? user.firstName.charAt(0).toUpperCase() + (user.lastName?.charAt(0).toUpperCase() ?? '')
    : (user?.emailAddresses[0]?.emailAddress?.substring(0, 2).toUpperCase() ?? 'YG')

  return (
    <div
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:ds-bg-subtle"
      onClick={() => signOut({ redirectUrl: '/restaurant/sign-in' })}
      title="Se déconnecter"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11.5px] font-bold flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #FFB453 0%, #E8920A 100%)' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold ds-text-primary truncate leading-[1.2]">
          {user?.firstName
            ? `${user.firstName}${user.lastName ? ' ' + user.lastName.charAt(0) + '.' : ''}`
            : 'Gérant'}
        </div>
        <div className="text-[11px] ds-text-tertiary truncate leading-[1.2]">
          {user?.emailAddresses[0]?.emailAddress}
        </div>
      </div>
      <ChevronsUpDown size={14} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
    </div>
  )
}

export function Sidebar() {
  const restaurant = useRestaurant()
  const restaurantId = useRestaurantId()
  const { theme, toggleTheme } = useTheme()
  const newFeedbackCount = useQuery(
    api.feedbacks.getNewCount,
    restaurantId ? { restaurantId } : 'skip',
  ) ?? 0

  return (
    <aside
      className="w-[240px] h-full hidden md:flex flex-col shrink-0 border-r"
      style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)' }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-2 pb-[18px] pt-[6px] mx-3.5 mt-5 border-b"
        style={{ borderColor: 'var(--ds-border)' }}
      >
        <SplitzyLogo />
        <div className="flex flex-col gap-px min-w-0">
          <div
            className="font-extrabold text-[15px] tracking-[-0.02em] leading-[1.1]"
            style={{ color: 'var(--ds-text-primary)' }}
          >
            Splitzy
          </div>
          <div className="text-[12px] truncate" style={{ color: 'var(--ds-text-tertiary)' }}>
            {restaurant?.name ?? '—'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3.5 pb-2">
        <NavSectionLabel label="Pilotage" />
        <div className="flex flex-col gap-px">
          {PILOTAGE_ITEMS.map(item => (
            <NavItem
              key={item.to}
              to={item.to}
              exact={item.exact}
              icon={item.icon}
              label={item.label}
              count={item.badge ? newFeedbackCount : undefined}
            />
          ))}
        </div>

        <NavSectionLabel label="Restaurant" />
        <div className="flex flex-col gap-px">
          {RESTAURANT_ITEMS.map(item => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div
        className="flex flex-col gap-3 px-3.5 pb-[18px] pt-3.5 border-t"
        style={{ borderColor: 'var(--ds-border)' }}
      >
        {/* Plan card */}
        {(() => {
          const isPro = restaurant?.plan === 'pro'
          return (
            <div
              className="rounded-[10px] px-3 py-3 relative overflow-hidden"
              style={{
                background: isPro
                  ? 'linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)'
                  : 'linear-gradient(180deg, #FFF8EC 0%, #FFF4E5 100%)',
                border: isPro ? '1px solid #333' : '1px solid #F5DDB3',
              }}
            >
              <div
                className="absolute -top-5 -right-5 w-[60px] h-[60px] rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, rgba(232,146,10,${isPro ? '0.30' : '0.18'}), transparent 70%)` }}
              />
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: isPro ? '#A1A1AA' : '#C77A08' }}>
                Plan actuel
              </div>
              <div className="font-bold text-[14px] mt-1" style={{ color: isPro ? '#FAFAFA' : '#0A0A0A' }}>
                {isPro ? 'Plan Pro' : 'Plan Essentiel'}
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: isPro ? '#71717A' : '#52525B' }}>
                {isPro
                  ? <><b style={{ fontWeight: 700, color: '#F5A030' }}>99€</b> /mois</>
                  : <><b style={{ fontWeight: 700, color: '#0A0A0A' }}>59€</b> /mois</>
                }
              </div>
              {!isPro && (
                <div className="flex items-center gap-1 mt-2.5 text-[11.5px] font-semibold" style={{ color: '#C77A08' }}>
                  Passer au Pro
                  <ArrowUpRight size={12} />
                </div>
              )}
              {isPro && (
                <div className="flex items-center gap-1 mt-2.5 text-[11.5px] font-semibold" style={{ color: '#E8920A' }}>
                  ✦ Insights IA actifs
                </div>
              )}
            </div>
          )
        })()}

        {/* Theme toggle + User */}
        <div className="flex items-center justify-between gap-2">
          <div
            className="inline-flex rounded-lg p-[3px] border"
            style={{
              background: 'var(--ds-bg-surface)',
              borderColor: 'var(--ds-border)',
              boxShadow: 'var(--ds-shadow-sm)',
            }}
          >
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className="flex items-center justify-center w-[26px] h-6 rounded-[5px] transition-colors"
              style={{
                background: theme === 'light' ? 'var(--ds-bg-subtle)' : 'none',
                color: theme === 'light' ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              }}
              aria-label="Thème clair"
            >
              <Sun size={13} />
            </button>
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className="flex items-center justify-center w-[26px] h-6 rounded-[5px] transition-colors"
              style={{
                background: theme === 'dark' ? 'var(--ds-bg-subtle)' : 'none',
                color: theme === 'dark' ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              }}
              aria-label="Thème sombre"
            >
              <Moon size={13} />
            </button>
          </div>
          {clerkReady ? (
            <div className="flex-1 min-w-0">
              <UserSection />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

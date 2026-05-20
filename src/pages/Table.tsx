import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useQuery } from 'convex/react'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

const AVATAR_COLORS = ['#E8920A', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#14B8A6']

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 28, height: 4, borderRadius: 2,
          background: i < current ? '#E8920A' : '#E4E4E7',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  )
}

export function Table() {
  const { state } = useSession()
  const navigate = useNavigate()

  const userColor = AVATAR_COLORS[state.userAvatarIndex] ?? '#E8920A'
  const userInitial = (state.userName.trim()[0] ?? '?').toUpperCase()

  const convexItems = useQuery(
    api.menuItems.listByRestaurant,
    state.convexRestaurantId
      ? { restaurantId: state.convexRestaurantId as Id<'restaurants'> }
      : 'skip',
  )

  const billItems = convexItems && convexItems.length > 0
    ? convexItems.slice(0, 8)
    : []

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 6px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 34, height: 34, borderRadius: 11, border: '1px solid #E4E4E7',
            background: '#fff', color: '#0A0A0A', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
          Table {state.tableNumber}
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Step bar + restaurant name */}
      <div style={{ padding: '0 20px', textAlign: 'center' }}>
        <StepBar current={2} />
        <div style={{ fontSize: 13.5, color: '#52525B', marginTop: -2 }}>
          {state.restaurantName}
        </div>
      </div>

      {/* Convives row */}
      <div style={{ padding: '24px 20px 4px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          À cette table
        </div>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          {/* Me — ringed */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: userColor, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 20,
              outline: `2.5px solid #E8920A`, outlineOffset: 2,
              boxShadow: `inset 0 0 0 0.5px rgba(255,255,255,0.18)`,
            }}>
              {userInitial}
            </div>
            <div style={{ fontSize: 10.5, color: '#E8920A', fontWeight: 600 }}>Toi</div>
          </div>
          {/* Other convives */}
          {state.convives.map(c => (
            <div key={c.id} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: c.color || AVATAR_COLORS[c.avatarIndex] || '#A1A1AA',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 20,
                boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.18)',
              }}>
                {(c.name[0] ?? '?').toUpperCase()}
              </div>
              <div style={{ fontSize: 10.5, color: '#52525B', fontWeight: 500 }}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bill card */}
      <div style={{
        margin: '24px 20px 0',
        padding: '6px 16px 6px',
        background: '#fff', borderRadius: 18, border: '1px solid #E4E4E7',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 10px', borderBottom: '1px dashed #E4E4E7' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0A0A0A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Addition en cours
          </div>
          <div style={{ fontSize: 11, color: '#52525B', fontWeight: 600 }}>
            {billItems.length > 0 ? `${billItems.length} articles` : 'En cours'}
          </div>
        </div>

        {billItems.length > 0 ? (
          <>
            {billItems.map((it, idx) => (
              <div key={it._id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: idx < billItems.length - 1 ? '1px solid #F1F1F2' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>{it.name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatEur(it.priceCents)}
                </div>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0 12px', borderTop: '1px solid #E4E4E7', marginTop: 4,
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A0A0A' }}>Total table</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {state.tableTotalCents > 0
                  ? formatEur(state.tableTotalCents)
                  : formatEur(billItems.reduce((s, it) => s + it.priceCents, 0))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '14px 0 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {state.tableTotalCents > 0 ? formatEur(state.tableTotalCents) : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#52525B', marginTop: 4 }}>
              {state.tableCapacity > 0 ? `Pour ${state.tableCapacity} personnes` : 'Addition en cours'}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 20 }} />

      {/* CTAs */}
      <div style={{ padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <m.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/items')}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0,
            background: '#E8920A', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          Choisir ma part
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </m.button>
        <button
          type="button"
          style={{
            width: '100%', height: 48, borderRadius: 14, border: '1px solid #E4E4E7',
            background: '#fff', color: '#0A0A0A',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
          onClick={() => navigate('/items')}
        >
          Voir le menu complet
        </button>
      </div>
    </m.div>
  )
}

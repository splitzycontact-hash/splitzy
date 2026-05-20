import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from 'convex/react'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { MENU_ITEMS } from '../data/menu'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type { MenuItem } from '../context/types'

type Category = 'entrees' | 'plats' | 'desserts' | 'boissons'

const CATEGORY_LABELS: Record<Category, string> = {
  entrees: 'Entrées',
  plats: 'Plats',
  desserts: 'Desserts',
  boissons: 'Boissons',
}

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 28, height: 4, borderRadius: 2,
          background: i < current ? '#E8920A' : '#E4E4E7',
        }} />
      ))}
    </div>
  )
}

export function Items() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal } = useSessionCalcs()
  const [openCat, setOpenCat] = useState<Category | null>('entrees')

  const convexItems = useQuery(
    api.menuItems.listByRestaurant,
    state.convexRestaurantId
      ? { restaurantId: state.convexRestaurantId as Id<'restaurants'> }
      : 'skip',
  )

  const menuItems: MenuItem[] = convexItems && convexItems.length > 0
    ? convexItems.map(item => ({
        id: item._id,
        category: item.category as MenuItem['category'],
        emoji: item.emoji,
        name: item.name,
        description: item.description ?? '',
        price: item.priceCents,
      }))
    : MENU_ITEMS

  const isSelected = (id: string) => state.selectedItems.some(i => i.menuItemId === id)
  const getSplitFactor = (id: string) => state.selectedItems.find(i => i.menuItemId === id)?.splitFactor ?? 1
  const selectedCount = state.selectedItems.length

  const categorized = (['entrees', 'plats', 'desserts', 'boissons'] as Category[]).map(cat => ({
    cat,
    items: menuItems.filter(m => m.category === cat),
  })).filter(g => g.items.length > 0)

  const perPerson = state.tableTotalCents > 0
    ? Math.round(state.tableTotalCents / state.equalSplitCount)
    : 0

  return (
    <motion.div
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
            width: 44, height: 44, borderRadius: 12, border: '1px solid #E4E4E7',
            background: '#fff', color: '#0A0A0A', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
          Mes articles
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Step bar */}
      <div style={{ padding: '0 20px 4px' }}>
        <StepBar current={3} />
      </div>

      {/* Mode tabs */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ background: '#F1F1F2', borderRadius: 12, padding: 4, display: 'flex' }}>
          {([
            { id: 'item' as const, label: 'Par article' },
            { id: 'equal' as const, label: 'Parts égales' },
            { id: 'custom' as const, label: 'Montant libre' },
          ]).map(tab => {
            const active = state.splitMode === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_SPLIT_MODE', payload: tab.id })}
                style={{
                  flex: 1, padding: '10px 4px', border: 0, borderRadius: 9,
                  background: active ? '#fff' : 'transparent',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  color: active ? '#0A0A0A' : '#52525B',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mode content */}
      {state.splitMode === 'item' && (
        <div style={{ padding: '14px 20px 0', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {categorized.map(({ cat, items }) => {
            const open = openCat === cat
            return (
              <div key={cat} style={{
                background: '#fff', borderRadius: 14, border: '1px solid #E4E4E7',
                marginBottom: 10, overflow: 'hidden',
              }}>
                <button
                  type="button"
                  onClick={() => setOpenCat(open ? null : cat)}
                  style={{
                    width: '100%', padding: '14px 16px', border: 0, background: 'transparent',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span style={{ fontSize: 11, color: '#52525B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {items.length} articles
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.18s' }}>
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                {open && (
                  <div style={{ borderTop: '1px solid #F1F1F2' }}>
                    {items.map((it, idx) => {
                      const sel = isSelected(it.id)
                      const factor = getSplitFactor(it.id)
                      return (
                        <div key={it.id} style={{
                          borderBottom: idx < items.length - 1 ? '1px solid #F1F1F2' : 'none',
                        }}>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'TOGGLE_ITEM', payload: { itemId: it.id, priceCents: it.price } })}
                            style={{
                              width: '100%', padding: '12px 16px', border: 0, background: 'transparent',
                              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                            }}
                          >
                            <div style={{
                              width: 22, height: 22, borderRadius: 7,
                              border: `1.5px solid ${sel ? '#E8920A' : '#E4E4E7'}`,
                              background: sel ? '#E8920A' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {sel && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#0A0A0A' }}>
                                {it.emoji ? `${it.emoji} ` : ''}{it.name}
                              </div>
                              {it.description && (
                                <div style={{ fontSize: 11.5, color: '#52525B', marginTop: 1 }}>{it.description}</div>
                              )}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: sel ? '#E8920A' : '#0A0A0A', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {formatEur(it.price)}
                            </div>
                          </button>
                          {sel && (
                            <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 11.5, color: '#52525B', fontWeight: 600 }}>Partager :</span>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {([1, 2, 3, 4] as const).map(s => {
                                  const isActive = factor === s
                                  return (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => dispatch({ type: 'SET_ITEM_SPLIT', payload: { itemId: it.id, factor: s } })}
                                      style={{
                                        height: 44, minWidth: 44, padding: '0 10px',
                                        borderRadius: 10,
                                        border: `1.5px solid ${isActive ? '#E8920A' : '#E4E4E7'}`,
                                        background: isActive ? '#FFF4E5' : '#fff',
                                        color: isActive ? '#E8920A' : '#52525B',
                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                      }}
                                    >
                                      ÷{s}
                                    </button>
                                  )
                                })}
                              </div>
                              <div style={{ flex: 1 }} />
                              <span style={{ fontSize: 12, color: '#E8920A', fontWeight: 700 }}>
                                = {formatEur(Math.round(it.price / factor))}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {state.splitMode === 'equal' && (
        <div style={{ padding: '14px 20px 0', flex: 1 }}>
          <div style={{
            background: '#fff', borderRadius: 18, border: '1px solid #E4E4E7',
            padding: 22, textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#52525B', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Total de la table
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
              {state.tableTotalCents > 0 ? formatEur(state.tableTotalCents) : '—'}
            </div>
            <div style={{ marginTop: 24, padding: 16, borderRadius: 14, background: '#FAFAFA' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nombre de personnes
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_EQUAL_SPLIT_COUNT', payload: Math.max(2, state.equalSplitCount - 1) })}
                  style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid #E4E4E7', background: '#fff', color: '#0A0A0A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                >
                  −
                </button>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {state.equalSplitCount}
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_EQUAL_SPLIT_COUNT', payload: Math.min(12, state.equalSplitCount + 1) })}
                  style={{ width: 38, height: 38, borderRadius: 12, border: '1px solid #E4E4E7', background: '#fff', color: '#0A0A0A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                >
                  +
                </button>
              </div>
            </div>
            {perPerson > 0 && (
              <div style={{
                marginTop: 12, padding: '14px 16px', borderRadius: 14,
                background: '#FFF4E5', border: '1px solid rgba(232,146,10,0.2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, color: '#E8920A', fontWeight: 700 }}>Ta part</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#E8920A', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {formatEur(perPerson)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {state.splitMode === 'custom' && (
        <CustomAmountMode totalCents={state.tableTotalCents} />
      )}

      <div style={{ minHeight: 24 }} />

      {/* Sticky footer */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'linear-gradient(to top, #FAFAFA 70%, rgba(250,250,250,0))',
        padding: '14px 20px',
        paddingBottom: 'max(24px, calc(12px + env(safe-area-inset-bottom)))',
        flexShrink: 0,
      }}>
        <div style={{
          background: '#fff', border: '1px solid #E4E4E7', borderRadius: 14,
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10,
        }}>
          <div>
            <div style={{ fontSize: 11.5, color: '#52525B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ma part
            </div>
            <div style={{ fontSize: 11.5, color: '#A1A1AA', marginTop: 1 }}>
              {state.splitMode === 'item' && `${selectedCount} article${selectedCount !== 1 ? 's' : ''}`}
              {state.splitMode === 'equal' && `1 part sur ${state.equalSplitCount}`}
              {state.splitMode === 'custom' && 'Montant libre'}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {subtotal > 0 ? formatEur(subtotal) : '—'}
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          disabled={subtotal <= 0}
          onClick={() => navigate('/tip')}
          style={{
            width: '100%', height: 54, borderRadius: 16, border: 0, marginTop: 0,
            background: subtotal > 0 ? '#E8920A' : '#E4E4E7',
            color: subtotal > 0 ? '#fff' : '#A1A1AA',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: subtotal > 0 ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: subtotal > 0 ? '0 8px 24px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)' : 'none',
          }}
        >
          Valider ma part
          {subtotal > 0 && (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

function CustomAmountMode({ totalCents }: { totalCents: number }) {
  const { state, dispatch } = useSession()
  const [inputVal, setInputVal] = useState(
    state.customAmount > 0 ? (state.customAmount / 100).toString() : ''
  )

  const QUICK_AMOUNTS = [10, 20, 30, 50]

  const handleChange = (val: string) => {
    setInputVal(val)
    const num = parseFloat(val.replace(',', '.'))
    if (!isNaN(num) && num >= 0) {
      dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: Math.round(num * 100) })
    } else {
      dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: 0 })
    }
  }

  const setQuick = (euros: number) => {
    setInputVal(euros.toString())
    dispatch({ type: 'SET_CUSTOM_AMOUNT', payload: euros * 100 })
  }

  return (
    <div style={{ padding: '20px 20px 0', flex: 1 }}>
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E4E4E7', padding: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
          Je paie le montant de mon choix
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginTop: 16, gap: 4 }}>
          <input
            type="number"
            inputMode="decimal"
            value={inputVal}
            onChange={e => handleChange(e.target.value)}
            placeholder="0"
            autoFocus
            style={{
              width: 130, fontSize: 48, fontWeight: 800, color: '#0A0A0A',
              letterSpacing: '-0.04em', textAlign: 'right',
              border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ fontSize: 32, color: '#E8920A', fontWeight: 800, letterSpacing: '-0.03em' }}>€</span>
        </div>
        {totalCents > 0 && (
          <div style={{ fontSize: 12, color: '#52525B', textAlign: 'center', marginTop: 8 }}>
            Max disponible · {formatEur(totalCents)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {QUICK_AMOUNTS.map(v => {
            const isActive = state.customAmount === v * 100
            return (
              <button
                key={v}
                type="button"
                onClick={() => setQuick(v)}
                style={{
                  flex: 1, height: 38, borderRadius: 10,
                  border: `1px solid ${isActive ? '#E8920A' : '#E4E4E7'}`,
                  background: isActive ? '#FFF4E5' : '#fff',
                  color: isActive ? '#E8920A' : '#0A0A0A',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {v}€
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

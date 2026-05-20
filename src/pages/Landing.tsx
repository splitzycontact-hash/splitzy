import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'

export function Landing() {
  const { state } = useSession()
  const navigate = useNavigate()

  const tableLabel = state.tableNumber
    ? `Table ${state.tableNumber}${state.restaurantName ? ` · ${state.restaurantName}` : ''}`
    : 'Splitzy'

  return (
    <m.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#F4F4F5' }}
    >
      {/* Dark hero */}
      <div style={{
        background: '#18181B',
        padding: '52px 24px 32px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Decorative card deco */}
        <div style={{
          position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 7, opacity: 0.16, pointerEvents: 'none',
        }}>
          <div style={{ width: 30, height: 48, borderRadius: 6, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 5, background: '#ffffff' }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)', width: '60%' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)', width: '80%' }} />
          </div>
          <div style={{ width: 30, height: 48, borderRadius: 6, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 5, background: '#E8920A' }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)', width: '60%' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)', width: '80%' }} />
          </div>
        </div>

        {/* Pill */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 24, padding: '8px 18px',
            color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              width: 7, height: 7, background: '#E8920A', borderRadius: '50%',
              boxShadow: '0 0 6px rgba(232,146,10,0.8)',
              animation: 'landingPillBlink 2s infinite',
            }} />
            {tableLabel}
          </span>
          <style>{`@keyframes landingPillBlink { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
        </div>

        {/* Logo */}
        <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
          Payez. Partez. Sans friction.
        </div>
      </div>

      {/* White sheet */}
      <div style={{
        background: '#fff',
        borderRadius: '32px 32px 0 0',
        marginTop: -24,
        padding: '28px 24px 0',
        boxShadow: '0 -6px 40px rgba(0,0,0,0.12)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Sheet handle */}
        <div style={{ width: 32, height: 4, background: '#E0E0E4', borderRadius: 4, margin: '0 auto 24px' }} />

        {/* Restaurant card */}
        <div style={{
          background: 'linear-gradient(to right, #fffbf2 0%, #fff 60%)',
          borderRadius: 20, padding: 16,
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
          border: '1px solid rgba(232,146,10,0.2)',
          borderLeft: '4px solid #E8920A',
          boxShadow: '0 2px 16px rgba(232,146,10,0.1)',
        }}>
          <div style={{
            width: 50, height: 50, flexShrink: 0,
            background: 'linear-gradient(135deg, #E8920A, #B45309)',
            borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: '0 4px 14px rgba(232,146,10,0.32)',
          }}>
            🍽
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {state.restaurantName || 'Le restaurant'}
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {state.tableNumber ? `Table ${state.tableNumber}` : 'Table'}
              {state.tableCapacity > 0 ? ` · ${state.tableCapacity} couverts` : ''}
              {' · Session ouverte'}
            </div>
            {state.tableTotalCents > 0 && (
              <div style={{ fontSize: 12, color: '#E8920A', fontWeight: 700, marginTop: 2 }}>
                Addition : {formatEur(state.tableTotalCents)}
              </div>
            )}
          </div>
        </div>

        {/* 3 steps */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, alignItems: 'stretch' }}>
          {[
            { n: '1', label: 'Ton prénom' },
            { n: '2', label: 'Tes plats' },
            { n: '3', label: 'Paie en 10s' },
          ].map(s => (
            <div key={s.n} style={{
              flex: 1, background: '#fff', border: '1px solid #E5E7EB',
              borderRadius: 16, padding: '14px 6px', textAlign: 'center',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', margin: '0 auto 8px',
                background: 'linear-gradient(135deg, #E8920A, #B45309)',
                color: '#fff', fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(232,146,10,0.4)',
              }}>
                {s.n}
              </div>
              <div style={{ fontSize: 10, color: '#374151', fontWeight: 700, lineHeight: 1.35 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 'max(32px, calc(20px + env(safe-area-inset-bottom)))' }}>
          <m.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate('/profile')}
            style={{
              width: '100%', height: 56, borderRadius: 18, border: 0,
              background: '#E8920A', color: '#fff',
              fontSize: 16, fontWeight: 800, letterSpacing: '0.01em', cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(232,146,10,0.32), 0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            C'est parti →
          </m.button>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', paddingBottom: 4 }}>
            ✓ Aucune app · <span style={{ color: '#E8920A', fontWeight: 600 }}>Paiement sécurisé Stripe</span>
          </div>
        </div>
      </div>
    </m.div>
  )
}

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'

const AVATAR_COLORS = ['#E8920A', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#14B8A6']

function LiveDot({ color = '#10B981' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        display: 'inline-block',
        animation: 'livePulse 1.6s ease-in-out infinite',
      }} />
      <style>{`@keyframes livePulse {
        0% { box-shadow: 0 0 0 0 ${color}66; }
        70% { box-shadow: 0 0 0 8px transparent; }
        100% { box-shadow: 0 0 0 0 transparent; }
      }`}</style>
    </span>
  )
}

export function Landing() {
  const { state } = useSession()
  const navigate = useNavigate()

  const handleScanQR = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', 'environment')
    input.click()
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA' }}
    >
      {/* Dark hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: '#0A0A0A',
        padding: '60px 24px 36px',
        color: '#fff',
        flexShrink: 0,
      }}>
        {/* Diagonal stripes */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 14px)',
        }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(232,146,10,0.22) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#A1A1AA', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <LiveDot />
            <span>Service en cours · Table {state.tableNumber || '—'}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: '#E8920A', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Bienvenue chez
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 6 }}>
              {state.restaurantName || 'Le restaurant'}
            </div>
            <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: 6 }}>
              {state.tableCapacity > 0 ? `${state.tableCapacity} convives` : 'Table réservée'}
              {state.convives.length > 0 && ` · ${state.convives.length} déjà connectés`}
            </div>
          </div>
        </div>
      </div>

      {/* Convives row */}
      {state.convives.length > 0 && (
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Déjà à table
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
            {state.convives.map(c => (
              <div key={c.id} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: c.color || AVATAR_COLORS[c.avatarIndex] || '#A1A1AA',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 17,
                }}>
                  {(c.name[0] ?? '?').toUpperCase()}
                </div>
                <div style={{ fontSize: 10.5, color: '#52525B', fontWeight: 500 }}>{c.name}</div>
              </div>
            ))}
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '1.5px dashed #E4E4E7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#A1A1AA', fontWeight: 700, fontSize: 18,
              }}>+</div>
              <div style={{ fontSize: 10.5, color: '#A1A1AA', fontWeight: 500 }}>Toi</div>
            </div>
            <div style={{ flex: 1, fontSize: 11.5, color: '#A1A1AA', alignSelf: 'center', lineHeight: 1.35 }}>
              et toi<br />bientôt !
            </div>
          </div>
        </div>
      )}

      {/* Addition card */}
      <div style={{
        margin: state.convives.length > 0 ? '24px 20px 0' : '24px 20px 0',
        padding: 18,
        background: '#fff', borderRadius: 18, border: '1px solid #E4E4E7',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Addition en cours
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 38, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                {state.tableTotalCents > 0 ? formatEur(state.tableTotalCents) : '—'}
              </span>
              {state.tableCapacity > 0 && (
                <span style={{ fontSize: 12, color: '#52525B' }}>pour {state.tableCapacity} personnes</span>
              )}
            </div>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', borderRadius: 999,
            background: 'rgba(16,185,129,0.08)', color: '#10B981',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          }}>
            <LiveDot />
            LIVE
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* CTAs */}
      <div style={{ padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/profile')}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0,
            background: '#E8920A', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          Je rejoins la table
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
        <button
          type="button"
          onClick={handleScanQR}
          style={{
            width: '100%', height: 48, borderRadius: 14, border: '1px solid #E4E4E7',
            background: '#fff', color: '#52525B',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Scanner un autre QR code
        </button>
      </div>
    </motion.div>
  )
}

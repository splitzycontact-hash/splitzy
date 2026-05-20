import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { NAME_SUGGESTIONS } from '../data/session'

const AVATARS = [
  { id: 0, emoji: '🦊', bg: '#E8920A', label: 'Léo' },
  { id: 1, emoji: '🐻', bg: '#3B82F6', label: 'Mia' },
  { id: 2, emoji: '🐸', bg: '#8B5CF6', label: 'Alex' },
  { id: 3, emoji: '🐙', bg: '#10B981', label: 'Sam' },
]

export function Profile() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()

  const canContinue = state.userName.trim().length >= 2
  const av = AVATARS[state.userAvatarIndex] ?? AVATARS[0]
  const displayName = state.userName.trim()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#F4F4F5' }}
    >
      {/* Dark hero */}
      <div style={{
        background: '#18181B',
        padding: '14px 24px 32px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Decorative deco */}
        <div style={{
          position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 7, opacity: 0.14, pointerEvents: 'none',
        }}>
          <div style={{ width: 30, height: 48, borderRadius: 6, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 5, background: '#ffffff' }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)', width: '60%' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.18)' }} />
          </div>
          <div style={{ width: 30, height: 48, borderRadius: 6, padding: '8px 5px', display: 'flex', flexDirection: 'column', gap: 5, background: '#E8920A' }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)', width: '60%' }} />
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.22)' }} />
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 8 }}>
          {/* active dot */}
          <div style={{ width: 22, height: 7, borderRadius: 4, background: '#E8920A', boxShadow: '0 0 9px rgba(232,146,10,0.75)' }} />
          <div style={{ width: 18, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ width: 18, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Identity preview card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18, padding: '12px 16px', marginTop: 10,
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
            background: av.bg, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 3px rgba(232,146,10,0.45), 0 0 0 7px rgba(232,146,10,0.12), 0 4px 16px rgba(0,0,0,0.45)',
            transition: 'box-shadow 0.3s',
          }}>
            {av.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 17, fontWeight: 800, color: displayName ? '#fff' : 'rgba(255,255,255,0.32)',
              fontStyle: displayName ? 'normal' : 'italic',
              letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              transition: 'color 0.2s',
            }}>
              {displayName || 'Ton prénom'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>
              Table {state.tableNumber || '—'} · Splitzy
            </div>
          </div>
        </div>
      </div>

      {/* White sheet */}
      <div style={{
        background: '#fff',
        borderRadius: '32px 32px 0 0',
        marginTop: -24,
        padding: '18px 24px 0',
        boxShadow: '0 -6px 40px rgba(0,0,0,0.12)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Sheet handle */}
        <div style={{ width: 32, height: 4, background: '#E0E0E4', borderRadius: 4, margin: '0 auto 16px' }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#F4F4F5', border: 'none', padding: '8px 13px', borderRadius: 10,
              color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              minHeight: 44, minWidth: 44,
            }}
          >
            ← Retour
          </button>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Étape 1 / 3
          </span>
        </div>

        <div style={{ fontSize: 21, fontWeight: 900, color: '#111827', letterSpacing: '-0.3px', marginBottom: 3 }}>
          Crée ton profil
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20, lineHeight: 1.5 }}>
          Tes convives verront ton avatar et ton prénom 👋
        </div>

        {/* Avatar 2×2 grid */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Ton avatar
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {AVATARS.map(a => {
            const active = state.userAvatarIndex === a.id
            return (
              <motion.button
                key={a.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => dispatch({ type: 'SET_USER_AVATAR', payload: a.id })}
                style={{
                  background: active ? '#FEF3C7' : '#F4F4F5',
                  border: active ? '2.5px solid #E8920A' : '2.5px solid #E5E7EB',
                  borderRadius: 18, padding: '16px 0 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                  cursor: 'pointer', position: 'relative',
                  transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: active ? 'translateY(-3px)' : 'none',
                  boxShadow: active ? '0 6px 20px rgba(232,146,10,0.2)' : 'none',
                  minHeight: 88,
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 18, height: 18, background: '#E8920A', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 900, color: '#fff',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: a.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                }}>
                  {a.emoji}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? '#B45309' : '#9CA3AF' }}>
                  {a.label}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: '#E5E7EB', margin: '0 0 16px' }} />

        {/* Name input */}
        <input
          value={state.userName}
          onChange={e => dispatch({ type: 'SET_USER_NAME', payload: e.target.value })}
          placeholder="Ton prénom"
          maxLength={20}
          autoFocus
          style={{
            width: '100%', padding: '14px 16px',
            border: `2px solid ${state.userName ? '#E8920A' : '#E5E7EB'}`,
            borderRadius: 14, fontSize: 17, fontWeight: 700, color: '#111827',
            background: '#FAFAFA', outline: 'none', fontFamily: 'inherit',
            marginBottom: 12, boxSizing: 'border-box',
            transition: 'border-color 0.2s, background 0.2s',
            boxShadow: state.userName ? '0 0 0 4px rgba(232,146,10,0.1)' : 'none',
          }}
          onFocus={e => (e.currentTarget.style.background = '#fff')}
          onBlur={e => (e.currentTarget.style.background = '#FAFAFA')}
        />

        {/* Name chips */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 20, padding: '2px 0 8px' }}>
          {NAME_SUGGESTIONS.slice(0, 6).map(name => (
            <button
              key={name}
              type="button"
              onClick={() => dispatch({ type: 'SET_USER_NAME', payload: name })}
              style={{
                flexShrink: 0, padding: '7px 13px', fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${state.userName === name ? '#E8920A' : '#E5E7EB'}`,
                borderRadius: 24,
                background: state.userName === name ? '#FEF3C7' : '#F4F4F5',
                color: state.userName === name ? '#B45309' : '#374151',
                cursor: 'pointer',
              }}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 16 }} />

        {/* CTA */}
        <div style={{ paddingBottom: 'max(32px, calc(20px + env(safe-area-inset-bottom)))', flexShrink: 0 }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate('/items')}
            disabled={!canContinue}
            style={{
              width: '100%', height: 56, borderRadius: 18, border: 0,
              background: canContinue ? '#E8920A' : '#E5E7EB',
              color: canContinue ? '#fff' : '#9CA3AF',
              fontSize: 16, fontWeight: 800, letterSpacing: '0.01em',
              cursor: canContinue ? 'pointer' : 'default',
              boxShadow: canContinue ? '0 4px 18px rgba(232,146,10,0.32), 0 1px 4px rgba(0,0,0,0.1)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Rejoindre la table
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

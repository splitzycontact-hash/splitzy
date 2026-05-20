import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { pageVariants } from '../utils/animations'
import { NAME_SUGGESTIONS } from '../data/session'

const AVATAR_COLORS = [
  { id: 0, hex: '#E8920A', label: 'Sunset'  },
  { id: 1, hex: '#10B981', label: 'Forest'  },
  { id: 2, hex: '#3B82F6', label: 'Ocean'   },
  { id: 3, hex: '#8B5CF6', label: 'Berry'   },
  { id: 4, hex: '#F43F5E', label: 'Rose'    },
  { id: 5, hex: '#14B8A6', label: 'Mint'    },
]

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

export function Profile() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()

  const canContinue = state.userName.trim().length >= 2
  const selectedColor = AVATAR_COLORS[state.userAvatarIndex]?.hex ?? '#E8920A'
  const initial = (state.userName.trim()[0] ?? '').toUpperCase()

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
            width: 34, height: 34, borderRadius: 11, border: '1px solid #E4E4E7',
            background: '#fff', color: '#0A0A0A', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ width: 34 }} />
      </div>

      {/* Step bar + title */}
      <div style={{ padding: '0 20px' }}>
        <StepBar current={1} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em' }}>
            Crée ton profil rapide
          </div>
          <div style={{ fontSize: 13.5, color: '#52525B', marginTop: 4 }}>
            Étape 1 sur 3 · Aucune inscription
          </div>
        </div>
      </div>

      {/* Avatar preview */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0 22px' }}>
        <motion.div
          animate={{ scale: state.userName.trim() ? 1 : 0.94 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          style={{
            width: 96, height: 96, borderRadius: '50%',
            background: selectedColor, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 42, letterSpacing: '-0.03em',
            boxShadow: `0 12px 32px -8px ${selectedColor}77, inset 0 0 0 1px rgba(255,255,255,0.18)`,
          }}
        >
          {initial || <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>?</span>}
        </motion.div>
      </div>

      {/* Color picker */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Choisis ta couleur
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {AVATAR_COLORS.map(c => {
            const active = state.userAvatarIndex === c.id
            return (
              <motion.button
                key={c.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => dispatch({ type: 'SET_USER_AVATAR', payload: c.id })}
                style={{
                  aspectRatio: '1', border: 0, padding: 0, background: 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%', background: c.hex,
                  border: active ? `2.5px solid #0A0A0A` : '2.5px solid transparent',
                  boxShadow: active ? `0 0 0 2px ${c.hex}, inset 0 0 0 2px #fff` : 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                  transition: 'all 0.18s',
                }} />
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Name input */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Ton prénom
        </div>
        <input
          value={state.userName}
          onChange={e => dispatch({ type: 'SET_USER_NAME', payload: e.target.value })}
          placeholder="Ex : Marin"
          maxLength={20}
          autoFocus
          style={{
            width: '100%', height: 52, padding: '0 16px',
            borderRadius: 14, border: `1.5px solid ${state.userName ? '#E8920A' : '#E4E4E7'}`,
            background: '#fff', color: '#0A0A0A',
            fontSize: 16, fontFamily: 'inherit', fontWeight: 500,
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.18s',
          }}
        />
        {!state.userName && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {NAME_SUGGESTIONS.slice(0, 5).map(name => (
              <button
                key={name}
                type="button"
                onClick={() => dispatch({ type: 'SET_USER_NAME', payload: name })}
                style={{
                  padding: '7px 14px', borderRadius: 999, border: '1px solid #E4E4E7',
                  background: '#fff', color: '#52525B', fontSize: 12.5, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      {/* CTA */}
      <div style={{ padding: '16px 20px 28px' }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate('/table')}
          disabled={!canContinue}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0,
            background: canContinue ? '#E8920A' : '#E4E4E7',
            color: canContinue ? '#fff' : '#A1A1AA',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: canContinue ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: canContinue ? '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)' : 'none',
          }}
        >
          Rejoindre la table
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  )
}

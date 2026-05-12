import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { Avatar, AVATARS } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { pageVariants, springPop } from '../utils/animations'
import { NAME_SUGGESTIONS } from '../data/session'

export function Profile() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const [inputFocused, setInputFocused] = useState(false)

  const canContinue = state.userName.trim().length > 0

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-full bg-bg"
    >
      {/* Top bar */}
      <div className="flex-shrink-0 px-5 pt-3 pb-3 bg-white border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-mid hover:text-dark text-sm font-medium min-h-[44px]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ width: i === 0 ? 28 : 8 }}
                transition={springPop}
                className="h-2 rounded-full"
                style={{ background: i === 0 ? '#E8920A' : '#E5E7EB' }}
              />
            ))}
          </div>
          <div className="w-16" />
        </div>
        <h1 className="text-xl font-black text-dark text-center">Choisis ton avatar</h1>
        <p className="text-sm text-muted text-center mt-1">Étape 1 sur 3</p>
      </div>

      {/* Avatar grid */}
      <div className="px-5 mt-6">
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map((av, idx) => (
            <motion.button
              key={idx}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => dispatch({ type: 'SET_USER_AVATAR', payload: idx })}
              className={`
                flex flex-col items-center justify-center rounded-2xl py-4 px-2 gap-1
                transition-all duration-150
                ${state.userAvatarIndex === idx
                  ? 'bg-brand-bg border-2 border-brand shadow-glow'
                  : 'bg-white border-2 border-transparent'
                }
              `}
            >
              <span className="text-4xl">{av.emoji}</span>
              <span className="text-[10px] font-medium text-muted">
                {['Renard', 'Ours', 'Grenouille', 'Pieuvre', 'Licorne', 'Tigre'][idx]}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Name input */}
      <div className="px-5 mt-5">
        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Ton prénom
        </label>
        <input
          type="text"
          autoFocus
          value={state.userName}
          onChange={e => dispatch({ type: 'SET_USER_NAME', payload: e.target.value })}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="Ex: Alice"
          maxLength={20}
          className={`
            w-full h-14 px-4 rounded-xl border-2 text-dark font-semibold text-base
            outline-none transition-colors duration-150 bg-white
            ${inputFocused ? 'border-brand' : 'border-border'}
          `}
        />

        {/* Name suggestions */}
        {!state.userName && (
          <div className="flex flex-wrap gap-2 mt-3">
            {NAME_SUGGESTIONS.slice(0, 5).map(name => (
              <button
                key={name}
                type="button"
                onClick={() => dispatch({ type: 'SET_USER_NAME', payload: name })}
                className="px-3 py-1.5 bg-white border border-border rounded-full text-sm text-mid font-medium"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview */}
      {state.userName && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-4 flex items-center gap-3 bg-white rounded-xl p-3 border border-border"
        >
          <Avatar index={state.userAvatarIndex} size="md" />
          <div>
            <p className="text-sm font-bold text-dark">{state.userName}</p>
            <p className="text-xs text-muted">C'est toi !</p>
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <div className="px-5 mt-auto pt-4 pb-14 safe-bottom">
        <Button
          variant="brand"
          disabled={!canContinue}
          onClick={() => navigate('/table')}
        >
          {canContinue ? `Continuer, ${state.userName} →` : 'Choisir un prénom'}
        </Button>
      </div>
    </motion.div>
  )
}

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '../context/SessionContext'
import { StarRating } from '../components/features/StarRating'
import { pageVariants } from '../utils/animations'
import type { Id } from '../../convex/_generated/dataModel'
import { FEEDBACK_TAGS } from '../data/session'

const FEEDBACK_CHIP_DOTS: Record<string, string> = {
  'Super ambiance': '#F59E0B',
  'Serveur top': '#10B981',
  'Rapport qualité-prix': '#14B8A6',
  'On reviendra': '#E8920A',
  'Plat froid': '#3B82F6',
  'Service lent': '#A855F7',
  'Carte des vins': '#EC4899',
  'Trop bruyant': '#EF4444',
}

export function Feedback() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()

  const createFeedback = useMutation(api.feedbacks.create)

  const canSend = state.feedbackStars > 0

  const handleSend = async () => {
    if (state.convexRestaurantId && state.convexTableId) {
      createFeedback({
        restaurantId: state.convexRestaurantId as Id<'restaurants'>,
        tableId: state.convexTableId as Id<'tables'>,
        tableNumber: state.tableNumber,
        stars: state.feedbackStars,
        tags: state.feedbackTags,
        text: state.feedbackText,
      }).catch(() => {})
    }
    dispatch({ type: 'SEND_FEEDBACK' })
    navigate('/feedback/sent')
  }

  const starLabel = state.feedbackStars === 0 ? ''
    : state.feedbackStars <= 2 ? 'Désolé que ça ait coincé.'
    : state.feedbackStars <= 3 ? 'Pas tout à fait au top.'
    : state.feedbackStars === 4 ? 'Une bonne soirée.'
    : 'Une super soirée !'

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
        background: '#0A0A0A', padding: '50px 24px 28px', color: '#fff', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 14px)',
        }} />
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(232,146,10,0.22) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px',
              background: 'rgba(255,255,255,0.08)', border: 0, borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14, minHeight: 44,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2.5L4.5 7L9 11.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Retour
          </button>
          {/* Orange icon */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#E8920A',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L13.5 8L20 9L15 13.8L16.3 20L11 17.1L5.7 20L7 13.8L2 9L8.5 8L11 2Z" fill="white" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
            Comment s'est passée<br />ta soirée ?
          </div>
          <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: 6 }}>
            {state.restaurantName}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '16px 20px 0' }}>
        {/* Privacy badge */}
        <div style={{
          padding: 14, borderRadius: 14, background: '#FFF4E5',
          border: '1px solid rgba(232,146,10,0.2)',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
            <path d="M9 1.5L2.25 4.5v5.25C2.25 13.5 9 16.5 9 16.5S15.75 13.5 15.75 9.75V4.5L9 1.5z" stroke="#E8920A" strokeWidth="1.4" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>Ton avis reste privé</div>
            <div style={{ fontSize: 11.5, color: '#52525B' }}>Uniquement visible par le gérant · jamais sur Google</div>
          </div>
          <div style={{ padding: '3px 8px', borderRadius: 999, background: '#fff', fontSize: 10.5, color: '#52525B', fontWeight: 600 }}>
            Lu demain matin
          </div>
        </div>

        {/* Stars card */}
        <div style={{
          background: '#fff', border: '1px solid #E4E4E7', borderRadius: 16,
          padding: '16px 14px 20px', textAlign: 'center', marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>Ton expérience globale</div>
          <div style={{ marginTop: 10 }}>
            <StarRating
              value={state.feedbackStars}
              onChange={s => dispatch({ type: 'SET_FEEDBACK_STARS', payload: s })}
            />
          </div>
          {state.feedbackStars === 0 ? (
            <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 8 }}>
              Sélectionne au moins une étoile pour envoyer ton avis
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#52525B', marginTop: 8 }}>{starLabel}</div>
          )}
        </div>

        {/* Chips */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Ce qui t'a marqué{' '}
            <span style={{ textTransform: 'none', letterSpacing: 0, color: '#A1A1AA' }}>(optionnel)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FEEDBACK_TAGS.map(tag => {
              const sel = state.feedbackTags.includes(tag)
              const dot = FEEDBACK_CHIP_DOTS[tag] ?? '#E4E4E7'
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_FEEDBACK_TAG', payload: tag })}
                  style={{
                    padding: '9px 12px', borderRadius: 999,
                    border: `1.5px solid ${sel ? '#E8920A' : '#E4E4E7'}`,
                    background: sel ? '#FFF4E5' : '#fff',
                    color: sel ? '#E8920A' : '#0A0A0A',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', background: dot,
                    boxShadow: `0 0 0 2px ${sel ? '#FFF4E5' : '#fff'}`,
                    flexShrink: 0,
                  }} />
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Un mot en plus ?{' '}
            <span style={{ textTransform: 'none', letterSpacing: 0, color: '#A1A1AA' }}>(optionnel)</span>
          </div>
          <textarea
            value={state.feedbackText}
            onChange={e => dispatch({ type: 'SET_FEEDBACK_TEXT', payload: e.target.value })}
            maxLength={500}
            rows={3}
            placeholder="Décris ton expérience…"
            style={{
              width: '100%', padding: 14, borderRadius: 14,
              border: '1px solid #E4E4E7', background: '#fff', color: '#0A0A0A',
              fontSize: 16, fontFamily: 'inherit', resize: 'none', outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#E8920A')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E4E4E7')}
          />
          <div style={{ fontSize: 11, color: '#A1A1AA', textAlign: 'right', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            {state.feedbackText.length}/500
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ padding: '14px 20px', paddingBottom: 'max(24px, calc(12px + env(safe-area-inset-bottom)))', flexShrink: 0 }}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={handleSend}
          disabled={!canSend}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0,
            background: canSend ? '#E8920A' : '#E4E4E7',
            color: canSend ? '#fff' : '#A1A1AA',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: canSend ? 'pointer' : 'default',
            boxShadow: canSend ? '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)' : 'none',
          }}
        >
          Envoyer mon avis
        </motion.button>
        <button
          type="button"
          onClick={() => navigate('/feedback/sent')}
          style={{
            width: '100%', background: 'transparent', border: 0, color: '#52525B',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '12px 0 0',
          }}
        >
          Passer
        </button>
      </div>
    </motion.div>
  )
}

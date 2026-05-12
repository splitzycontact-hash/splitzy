import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '../context/SessionContext'
import { DarkHero } from '../components/layout/DarkHero'
import { StarRating } from '../components/features/StarRating'
import { FeedbackTag } from '../components/features/FeedbackTag'
import { Button } from '../components/ui/Button'
import { pageVariants } from '../utils/animations'
import { useRestaurantId } from '../hooks/useRestaurant'
import { FEEDBACK_TAGS } from '../data/session'

export function Feedback() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()

  const restaurantId = useRestaurantId()
  const createFeedback = useMutation(api.feedbacks.create)

  const canSend = state.feedbackStars > 0

  const handleSend = async () => {
    // Fire-and-forget: record feedback in Convex when restaurant is connected
    if (restaurantId) {
      createFeedback({
        restaurantId,
        tableId: restaurantId as unknown as string & { __tableName: "tables" },
        tableNumber: state.tableNumber ?? 7,
        stars: state.feedbackStars,
        tags: state.feedbackTags,
        text: state.feedbackText,
      }).catch(() => {
        // Silently fail if Convex is not connected
      })
    }
    dispatch({ type: 'SEND_FEEDBACK' })
    navigate('/feedback/sent')
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-full bg-bg"
    >
      <DarkHero minHeight="180px" className="flex-shrink-0 py-8">
        <span className="text-4xl mb-3">☀️</span>
        <h1 className="text-white text-xl font-black text-center px-6">
          Comment s'est passée ta soirée ?
        </h1>
        <p className="text-white/50 text-sm mt-1">{state.restaurantName}</p>
      </DarkHero>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        {/* Private notice */}
        <div className="flex items-center gap-3 bg-brand-light border border-brand/20 rounded-xl p-3 mb-5">
          <span className="text-xl flex-shrink-0">☀️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-dark">Ton avis restera privé</p>
            <p className="text-xs text-muted mt-0.5">Uniquement visible par le gérant</p>
          </div>
          <span className="text-xs font-bold text-brand bg-white px-2 py-1 rounded-full flex-shrink-0">
            Lu demain matin
          </span>
        </div>

        {/* Stars */}
        <div className="bg-white rounded-2xl p-5 shadow-card mb-4">
          <p className="text-sm font-bold text-dark text-center mb-4">Ton expérience globale</p>
          <StarRating
            value={state.feedbackStars}
            onChange={s => dispatch({ type: 'SET_FEEDBACK_STARS', payload: s })}
          />
          {state.feedbackStars === 0 && (
            <p className="text-xs text-muted text-center mt-3">
              Sélectionne au moins une étoile pour envoyer ton avis
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Ce qui t'a marqué
          </p>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TAGS.map(tag => (
              <FeedbackTag
                key={tag}
                label={tag}
                selected={state.feedbackTags.includes(tag)}
                onToggle={() => dispatch({ type: 'TOGGLE_FEEDBACK_TAG', payload: tag })}
              />
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Un mot en plus ? (optionnel)
          </p>
          <textarea
            value={state.feedbackText}
            onChange={e => dispatch({ type: 'SET_FEEDBACK_TEXT', payload: e.target.value })}
            maxLength={500}
            rows={3}
            placeholder="Décris ton expérience…"
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm text-dark resize-none outline-none focus:border-brand transition-colors"
          />
          <p className="text-right text-xs text-muted mt-1">
            {state.feedbackText.length}/500
          </p>
        </div>

        {/* CTAs */}
        <Button
          variant="brand"
          disabled={!canSend}
          onClick={handleSend}
        >
          Envoyer mon avis
        </Button>

        <button
          type="button"
          onClick={() => navigate('/feedback/sent')}
          className="w-full text-center text-sm text-muted font-medium py-3 mt-3 min-h-[44px]"
        >
          Passer
        </button>
      </div>
    </motion.div>
  )
}

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { Button } from '../components/ui/Button'
import { pageVariants } from '../utils/animations'
import { formatEur } from '../utils/formatCurrency'
import { useSessionCalcs } from '../hooks/useSessionCalcs'

function getTipMessage(percent: number): string {
  if (percent === 0) return 'Pas de pourboire'
  if (percent < 10) return `${percent}% · sympa !`
  if (percent < 15) return `${percent}% · c'est généreux 🙏`
  if (percent <= 20) return `${percent}% · merci pour eux 🧡`
  return `${percent}% · wow, ils vont adorer ! 🌟`
}

export function Tip() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()
  const { subtotal, tipAmount, total } = useSessionCalcs()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-full bg-bg"
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{ background: '#18181B' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-5 pt-6">
        {/* Tip amount display */}
        <motion.div
          key={tipAmount}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center mb-2"
        >
          <p className="text-[56px] font-black text-dark leading-none">
            {formatEur(tipAmount)}
          </p>
        </motion.div>

        {/* Emotional copy */}
        <motion.p
          key={state.tipPercent}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-base text-muted font-medium text-center mb-8"
        >
          {getTipMessage(state.tipPercent)}
        </motion.p>

        {/* Slider */}
        <div className="w-full mb-8">
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>0%</span>
            <span className="font-bold text-brand">{state.tipPercent}%</span>
            <span>30%</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={state.tipPercent}
            onChange={e => dispatch({ type: 'SET_TIP_PERCENT', payload: parseInt(e.target.value, 10) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #E8920A ${(state.tipPercent / 30) * 100}%, #E5E7EB ${(state.tipPercent / 30) * 100}%)`,
            }}
          />
        </div>

        {/* Quick select buttons */}
        <div className="flex gap-2 w-full mb-8">
          {[0, 10, 15, 20].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => dispatch({ type: 'SET_TIP_PERCENT', payload: pct })}
              className={`
                flex-1 py-2 rounded-xl text-sm font-bold transition-colors
                ${state.tipPercent === pct ? 'bg-brand text-white' : 'bg-white border border-border text-dark'}
              `}
            >
              {pct === 0 ? 'Aucun' : `${pct}%`}
            </button>
          ))}
        </div>

        {/* Mini recap card */}
        <div className="w-full bg-white rounded-2xl shadow-card px-4 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Ma part</span>
            <span className="font-semibold text-dark">{formatEur(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">+ Pourboire</span>
            <span className={`font-semibold ${tipAmount > 0 ? 'text-brand' : 'text-muted'}`}>
              {tipAmount > 0 ? `+${formatEur(tipAmount)}` : '—'}
            </span>
          </div>
          <div className="border-t border-dashed border-border pt-2 flex justify-between">
            <span className="font-bold text-dark">À payer</span>
            <span className="text-xl font-black text-dark">{formatEur(total)}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 mt-6 pb-8 safe-bottom flex-shrink-0">
        <Button variant="brand" onClick={() => navigate('/payment')}>
          Payer {formatEur(total)}
        </Button>
      </div>
    </motion.div>
  )
}

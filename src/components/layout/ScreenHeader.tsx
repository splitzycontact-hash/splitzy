import { useNavigate } from 'react-router-dom'
import { ProgressBar } from '../ui/ProgressBar'

interface ScreenHeaderProps {
  backLabel?: string
  step?: number
  totalSteps?: number
  showProgress?: boolean
}

export function ScreenHeader({
  backLabel = 'Retour',
  step,
  totalSteps = 3,
  showProgress = true,
}: ScreenHeaderProps) {
  const navigate = useNavigate()

  const progress = step ? ((step - 1) / (totalSteps - 1)) * 100 : 0

  return (
    <div className="flex-shrink-0" style={{ background: '#18181B' }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium min-h-[44px] min-w-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </button>
        {step && (
          <span className="text-white/50 text-xs font-medium">
            Étape {step}/{totalSteps}
          </span>
        )}
      </div>
      {showProgress && step && (
        <ProgressBar value={progress} className="mx-4 mb-3" />
      )}
    </div>
  )
}

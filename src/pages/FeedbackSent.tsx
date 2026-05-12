import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { DarkHero } from '../components/layout/DarkHero'
import { Button } from '../components/ui/Button'
import { pageVariants } from '../utils/animations'
export function FeedbackSent() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()

  const handleDownloadPDF = async () => {
    const { generateInvoicePDF } = await import('../utils/generateInvoice')
    generateInvoicePDF(state)
  }

  const handleReset = () => {
    dispatch({ type: 'RESET_SESSION' })
    navigate('/')
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-full bg-bg"
    >
      <DarkHero minHeight="200px" className="flex-shrink-0 py-8">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="text-5xl mb-3 block"
        >
          📨
        </motion.span>
        <h1 className="text-white text-2xl font-black">Avis envoyé !</h1>
        <p className="text-white/60 text-sm mt-1">Le gérant le lira demain</p>
      </DarkHero>

      <div className="flex-1 px-5 pt-5 pb-8 safe-bottom flex flex-col gap-4">
        {/* Thank you card */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="text-center mb-4">
            <span className="text-4xl">🙏</span>
            <h2 className="text-lg font-bold text-dark mt-2">Merci pour ton retour !</h2>
            <p className="text-sm text-muted mt-1">
              Ton avis aide le restaurant à s'améliorer pour la prochaine fois.
            </p>
          </div>

          {/* Delivery notice */}
          <div className="flex items-center gap-3 bg-brand-light border border-brand/20 rounded-xl p-3 mb-3">
            <span className="text-xl">☀️</span>
            <div>
              <p className="text-sm font-semibold text-dark">Livré demain matin</p>
              <p className="text-xs text-muted">Directement dans la boîte du gérant</p>
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <span>🔒</span>
            <span>Jamais publié · 100% privé</span>
          </div>
        </div>

        {/* Download invoice */}
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="w-full flex items-center justify-center gap-2 bg-white border border-border rounded-2xl py-4 min-h-[52px] text-sm font-semibold text-dark hover:bg-bg transition-colors active:bg-bg"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v9M8 10l-3-3M8 10l3-3M2 13h12" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Télécharger ma facture (PDF)
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTAs */}
        <Button variant="brand" onClick={handleReset}>
          Bonne soirée ! →
        </Button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full text-center text-sm text-muted font-medium py-3 min-h-[44px]"
        >
          ← Modifier mon avis
        </button>
      </div>
    </motion.div>
  )
}

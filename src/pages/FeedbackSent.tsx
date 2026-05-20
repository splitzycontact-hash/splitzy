import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
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
    navigate('/welcome')
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#FAFAFA',
        alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center',
      }}
    >
      {/* Check circle */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        style={{
          width: 72, height: 72, borderRadius: '50%', background: '#10B981', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
          boxShadow: '0 12px 32px -8px rgba(16,185,129,0.5)',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path d="M6 17L13.5 24L28 9" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 22, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em' }}
      >
        Merci pour ton retour !
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ fontSize: 13.5, color: '#52525B', marginTop: 6, lineHeight: 1.5 }}
      >
        {state.restaurantName
          ? <>{state.restaurantName} lira ton avis demain matin.<br />Il reste totalement privé.</>
          : <>Le gérant lira ton avis demain matin.<br />Il reste totalement privé.</>
        }
      </motion.div>

      {/* Privacy note */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          marginTop: 24, padding: '10px 16px', borderRadius: 12,
          background: '#FFF4E5', border: '1px solid rgba(232,146,10,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5L1.75 3.5v4C1.75 10.5 7 13 7 13S12.25 10.5 12.25 7.5v-4L7 1.5z" stroke="#E8920A" strokeWidth="1.2" />
        </svg>
        <span style={{ fontSize: 12, color: '#E8920A', fontWeight: 600 }}>
          Jamais publié · 100 % privé
        </span>
      </motion.div>

      <div style={{ flex: 1, minHeight: 32 }} />

      {/* Actions */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={handleDownloadPDF}
          style={{
            width: '100%', height: 48, borderRadius: 14, border: '1px solid #E4E4E7',
            background: '#fff', color: '#0A0A0A',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v9M8 10l-3-3M8 10l3-3M2 13h12" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Télécharger ma facture (PDF)
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.985 }}
          onClick={handleReset}
          style={{
            width: '100%', height: 56, borderRadius: 16, border: 0,
            background: '#E8920A', color: '#fff',
            fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer',
            boxShadow: '0 10px 28px -8px rgba(232,146,10,0.55), inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        >
          Bonne soirée ! →
        </motion.button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: '100%', background: 'transparent', border: 0, color: '#52525B',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: '8px 0',
          }}
        >
          ← Modifier mon avis
        </button>
      </div>
    </motion.div>
  )
}

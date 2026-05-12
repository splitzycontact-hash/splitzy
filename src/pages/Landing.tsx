import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { Avatar, DottedAvatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { pageVariants } from '../utils/animations'

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
      className="flex flex-col min-h-full bg-bg"
    >
      {/* Header band with restaurant branding */}
      <div
        className="relative flex-shrink-0"
        style={{
          height: 110,
          background: 'linear-gradient(135deg, #18181B 0%, #111827 60%, #1a1a2e 100%)',
        }}
      >
        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 0px, transparent 50%)',
            backgroundSize: '10px 10px',
          }}
        />

        {/* Logo that overflows */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="absolute left-5 -bottom-6 z-10"
        >
          <div
            className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-card-dark"
          >
            <span className="text-lg font-black text-dark" style={{ fontFamily: 'Inter, sans-serif' }}>
              Lc
            </span>
          </div>
        </motion.div>
      </div>

      {/* Restaurant info */}
      <div className="px-5 pt-10 pb-0">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-[22px] font-black text-dark leading-tight"
        >
          {state.restaurantName}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 mt-2"
        >
          <span className="px-3 py-1 rounded-full bg-dark text-white text-xs font-semibold">
            Table {state.tableNumber}
          </span>
          <span className="px-3 py-1 rounded-full bg-white border border-border text-dark text-xs font-semibold">
            {state.tableCapacity} convives
          </span>
        </motion.div>
      </div>

      {/* Already at table section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="px-5 mt-8"
      >
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          Déjà à table
        </p>

        <div className="flex items-center gap-2">
          {/* Stacked avatars */}
          <div className="flex items-center" style={{ gap: -8 }}>
            {state.convives.map((c, idx) => (
              <div key={c.id} style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: state.convives.length - idx }}>
                <Avatar index={c.avatarIndex} size="md" />
              </div>
            ))}
            <div style={{ marginLeft: -8, zIndex: 0 }}>
              <DottedAvatar size="md" label="+toi" />
            </div>
          </div>

          <div className="ml-3">
            <p className="text-sm font-semibold text-dark">
              {state.convives.map(c => c.name).join(', ')}
            </p>
            <p className="text-xs text-muted">et toi bientôt !</p>
          </div>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="mx-5 mt-8 border-t border-border" />

      {/* Table summary card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className="mx-5 mt-5 bg-white rounded-2xl p-4 shadow-card"
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-dark">Addition en cours</p>
          <span className="text-xs text-muted">Live</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-black text-dark">87,40</span>
          <span className="text-lg font-bold text-muted">€</span>
        </div>
        <p className="text-xs text-muted mt-1">Pour {state.tableCapacity} personnes · {state.convives.length} articles commandés</p>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="px-5 mt-6 pb-4 safe-bottom flex flex-col gap-3"
      >
        <Button variant="brand" onClick={() => navigate('/profile')}>
          Je rejoins la table →
        </Button>
        <Button variant="ghost" onClick={handleScanQR}>
          Scanner un autre QR code
        </Button>
      </motion.div>
    </motion.div>
  )
}

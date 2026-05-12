import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { MenuModal } from '../components/features/MenuModal'
import { pageVariants } from '../utils/animations'
import { MENU_ITEMS } from '../data/menu'
import { formatEur } from '../utils/formatCurrency'

// Items already on the table (those with takenBy set + some free ones)
const TABLE_ITEMS = MENU_ITEMS.filter(item =>
  ['e1', 'e2', 'p1', 'p2', 'b1', 'b2'].includes(item.id)
)

export function Table() {
  const { state } = useSession()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const tableTotal = TABLE_ITEMS.reduce((sum, item) => sum + item.price, 0)

  // Build user convive entry
  const me = {
    id: 'me',
    name: state.userName,
    avatarIndex: state.userAvatarIndex,
    color: '#E8920A',
  }

  const allConvives = [me, ...state.convives]

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col min-h-full bg-bg"
    >
      {/* Top bar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 py-4"
        style={{ background: '#18181B' }}
      >
        <h1 className="text-white font-black text-lg">Table {state.tableNumber}</h1>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
        >
          ⋯
        </button>
      </div>

      {/* Convives row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-5 py-4 bg-white border-b border-border"
      >
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          À cette table
        </p>
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar">
          {allConvives.map((c, idx) => (
            <div key={c.id} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`rounded-full p-0.5 ${idx === 0 ? 'ring-2 ring-brand' : ''}`}
              >
                <Avatar index={c.avatarIndex} size="md" />
              </div>
              <span className={`text-[10px] font-semibold ${idx === 0 ? 'text-brand' : 'text-muted'}`}>
                {idx === 0 ? 'Toi' : c.name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bill card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mx-5 mt-5 bg-white rounded-2xl shadow-card overflow-hidden"
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: '#18181B' }}
        >
          <p className="text-white font-bold text-sm">Addition en cours</p>
          <span className="text-xs text-white/50">{TABLE_ITEMS.length} articles</span>
        </div>

        <div className="px-4 py-3 space-y-2">
          {TABLE_ITEMS.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{item.emoji}</span>
                <span className="text-sm text-dark truncate">{item.name}</span>
                {item.takenBy && (
                  <Avatar index={item.takenBy.avatarIndex} size="sm" />
                )}
              </div>
              <span className="text-sm font-semibold text-dark flex-shrink-0">
                {formatEur(item.price)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-border mx-4" />
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-dark">Total table</span>
          <span className="text-lg font-black text-dark">{formatEur(tableTotal)}</span>
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-5 mt-6 pb-8 safe-bottom flex flex-col gap-3"
      >
        <Button variant="brand" onClick={() => navigate('/items')}>
          Choisir mes articles
        </Button>
        <Button variant="ghost" onClick={() => setMenuOpen(true)}>
          Voir le menu
        </Button>
      </motion.div>

      <MenuModal open={menuOpen} onClose={() => setMenuOpen(false)} />
    </motion.div>
  )
}

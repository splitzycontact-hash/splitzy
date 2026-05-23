import { m, AnimatePresence } from 'framer-motion'
import { MENU_ITEMS } from '../../data/menu'
import { formatEur } from '../../utils/formatCurrency'

interface MenuModalProps {
  open: boolean
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  entrees: '🥗 Entrées',
  plats: '🍽 Plats',
  desserts: '🍮 Desserts',
  boissons: '🥤 Boissons',
}

const CATEGORIES = ['entrees', 'plats', 'desserts', 'boissons'] as const

export function MenuModal({ open, onClose }: MenuModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <m.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85dvh] overflow-hidden flex flex-col"
            style={{ maxWidth: 390, margin: '0 auto' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-bold text-dark">Menu complet</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-muted hover:text-dark"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {CATEGORIES.map(cat => (
                <div key={cat} className="mt-5">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="space-y-2">
                    {MENU_ITEMS.filter(i => i.category === cat).map(item => (
                      <div key={item.id} className="flex items-start gap-3 py-2">
                        <span className="text-xl flex-shrink-0">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-dark">{item.name}</p>
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>
                        </div>
                        <span className="text-sm font-bold text-dark flex-shrink-0">{formatEur(item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

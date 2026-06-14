import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ReportRange } from '../lib/reportPeriod'

interface PrintContextValue {
  // Ouvre le sélecteur de période (avant l'aperçu du rapport).
  openPrint: () => void
}

const PrintContext = createContext<PrintContextValue>({ openPrint: () => {} })

export function usePrint() {
  return useContext(PrintContext)
}

export function PrintProvider({ children, onOpen }: { children: ReactNode; onOpen: () => void }) {
  return (
    <PrintContext.Provider value={{ openPrint: onOpen }}>
      {children}
    </PrintContext.Provider>
  )
}

// État du flux d'impression : d'abord le sélecteur de période, puis l'aperçu du
// rapport avec la plage choisie. Fermer le sélecteur sans choisir = aucun rapport.
export function usePrintState() {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [range, setRange] = useState<ReportRange | null>(null)

  return {
    selectorOpen,
    range,
    reportOpen: range !== null,
    // Clic sur « Imprimer rapport » → ouvre le sélecteur.
    openSelector: () => setSelectorOpen(true),
    // Choix d'une période (raccourci ou custom confirmé) → ferme le sélecteur, ouvre l'aperçu.
    chooseRange: (r: ReportRange) => {
      setSelectorOpen(false)
      setRange(r)
    },
    // Ferme le sélecteur sans rien ouvrir.
    closeSelector: () => setSelectorOpen(false),
    // Ferme l'aperçu du rapport.
    closeReport: () => setRange(null),
  }
}

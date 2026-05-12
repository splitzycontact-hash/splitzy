import { createContext, useContext, useState, type ReactNode } from 'react'

interface PrintContextValue {
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

export function usePrintState() {
  const [isOpen, setIsOpen] = useState(false)
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}

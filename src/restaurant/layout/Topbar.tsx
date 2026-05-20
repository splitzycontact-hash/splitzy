import { Printer } from 'lucide-react'
import { usePrint } from '../context/PrintContext'

interface TopbarProps {
  title: string
  subtitle?: string
  live?: boolean
  right?: React.ReactNode
}

export function Topbar({ title, subtitle, live = false, right }: TopbarProps) {
  const { openPrint } = usePrint()

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-lg font-bold text-dark leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {right}
        {live && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-success bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live
          </span>
        )}
        <button
          onClick={openPrint}
          className="hidden md:flex items-center gap-2 text-sm font-medium text-mid border border-border rounded-lg px-3 py-1.5 hover:bg-bg transition-colors"
        >
          <Printer size={15} />
          Imprimer rapport
        </button>
      </div>
    </header>
  )
}

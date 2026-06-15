import { Printer } from 'lucide-react'
import { usePrint } from '../context/PrintContext'
import { StandaloneThemeToggle } from './StandaloneThemeToggle'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  live?: boolean
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, live = false, actions }: PageHeaderProps) {
  const { openPrint } = usePrint()

  return (
    <header
      className="flex items-start justify-between gap-6 px-9 pt-7 pb-6 shrink-0 border-b"
      style={{
        background: 'var(--ds-bg-surface)',
        borderColor: 'var(--ds-border)',
      }}
    >
      {/* Title block */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <h1
          className="font-extrabold leading-[1.1] tracking-[-0.035em]"
          style={{ fontSize: '28px', color: 'var(--ds-text-primary)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <div
            className="flex items-center gap-2.5 text-[13.5px]"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {actions}

        {live && (
          <span
            className="inline-flex items-center gap-[7px] px-2.5 py-[5px] rounded-full text-[12px] font-semibold border"
            style={{
              background: 'var(--ds-success-soft)',
              color: 'var(--ds-success-strong)',
              borderColor: '#C6F0D2',
            }}
          >
            <span className="relative w-[7px] h-[7px] rounded-full" style={{ background: 'var(--ds-success)' }}>
              <span
                className="absolute inset-[-3px] rounded-full opacity-40"
                style={{
                  background: 'var(--ds-success)',
                  animation: 'ds-live-pulse 1.6s ease-out infinite',
                }}
              />
            </span>
            Live
          </span>
        )}

        <button
          onClick={openPrint}
          className="hidden md:inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-[7px] h-8 rounded-lg border transition-colors"
          style={{
            background: 'var(--ds-bg-surface)',
            borderColor: 'var(--ds-border)',
            color: 'var(--ds-text-primary)',
            boxShadow: 'var(--ds-shadow-sm)',
          }}
        >
          <Printer size={14} />
          Imprimer rapport
        </button>

        {/* Theme toggle */}
        <StandaloneThemeToggle />
      </div>
    </header>
  )
}

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CalendarRange } from 'lucide-react'
import {
  buildRange,
  buildCustomRange,
  toDateInputValue,
  type PeriodKind,
  type ReportRange,
} from '../lib/reportPeriod'

interface Props {
  open: boolean
  onClose: () => void
  onChoose: (range: ReportRange) => void
}

const SHORTCUTS: { kind: Exclude<PeriodKind, 'custom'>; label: string; hint?: string }[] = [
  { kind: 'today',     label: "Aujourd'hui" },
  { kind: 'yesterday', label: 'Hier' },
  { kind: 'last7',     label: '7 derniers jours', hint: 'défaut' },
  { kind: 'last30',    label: '30 derniers jours' },
  { kind: 'thisMonth', label: 'Ce mois-ci' },
  { kind: 'lastMonth', label: 'Mois dernier' },
]

export function ReportPeriodSelector({ open, onClose, onChoose }: Props) {
  const todayMs = Date.now()
  const [customMode, setCustomMode] = useState(false)
  const [fromYmd, setFromYmd] = useState(() => toDateInputValue(todayMs - 6 * 86400000))
  const [toYmd, setToYmd] = useState(() => toDateInputValue(todayMs))
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const reset = () => {
    setCustomMode(false)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleShortcut = (kind: Exclude<PeriodKind, 'custom'>) => {
    reset()
    onChoose(buildRange(kind))
  }

  const handleCustomConfirm = () => {
    const range = buildCustomRange(fromYmd, toYmd)
    if (!range) {
      setError('Sélectionnez une date de début et une date de fin valides.')
      return
    }
    reset()
    onChoose(range)
  }

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        className="w-[420px] min-w-[min(380px,100%)] max-w-[calc(100vw-2rem)]"
        style={{
          background: 'var(--ds-bg-surface)', color: 'var(--ds-text-primary)',
          borderRadius: 16,
          boxShadow: '0 12px 48px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--ds-border)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Période du rapport</div>
            <div style={{ fontSize: 12.5, color: 'var(--ds-text-tertiary)', marginTop: 2 }}>
              Choisissez la plage à imprimer.
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Fermer"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ds-text-tertiary)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Raccourcis — boutons pleine largeur, 1 col mobile / 2 cols desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHORTCUTS.map(({ kind, label, hint }) => (
              <button
                key={kind}
                onClick={() => handleShortcut(kind)}
                className="flex items-center justify-between gap-2 w-full text-left rounded-xl px-4 py-4 sm:py-3 border cursor-pointer text-[13.5px] font-semibold transition-colors border-[color:var(--ds-border)] bg-[color:var(--ds-bg-base)] text-[color:var(--ds-text-primary)] hover:border-[#E8920A] hover:bg-[color:var(--ds-bg-subtle)]"
              >
                <span>{label}</span>
                {hint && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#FEF3C7] text-[#92400e]">
                    {hint}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Période personnalisée (option avancée) — bouton pleine largeur dessous */}
          <div style={{ marginTop: 14, borderTop: '1px dashed var(--ds-border)', paddingTop: 14 }}>
            {!customMode ? (
              <button
                onClick={() => { setCustomMode(true); setError(null) }}
                className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-4 sm:py-3 border cursor-pointer text-[13.5px] font-semibold transition-colors border-[color:var(--ds-border)] text-[color:var(--ds-text-secondary)] hover:border-[#E8920A] hover:bg-[color:var(--ds-bg-subtle)]"
              >
                <CalendarRange size={16} />
                Période personnalisée…
              </button>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: 'var(--ds-text-tertiary)' }}>
                    Du
                    <input
                      type="date"
                      value={fromYmd}
                      max={toYmd}
                      onChange={(e) => { setFromYmd(e.target.value); setError(null) }}
                      style={{
                        display: 'block', width: '100%', marginTop: 4, padding: '8px 10px',
                        borderRadius: 8, border: '1px solid var(--ds-border)',
                        background: 'var(--ds-bg-surface)', color: 'var(--ds-text-primary)',
                        fontSize: 14,
                      }}
                    />
                  </label>
                  <label style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: 'var(--ds-text-tertiary)' }}>
                    Au
                    <input
                      type="date"
                      value={toYmd}
                      min={fromYmd}
                      onChange={(e) => { setToYmd(e.target.value); setError(null) }}
                      style={{
                        display: 'block', width: '100%', marginTop: 4, padding: '8px 10px',
                        borderRadius: 8, border: '1px solid var(--ds-border)',
                        background: 'var(--ds-bg-surface)', color: 'var(--ds-text-primary)',
                        fontSize: 14,
                      }}
                    />
                  </label>
                </div>
                {error && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ds-error, #dc2626)' }}>{error}</div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button
                    onClick={() => { setCustomMode(false); setError(null) }}
                    style={{
                      flex: 1, padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
                      border: '1px solid var(--ds-border)', background: 'transparent',
                      color: 'var(--ds-text-secondary)', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleCustomConfirm}
                    style={{
                      flex: 1, padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
                      border: 'none', background: '#E8920A', color: 'white',
                      fontSize: 13, fontWeight: 700,
                    }}
                  >
                    Voir le rapport
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

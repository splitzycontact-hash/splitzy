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
        style={{
          background: 'var(--ds-bg-surface)', color: 'var(--ds-text-primary)',
          borderRadius: 16, width: 420, maxWidth: '100%',
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
          {/* Raccourcis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {SHORTCUTS.map(({ kind, label, hint }) => (
              <button
                key={kind}
                onClick={() => handleShortcut(kind)}
                style={{
                  textAlign: 'left', padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--ds-border)', background: 'var(--ds-bg-base)',
                  color: 'var(--ds-text-primary)', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 600, transition: 'border-color .15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#E8920A')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ds-border)')}
              >
                {label}
                {hint && (
                  <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: '#E8920A', textTransform: 'uppercase' }}>{hint}</span>
                )}
              </button>
            ))}
          </div>

          {/* Période personnalisée (option avancée) */}
          <div style={{ marginTop: 14, borderTop: '1px dashed var(--ds-border)', paddingTop: 14 }}>
            {!customMode ? (
              <button
                onClick={() => { setCustomMode(true); setError(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid var(--ds-border)', background: 'transparent',
                  color: 'var(--ds-text-secondary)', fontSize: 13.5, fontWeight: 600,
                }}
              >
                <CalendarRange size={15} />
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

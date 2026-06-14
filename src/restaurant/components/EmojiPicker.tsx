import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../context/ThemeContext'
import { EMOJI_SECTIONS } from '../lib/foodEmoji'

interface Props {
  anchorRef: React.RefObject<HTMLElement | null>
  value: string
  onSelect: (emoji: string) => void
  onClose: () => void
}

const WIDTH = 340
const MAX_H = 360

// Hover orange léger, injecté une fois (les styles inline ne gèrent pas :hover ;
// !important pour battre le background inline des cellules).
const HOVER_STYLE_ID = 'emoji-pick-hover-style'
function ensureHoverStyle() {
  if (typeof document === 'undefined' || document.getElementById(HOVER_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = HOVER_STYLE_ID
  el.textContent = '.emoji-pick-btn:hover{background:rgba(232,146,10,0.14)!important}'
  document.head.appendChild(el)
}

export function EmojiPicker({ anchorRef, value, onSelect, onClose }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    ensureHoverStyle()
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8))
    let top = r.bottom + 6
    if (top + MAX_H > window.innerHeight - 8) {
      top = Math.max(8, r.top - MAX_H - 6) // bascule au-dessus si pas la place
    }
    setPos({ top, left })
  }, [anchorRef])

  const C = dark
    ? { bg: '#18181B', text: '#FAFAFA', sub: '#A1A1AA', border: '#3F3F46' }
    : { bg: '#FFFFFF', text: '#0A0A0A', sub: '#71717A', border: '#E4E4E7' }

  return createPortal(
    // Overlay transparent plein écran : clic en dehors → ferme.
    <div className="fixed inset-0 z-[9999]" onClick={onClose}>
      {pos && (
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: WIDTH,
            maxHeight: MAX_H, overflowY: 'auto',
            background: C.bg, color: C.text, border: `1px solid ${C.border}`,
            borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', padding: 12,
          }}
        >
          {EMOJI_SECTIONS.map((sec) => (
            <div key={sec.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.sub, margin: '2px 2px 6px' }}>
                <span>{sec.icon}</span>{sec.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
                {sec.emojis.map((e) => {
                  const selected = e === value
                  return (
                    <button
                      key={e}
                      type="button"
                      className="emoji-pick-btn"
                      onClick={() => { onSelect(e); onClose() }}
                      title={e}
                      style={{
                        height: 34, borderRadius: 8, cursor: 'pointer',
                        fontSize: 22, lineHeight: '28px',
                        border: selected ? '1px solid #E8920A' : '1px solid transparent',
                        background: selected ? (dark ? 'rgba(232,146,10,0.20)' : '#FFF7ED') : 'transparent',
                      }}
                    >
                      {e}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}

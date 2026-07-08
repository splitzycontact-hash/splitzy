import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { IconArrowRight, IconCheck } from './Icons'

// ── Tiny inline icons ─────────────────────────────────────────
const IcoBack = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
)
const IcoChevR = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
)
const IcoLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
)
const IcoStar = ({ filled }: { filled: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? '#E8920A' : '#E4E4E7'}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
)

// ── Palette avatar colors ─────────────────────────────────────
const COLORS = ['#E8920A', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#14B8A6']
const GUESTS = [
  { initial: 'L', color: '#10B981', name: 'Léa' },
  { initial: 'M', color: '#3B82F6', name: 'Marc' },
  { initial: 'S', color: '#F43F5E', name: 'Sarah' },
]
const BILL_ITEMS = [
  { cat: 'Entrées',  name: 'Burrata',         price: 14.00 },
  { cat: 'Entrées',  name: 'Tartare de bœuf', price: 19.50 },
  { cat: 'Plats',    name: 'Saumon mi-cuit',  price: 22.00 },
  { cat: 'Plats',    name: 'Risotto cèpes',   price: 19.50 },
  { cat: 'Boissons', name: 'Verre de Chablis',price: 8.50  },
  { cat: 'Boissons', name: 'Coupe Champagne', price: 8.50  },
]
const TOTAL_BILL = BILL_ITEMS.reduce((s, i) => s + i.price, 0) // 91.50
const eur = (n: number) => n.toFixed(2).replace('.', ',') + ' €'

// ── Shared phone primitives ───────────────────────────────────
function Avatar({ color, initial, size = 32, dashed = false }: { color?: string; initial: string; size?: number; dashed?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: dashed ? 'transparent' : (color ?? '#E4E4E7'),
      border: dashed ? '1.5px dashed #D4D4D8' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
      boxShadow: color && !dashed ? 'inset 0 0 0 0.5px rgba(255,255,255,0.18)' : 'none',
    }}>
      {dashed ? '+' : initial}
    </div>
  )
}

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 12 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: 26, height: 3.5, borderRadius: 2, background: i < current ? '#E8920A' : '#E4E4E7', transition: 'background 0.2s' }} />
      ))}
    </div>
  )
}

function DarkTop({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', background: '#0A0A0A', padding: '16px 20px 18px', color: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,146,10,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

// ── Screen 1 — Welcome ────────────────────────────────────────
function ScreenWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA' }}>
      <DarkTop>
        <div style={{ fontSize: 10, color: '#A1A1AA', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)', display: 'inline-block' }} />
          Service en cours · Table 5
        </div>
        <div style={{ fontSize: 9.5, color: '#E8920A', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Bienvenue chez</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 4 }}>Bistrot de la Paix</div>
        <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>3 convives · 6 articles</div>
      </DarkTop>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Déjà à table</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {GUESTS.map((g) => (
            <div key={g.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Avatar color={g.color} initial={g.initial} size={34} />
              <span style={{ fontSize: 9.5, color: '#71717A', fontWeight: 500 }}>{g.name}</span>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <Avatar initial="+" size={34} dashed />
            <span style={{ fontSize: 9.5, color: '#71717A', fontWeight: 500 }}>Toi</span>
          </div>
        </div>
      </div>

      <div style={{ margin: '14px 16px 0', padding: 14, background: '#fff', borderRadius: 14, border: '1px solid #E4E4E7' }}>
        <div style={{ fontSize: 9.5, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Addition en cours</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em' }}>{Math.round(TOTAL_BILL)}&nbsp;€</span>
          <span style={{ fontSize: 10.5, color: '#71717A' }}>pour 4 pers.</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #E4E4E7', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#A1A1AA' }}>Dernier ajout · il y a 2 min</span>
          <span style={{ fontSize: 10, color: '#0A0A0A', fontWeight: 600 }}>Champagne</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '12px 16px 16px' }}>
        <button type="button" onClick={onNext} style={{ width: '100%', height: 46, borderRadius: 13, border: 0, background: '#E8920A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 8px 20px -6px rgba(232,146,10,0.55)' }}>
          Je rejoins la table <IcoChevR />
        </button>
      </div>
    </div>
  )
}

// ── Screen 2 — Profile ────────────────────────────────────────
function ScreenProfile({ onNext }: { onNext: () => void }) {
  const [color, setColor] = useState(COLORS[0])
  const [name, setName] = useState('')
  const initial = (name.trim()[0] ?? '').toUpperCase()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA' }}>
      <div style={{ padding: '14px 16px 2px' }}>
        <StepBar current={1} total={3} />
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Crée ton profil</div>
          <div style={{ fontSize: 10.5, color: '#71717A', marginTop: 2 }}>Étape 1 · Aucune inscription</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <m.div animate={{ scale: name ? 1 : 0.94 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }} style={{ width: 64, height: 64, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, boxShadow: `0 8px 20px -6px ${color}77` }}>
          {initial || <span style={{ fontSize: 14, opacity: 0.5 }}>?</span>}
        </m.div>
      </div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Couleur</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: c, border: color === c ? `2.5px solid #0A0A0A` : '2.5px solid transparent', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none', transition: 'all 0.15s' }} />
            </button>
          ))}
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Prénom</div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice" style={{ width: '100%', height: 36, borderRadius: 10, border: '1.5px solid #E4E4E7', padding: '0 12px', fontSize: 13, fontWeight: 500, color: '#0A0A0A', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ padding: '12px 16px 16px' }}>
        <button type="button" onClick={onNext} disabled={name.trim().length < 2} style={{ width: '100%', height: 44, borderRadius: 13, border: 0, background: name.trim().length >= 2 ? '#E8920A' : '#E4E4E7', color: name.trim().length >= 2 ? '#fff' : '#A1A1AA', fontSize: 13, fontWeight: 700, cursor: name.trim().length >= 2 ? 'pointer' : 'default', boxShadow: name.trim().length >= 2 ? '0 8px 20px -6px rgba(232,146,10,0.5)' : 'none', transition: 'all 0.2s' }}>
          Continuer
        </button>
      </div>
    </div>
  )
}

// ── Screen 3 — Items / Partage ────────────────────────────────
function ScreenItems({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState<'item' | 'split' | 'free'>('split')
  const [people, setPeople] = useState(4)
  const [picks, setPicks] = useState<Set<number>>(new Set())
  const part = mode === 'split' ? TOTAL_BILL / people
    : mode === 'item' ? [...picks].reduce((s, i) => s + BILL_ITEMS[i].price, 0)
    : 20

  const tabs = [
    { id: 'item' as const,  label: 'Par article' },
    { id: 'split' as const, label: 'Parts égales' },
    { id: 'free' as const,  label: 'Montant libre' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA' }}>
      <div style={{ padding: '12px 16px 2px' }}>
        <StepBar current={2} total={3} />
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em', marginBottom: 10 }}>Mes articles</div>
        <div style={{ background: '#F1F1F2', borderRadius: 10, padding: 3, display: 'flex' }}>
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setMode(t.id)} style={{ flex: 1, height: 28, borderRadius: 8, border: 0, background: mode === t.id ? '#fff' : 'transparent', color: mode === t.id ? '#0A0A0A' : '#71717A', fontSize: 10, fontWeight: 600, cursor: 'pointer', boxShadow: mode === t.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'item' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 0' }}>
          {BILL_ITEMS.map((it, idx) => {
            const sel = picks.has(idx)
            return (
              <button key={idx} type="button" onClick={() => setPicks((s) => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: `1.5px solid ${sel ? '#E8920A' : '#E4E4E7'}`, background: sel ? '#FFF4E5' : '#fff', marginBottom: 6, cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${sel ? '#E8920A' : '#D4D4D8'}`, background: sel ? '#E8920A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sel && <IconCheck size={11} stroke={2.5} />}
                </div>
                <span style={{ flex: 1, fontSize: 11.5, fontWeight: 500, color: '#0A0A0A', textAlign: 'left' }}>{it.name}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: sel ? '#E8920A' : '#0A0A0A', whiteSpace: 'nowrap' }}>{eur(it.price)}</span>
              </button>
            )
          })}
        </div>
      )}

      {mode === 'split' && (
        <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E4E7', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 9.5, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total de la table</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em', marginTop: 4 }}>{eur(TOTAL_BILL)}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '10px 12px', background: '#FAFAFA', borderRadius: 10 }}>
              <button type="button" onClick={() => setPeople(Math.max(2, people - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E4E4E7', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#0A0A0A' }}>−</button>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.03em' }}>{people}</span>
              <button type="button" onClick={() => setPeople(Math.min(12, people + 1))} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E4E4E7', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#0A0A0A' }}>+</button>
            </div>
          </div>
          <div style={{ background: '#FFF4E5', border: '1px solid rgba(232,146,10,0.2)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#E8920A', fontWeight: 700 }}>Ta part</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#E8920A', letterSpacing: '-0.03em' }}>{eur(TOTAL_BILL / people)}</span>
          </div>
        </div>
      )}

      {mode === 'free' && (
        <div style={{ flex: 1, padding: '12px 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E4E4E7', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 9.5, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Je paie le montant de mon choix</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.04em' }}>20</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#E8920A' }}>€</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {[10, 20, 30, 50].map((v) => (
                <button key={v} type="button" style={{ flex: 1, height: 32, borderRadius: 8, border: `1px solid ${v === 20 ? '#E8920A' : '#E4E4E7'}`, background: v === 20 ? '#FFF4E5' : '#fff', color: v === 20 ? '#E8920A' : '#0A0A0A', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{v}€</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '10px 16px 16px' }}>
        <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9.5, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ma part</div>
            <div style={{ fontSize: 10, color: '#A1A1AA', marginTop: 1 }}>{mode === 'split' ? `1 sur ${people}` : mode === 'item' ? `${picks.size} article(s)` : 'Libre'}</div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' }}>{eur(part)}</span>
        </div>
        <button type="button" onClick={onNext} style={{ width: '100%', height: 44, borderRadius: 13, border: 0, background: '#E8920A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(232,146,10,0.5)' }}>
          Valider ma part <IcoChevR />
        </button>
      </div>
    </div>
  )
}

// ── Screen 4 — Tip ────────────────────────────────────────────
function ScreenTip({ onNext }: { onNext: () => void }) {
  const [pct, setPct] = useState(10)
  const amount = TOTAL_BILL / 4
  const tip = amount * pct / 100
  const total = amount + tip
  const message = pct === 0 ? 'Aucun pourboire' : pct <= 10 ? 'Geste sympa' : pct <= 15 ? 'Très généreux' : 'Super généreux !'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA' }}>
      <div style={{ padding: '12px 16px 2px' }}>
        <StepBar current={3} total={3} />
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.01em', marginBottom: 14 }}>Pourboire</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 14px' }}>
        <div style={{ fontSize: 9.5, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Pour l'équipe</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#E8920A', letterSpacing: '-0.04em' }}>{eur(tip)}</div>
        <div style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{pct}% · {message}</div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <input type="range" min="0" max="30" step="1" value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ width: '100%', accentColor: '#E8920A', height: 28, cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#A1A1AA', fontWeight: 600, marginTop: 2 }}>
          <span>0 %</span><span style={{ color: '#E8920A' }}>{pct} %</span><span>30 %</span>
        </div>
      </div>

      <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6 }}>
        {[0, 10, 15, 20].map((v) => (
          <button key={v} type="button" onClick={() => setPct(v)} style={{ flex: 1, height: 34, borderRadius: 10, border: `1.5px solid ${pct === v ? '#E8920A' : '#E4E4E7'}`, background: pct === v ? '#E8920A' : '#fff', color: pct === v ? '#fff' : '#0A0A0A', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{v === 0 ? 'Aucun' : `${v} %`}</button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: 14, padding: '4px 14px' }}>
          {[{ label: 'Ma part', val: eur(amount), color: '#0A0A0A' }, { label: '+ Pourboire', val: `+ ${eur(tip)}`, color: '#E8920A' }].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #E4E4E7' }}>
              <span style={{ fontSize: 12, color: '#71717A' }}>{row.label}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: row.color }}>{row.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0A0A0A' }}>À payer</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em' }}>{eur(total)}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '10px 16px 16px' }}>
        <button type="button" onClick={onNext} style={{ width: '100%', height: 44, borderRadius: 13, border: 0, background: '#E8920A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(232,146,10,0.5)' }}>
          Payer {eur(total)}
        </button>
      </div>
    </div>
  )
}

// ── Screen 5 — Payment ────────────────────────────────────────
function ScreenPayment({ onNext }: { onNext: () => void }) {
  const [sel, setSel] = useState<'visa' | 'mc'>('visa')
  const [loading, setLoading] = useState(false)
  const cards = [
    { id: 'visa' as const, brand: 'Visa',       last: '4321', from: '#3B0764', to: '#581C87' },
    { id: 'mc'   as const, brand: 'Mastercard', last: '9087', from: '#1E3A8A', to: '#1E40AF' },
  ]
  const pay = () => { setLoading(true); setTimeout(onNext, 1200) }
  const total = eur(TOTAL_BILL / 4 * 1.1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA' }}>
      <DarkTop>
        <div style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Tu paies</div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
          {(TOTAL_BILL / 4 * 1.1).toFixed(2).replace('.', ',')}<span style={{ color: '#E8920A' }}>€</span>
        </div>
        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 10, color: '#A1A1AA' }}>
          <IcoLock /> Paiement sécurisé 3D Secure
        </div>
      </DarkTop>

      <div style={{ padding: '14px 16px 0', flex: 1 }}>
        <div style={{ fontSize: 9.5, color: '#71717A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Mes cartes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {cards.map((c) => (
            <button key={c.id} type="button" onClick={() => setSel(c.id)} style={{ border: `2px solid ${sel === c.id ? '#E8920A' : '#E4E4E7'}`, borderRadius: 14, padding: 0, cursor: 'pointer', background: 'transparent', transition: 'border-color 0.15s', overflow: 'hidden' }}>
              <div style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})`, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{c.brand}</div>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, letterSpacing: '0.06em', marginTop: 2 }}>•••• {c.last}</div>
                </div>
                {sel === c.id && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E8920A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
          {['Apple Pay', 'Google Pay'].map((label) => (
            <button key={label} type="button" style={{ height: 38, borderRadius: 11, border: '1px solid #E4E4E7', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0A0A0A' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 16px 16px' }}>
        <button type="button" onClick={pay} disabled={loading} style={{ width: '100%', height: 44, borderRadius: 13, border: 0, background: '#E8920A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 8px 20px -6px rgba(232,146,10,0.5)' }}>
          {loading ? <><m.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Traitement…</> : <>Payer {total}</>}
        </button>
      </div>
    </div>
  )
}

// ── Screen 6 — Confirmation + Feedback ───────────────────────
function ScreenFeedback({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<'confirm' | 'feedback'>('confirm')
  const [stars, setStars] = useState(0)
  const [chips, setChips] = useState<Set<string>>(new Set())
  const CHIPS = ['Super ambiance', 'Serveur top', 'Rapport qualité-prix', 'On reviendra', 'Service lent', 'Trop bruyant']

  if (phase === 'confirm') return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
      <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }} style={{ width: 52, height: 52, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 10px 26px -6px rgba(16,185,129,0.5)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </m.div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Paiement confirmé</div>
      <div style={{ fontSize: 12, color: '#71717A', marginTop: 6, lineHeight: 1.5 }}>Merci pour ton repas chez<br /><strong style={{ color: '#0A0A0A' }}>Bistrot de la Paix</strong></div>
      <button type="button" onClick={() => setPhase('feedback')} style={{ marginTop: 22, height: 44, width: '100%', maxWidth: 200, borderRadius: 13, border: 0, background: '#E8920A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(232,146,10,0.5)' }}>
        Donner mon avis
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA' }}>
      <DarkTop>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8920A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Comment s'est passée<br />ta soirée ?</div>
        <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 4 }}>Bistrot de la Paix</div>
      </DarkTop>

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ padding: 12, borderRadius: 12, background: '#FFF4E5', border: '1px solid rgba(232,146,10,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <IcoLock />
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0A0A0A' }}>Ton avis reste privé</div>
            <div style={{ fontSize: 10, color: '#71717A' }}>Jamais publié sur Google</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ background: '#fff', border: '1px solid #E4E4E7', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0A0A0A', marginBottom: 10 }}>Ton expérience globale</div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[1,2,3,4,5].map((n) => (
              <m.button key={n} type="button" onClick={() => setStars(n)} whileTap={{ scale: 0.85 }} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2 }}>
                <IcoStar filled={n <= stars} />
              </m.button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 16px 0', flex: 1 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ce qui t'a marqué</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {CHIPS.map((c) => {
            const sel = chips.has(c)
            return (
              <button key={c} type="button" onClick={() => setChips((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n })} style={{ padding: '5px 9px', borderRadius: 999, border: `1.5px solid ${sel ? '#E8920A' : '#E4E4E7'}`, background: sel ? '#FFF4E5' : '#fff', color: sel ? '#E8920A' : '#0A0A0A', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>
                {c}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '10px 16px 16px' }}>
        <button type="button" onClick={onNext} disabled={stars === 0} style={{ width: '100%', height: 44, borderRadius: 13, border: 0, background: stars > 0 ? '#E8920A' : '#E4E4E7', color: stars > 0 ? '#fff' : '#A1A1AA', fontSize: 13, fontWeight: 700, cursor: stars > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }}>
          Envoyer mon avis
        </button>
      </div>
    </div>
  )
}

// ── Screen 7 — Avis envoyé ────────────────────────────────────
function ScreenDone() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAFA', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} style={{ width: 56, height: 56, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 10px 28px -6px rgba(16,185,129,0.5)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </m.div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Merci pour ton retour</div>
      <div style={{ fontSize: 12, color: '#71717A', marginTop: 6, lineHeight: 1.55 }}>
        Bistrot de la Paix lira ton avis<br />demain matin. Il reste privé.
      </div>
    </div>
  )
}

// ── Phone shell ───────────────────────────────────────────────
function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: 300, height: 600 }} aria-hidden="true">
      {/* outer frame */}
      <div className="absolute inset-0 rounded-[44px] bg-ink-900" style={{ boxShadow: '0 40px 80px -16px rgba(232,146,10,0.35), 0 24px 48px -24px rgba(0,0,0,0.7), inset 0 0 0 1.5px rgba(255,255,255,0.07)' }} />
      {/* side buttons */}
      <div className="absolute -left-[1px] top-[90px] h-[32px] w-[2px] bg-white/10 rounded-full" />
      <div className="absolute -left-[1px] top-[136px] h-[52px] w-[2px] bg-white/10 rounded-full" />
      <div className="absolute -right-[1px] top-[110px] h-[64px] w-[2px] bg-white/10 rounded-full" />
      {/* screen */}
      <div className="absolute inset-[9px] rounded-[36px] bg-white overflow-hidden flex flex-col">
        {/* status bar */}
        <div className="h-9 px-5 flex items-center justify-between text-[11px] font-semibold text-ink-900 shrink-0">
          <span className="font-mono">9:41</span>
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-[90px] h-[22px] bg-ink-900 rounded-full" />
          <div className="flex items-center gap-1 opacity-80">
            <svg width="13" height="9" viewBox="0 0 16 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="4.5" y="5" width="3" height="6" rx="0.5"/><rect x="9" y="3" width="3" height="8" rx="0.5"/><rect x="13.5" y="0" width="3" height="11" rx="0.5"/></svg>
            <div className="w-5 h-2.5 rounded-[2.5px] border border-ink-900/80 relative ml-0.5"><div className="absolute inset-[1px] right-[2.5px] bg-ink-900 rounded-[1px]"/></div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Step definition ───────────────────────────────────────────
const STEPS = [
  { label: 'Bienvenue',     sub: 'QR code scanné, table rejointe' },
  { label: 'Profil',        sub: 'Identité légère, aucune inscription' },
  { label: 'Partage',       sub: 'Par article, parts égales ou libre' },
  { label: 'Pourboire',     sub: 'Slider interactif, équipe remerciée' },
  { label: 'Paiement',      sub: 'Carte, Apple Pay, Google Pay' },
  { label: 'Avis privé',    sub: 'Étoiles + chips, jamais sur Google' },
  { label: 'Terminé',       sub: 'En moins de 90 secondes chrono' },
]

// ── Features strip ────────────────────────────────────────────
const FEATURES = [
  { icon: '⚡', title: 'Aucune app', desc: 'Un QR code, un navigateur. Zéro téléchargement pour le client.' },
  { icon: '🔀', title: '3 modes de partage', desc: 'Par article avec fractions, parts égales, ou montant libre.' },
  { icon: '⭐', title: 'Avis privé', desc: 'Les avis négatifs arrivent chez vous, pas sur Google.' },
  { icon: '💳', title: 'Stripe sécurisé', desc: 'Apple Pay, Google Pay, 3D Secure. Encaissement en temps réel.' },
]

// ── Page ─────────────────────────────────────────────────────
export function PaymentPage() {
  const [step, setStep] = useState(0)

  const screens = [
    (onNext: () => void) => <ScreenWelcome onNext={onNext} />,
    (onNext: () => void) => <ScreenProfile onNext={onNext} />,
    (onNext: () => void) => <ScreenItems   onNext={onNext} />,
    (onNext: () => void) => <ScreenTip     onNext={onNext} />,
    (onNext: () => void) => <ScreenPayment onNext={onNext} />,
    (onNext: () => void) => <ScreenFeedback onNext={onNext} />,
    (_onNext: () => void) => <ScreenDone />,
  ]
  const total = screens.length
  const prev = () => setStep((s) => Math.max(0, s - 1))
  const next = () => setStep((s) => Math.min(total - 1, s + 1))

  return (
    <div className="marketing-site w-full min-h-screen bg-ink-900">
      <Navbar />

      {/* Hero + phone */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-24 md:pb-20 px-4">
        {/* grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 70%)' }} />
        {/* orange glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,146,10,0.22) 0%, transparent 65%)' }} />

        <div className="relative max-w-6xl mx-auto">
          {/* headline */}
          <div className="text-center mb-14 md:mb-16">
            <m.span
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-600/10 text-orange-400 text-[11.5px] font-bold tracking-widest uppercase mb-5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(232,146,10,0.25)]" />
              Expérience client
            </m.span>
            <m.h1
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
              className="text-[38px] sm:text-[48px] md:text-[60px] font-extrabold text-white tracking-[-0.04em] leading-[1.02] mb-4"
            >
              Du QR à l'avis privé,<br className="hidden sm:inline" />
              {' '}en <span className="text-orange-500">moins de 90 s</span>.
            </m.h1>
            <m.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
              className="text-[15px] md:text-[17px] text-white/55 max-w-lg mx-auto leading-relaxed"
            >
              Identité légère, partage fractionnel, et un avis qui n'arrive jamais sur Google quand ça coince.
            </m.p>
          </div>

          {/* phone + nav layout */}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
            {/* left label (desktop) */}
            <div className="hidden lg:flex flex-col items-end gap-1.5 w-52 shrink-0">
              <div className="text-right">
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-1">Étape {step + 1}/{total}</p>
                <p className="text-[18px] font-extrabold text-white tracking-tight leading-tight">{STEPS[step].label}</p>
                <p className="text-[13px] text-white/50 mt-1 leading-snug">{STEPS[step].sub}</p>
              </div>
            </div>

            {/* phone */}
            <div className="shrink-0">
              <PhoneShell>
                <AnimatePresence mode="wait">
                  <m.div
                    key={step}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.2 }}
                    style={{ height: '100%' }}
                  >
                    {screens[step](next)}
                  </m.div>
                </AnimatePresence>
              </PhoneShell>
            </div>

            {/* right nav (desktop) */}
            <div className="hidden lg:flex flex-col gap-2 w-52 shrink-0">
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border transition-all text-sm ${
                    i === step
                      ? 'bg-orange-600/10 border-orange-600/30 text-orange-400 font-semibold'
                      : i < step
                      ? 'border-white/[0.04] text-white/40 font-medium hover:border-white/10'
                      : 'border-transparent text-white/30 font-medium hover:text-white/50'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-widest block mb-0.5 opacity-60">{String(i + 1).padStart(2, '0')}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* mobile step label */}
          <div className="lg:hidden text-center mt-6">
            <p className="text-[12px] font-bold text-white/40 uppercase tracking-[0.1em]">Étape {step + 1}/{total} · {STEPS[step].label}</p>
            <p className="text-[13px] text-white/50 mt-1">{STEPS[step].sub}</p>
          </div>

          {/* prev / next arrows */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:border-white/30 hover:text-white disabled:opacity-25 transition-all"
            >
              <IcoBack />
            </button>
            {/* dot indicators */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button key={i} type="button" onClick={() => setStep(i)} className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-orange-500' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              disabled={step === total - 1}
              className="w-11 h-11 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:border-white/30 hover:text-white disabled:opacity-25 transition-all"
            >
              <IcoChevR />
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-ink-800 border-t border-white/[0.06] py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[28px] md:text-[36px] font-extrabold text-white tracking-tight">Ce que vivent vos clients</h2>
            <p className="text-[14px] md:text-[15px] text-white/50 mt-2 max-w-sm mx-auto">Zéro friction du QR code à l'avis.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="text-[15px] font-bold text-white tracking-tight mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-white/50 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 md:px-6 bg-ink-900 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-[28px] md:text-[34px] font-extrabold text-white tracking-tight mb-3">Prêt à simplifier vos additions&nbsp;?</h2>
          <p className="text-[14px] md:text-[15px] text-white/50 mb-8">Installation en 15 minutes. Sans engagement.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/contact" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-orange-600/30 hover:-translate-y-0.5">
              Demander une démo <IconArrowRight size={16} />
            </a>
            <a href="/pricing" className="inline-flex items-center gap-2 border border-white/20 text-white/80 hover:text-white font-medium text-[14px] px-6 py-3.5 rounded-xl transition-colors hover:border-white/40">
              Voir les tarifs
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

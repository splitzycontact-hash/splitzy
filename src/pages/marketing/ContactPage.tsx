import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { IconArrowRight } from './Icons'

// ── Icons ──────────────────────────────────────────────────────
function IcMail({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
    </svg>
  )
}
function IcClock({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IcPin({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function IcChat({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  )
}
function IcCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
function IcShield({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
    </svg>
  )
}
function IcSparkle({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
    </svg>
  )
}
function IcChevDown({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── Subjects ───────────────────────────────────────────────────
const SUBJECTS = [
  { id: 'demo',    label: 'Demande de démo',     dot: '#E8920A', eta: '~ 24 h' },
  { id: 'support', label: 'Support technique',   dot: '#3B82F6', eta: '~ 4 h'  },
  { id: 'press',   label: 'Presse & médias',      dot: '#8B5CF6', eta: '~ 24 h' },
  { id: 'partner', label: 'Partenariat',           dot: '#10B981', eta: '~ 48 h' },
  { id: 'other',   label: 'Autre',                 dot: '#A1A1AA', eta: '~ 24 h' },
] as const

type SubjectId = typeof SUBJECTS[number]['id']

// ── SubjectSelect ──────────────────────────────────────────────
function SubjectSelect({ value, onChange }: { value: SubjectId; onChange: (v: SubjectId) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const cur = SUBJECTS.find((s) => s.id === value)!
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full h-11 px-3.5 rounded-[10px] border-[1.5px] bg-white text-ink-900 flex items-center justify-between text-[14px] font-medium transition-all ${open ? 'border-orange-600 shadow-[0_0_0_3px_rgba(232,146,10,0.15)]' : 'border-[#E4E4E7]'}`}
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cur.dot }} />
          {cur.label}
        </span>
        <IcChevDown className={`w-3.5 h-3.5 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white rounded-xl border border-[#E4E4E7] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.16)] p-1.5"
          >
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { onChange(s.id); setOpen(false) }}
                className={`w-full px-3 py-2.5 rounded-lg border-0 text-left flex items-center gap-2.5 text-[13.5px] font-medium transition-colors ${s.id === value ? 'bg-[#FAFAFA]' : 'hover:bg-[#FAFAFA]'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />
                <span className="flex-1">{s.label}</span>
                <span className="text-[11px] text-ink-400">{s.eta}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Form ───────────────────────────────────────────────────────
interface FormState {
  firstName: string; lastName: string; email: string
  restaurant: string; subject: SubjectId; message: string; consent: boolean
}
interface FormErrors { [k: string]: string }

function inputCls(err: boolean) {
  return `w-full h-11 px-3.5 rounded-[10px] border-[1.5px] bg-white text-ink-900 text-[14px] font-medium outline-none transition-all placeholder:text-ink-400 focus:border-orange-600 focus:shadow-[0_0_0_3px_rgba(232,146,10,0.15)] ${err ? 'border-red-500' : 'border-[#E4E4E7]'}`
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
    />
  )
}

function ContactForm({ onSent }: { onSent: (email: string) => void }) {
  const [form, setForm] = useState<FormState>({
    firstName: '', lastName: '', email: '',
    restaurant: '', subject: 'demo', message: '', consent: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const upd = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.firstName.trim()) e.firstName = 'Requis'
    if (!form.lastName.trim()) e.lastName = 'Requis'
    if (!form.email.match(/^[^@]+@[^@]+\.[a-z]{2,}$/i)) e.email = 'Email invalide'
    if (form.message.trim().length < 10) e.message = 'Au moins 10 caractères'
    if (!form.consent) e.consent = 'Requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setState('sending')
    setTimeout(() => { setState('sent'); onSent(form.email) }, 1100)
  }

  const subj = SUBJECTS.find((s) => s.id === form.subject)!

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-[#E4E4E7] rounded-3xl p-6 md:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_12px_32px_-16px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-extrabold text-ink-900 tracking-tight">Envoyez-nous un message</h2>
          <p className="text-[13.5px] text-ink-500 mt-1">On le lit. On vous répond. Promis.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold tracking-wide shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
          ONLINE
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-900">Prénom <span className="text-orange-600">*</span></span>
            <input value={form.firstName} onChange={(e) => upd('firstName', e.target.value)} placeholder="Marin" className={inputCls(!!errors.firstName)} />
            {errors.firstName && <span className="text-[11.5px] text-red-500">{errors.firstName}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-900">Nom <span className="text-orange-600">*</span></span>
            <input value={form.lastName} onChange={(e) => upd('lastName', e.target.value)} placeholder="Lefèvre" className={inputCls(!!errors.lastName)} />
            {errors.lastName && <span className="text-[11.5px] text-red-500">{errors.lastName}</span>}
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-900">Email professionnel <span className="text-orange-600">*</span></span>
          <input type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} placeholder="marin@bistrot-paix.fr" className={inputCls(!!errors.email)} />
          {errors.email && <span className="text-[11.5px] text-red-500">{errors.email}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-[13px] font-semibold text-ink-900">Nom du restaurant</span>
            <span className="text-[11.5px] text-ink-400">Optionnel</span>
          </div>
          <input value={form.restaurant} onChange={(e) => upd('restaurant', e.target.value)} placeholder="Bistrot de la Paix" className={inputCls(false)} />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-900">Sujet <span className="text-orange-600">*</span></span>
          <SubjectSelect value={form.subject} onChange={(v) => upd('subject', v)} />
        </div>

        <label className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-[13px] font-semibold text-ink-900">Message <span className="text-orange-600">*</span></span>
            <span className="text-[11.5px] text-ink-400 tabular-nums">{form.message.length}/1000</span>
          </div>
          <textarea
            value={form.message}
            onChange={(e) => upd('message', e.target.value.slice(0, 1000))}
            rows={5}
            placeholder={
              subj.id === 'demo' ? "Dites-nous : nombre de tables, type d'établissement, et quand on peut vous appeler." :
              subj.id === 'support' ? "Décrivez le problème, l'écran et ce que vous attendiez." :
              'Votre message…'
            }
            className={`w-full px-3.5 py-3.5 rounded-[10px] border-[1.5px] bg-white text-ink-900 text-[14px] font-medium outline-none transition-all resize-y min-h-[120px] placeholder:text-ink-400 focus:border-orange-600 focus:shadow-[0_0_0_3px_rgba(232,146,10,0.15)] ${errors.message ? 'border-red-500' : 'border-[#E4E4E7]'}`}
          />
          {errors.message && <span className="text-[11.5px] text-red-500">{errors.message}</span>}
        </label>

        {/* RGPD */}
        <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${errors.consent ? 'bg-red-50 border border-red-300' : 'bg-[#FAFAFA] border border-[#E4E4E7]'}`}>
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => upd('consent', e.target.checked)}
            className="w-[18px] h-[18px] mt-0.5 shrink-0 accent-orange-600 cursor-pointer"
          />
          <span className="text-[12.5px] text-ink-500 leading-relaxed">
            J'accepte que Splitzy utilise mes données pour répondre à ma demande. Aucun démarchage commercial.{' '}
            <a href="/privacy" className="text-orange-600 underline">Confidentialité</a>
          </span>
        </label>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.985 }}
          disabled={state !== 'idle'}
          className={`h-[52px] rounded-xl border-0 text-white text-[15px] font-bold tracking-tight cursor-pointer flex items-center justify-center gap-2 transition-colors shadow-[0_10px_24px_-8px_rgba(232,146,10,0.45),inset_0_0_0_1px_rgba(255,255,255,0.12)] mt-1.5 ${state === 'sent' ? 'bg-emerald-500' : 'bg-orange-600 hover:bg-orange-700'} disabled:cursor-default`}
        >
          {state === 'idle'    && <><span>Envoyer le message</span><IconArrowRight size={16} /></>}
          {state === 'sending' && <><Spinner /><span>Envoi en cours…</span></>}
          {state === 'sent'    && <><IcCheck className="w-[16px] h-[16px]" /><span>Message envoyé</span></>}
        </motion.button>

        <p className="text-[11.5px] text-ink-400 text-center">
          Réponse sous <strong className="text-ink-900 font-semibold">24 h ouvrées</strong>. Aucune carte requise, aucun démarchage.
        </p>
      </div>
    </form>
  )
}

// ── Sidebar ────────────────────────────────────────────────────
function ContactSidebar() {
  const [chatHover, setChatHover] = useState(false)
  return (
    <aside className="flex flex-col gap-3.5">
      {/* Direct */}
      <div className="relative bg-ink-900 text-white rounded-2xl p-5 overflow-hidden">
        <div className="absolute top-[-60px] right-[-60px] w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,146,10,0.18) 0%, transparent 60%)' }} />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-600/15 text-orange-400 text-[10.5px] font-bold tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Direct
          </span>
          <a href="mailto:contact@splitzy.fr" className="flex items-center gap-2 text-[22px] font-bold text-white tracking-tight mt-2 no-underline hover:text-orange-400 transition-colors">
            <IcMail className="w-5 h-5 shrink-0" />
            contact@splitzy.fr
          </a>
          <p className="text-[13px] text-white/60 mt-1.5 flex items-center gap-1.5">
            <IcClock className="w-3.5 h-3.5" />
            Réponse sous 24 h ouvrées
          </p>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-[9px] bg-orange-50 text-orange-600 flex items-center justify-center">
            <IcPin className="w-4 h-4" />
          </div>
          <span className="text-[13px] font-bold text-ink-900">Localisation</span>
        </div>
        <p className="text-[14px] font-semibold text-ink-900 tracking-tight">Paris, France</p>
        <p className="text-[12.5px] text-ink-500 mt-0.5">11<sup>e</sup> arrondissement · Métro Bastille</p>
        <div className="mt-4 p-3.5 rounded-xl bg-[#FBF8F2] border border-[#E4E4E7] flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] bg-ink-900 text-white flex items-center justify-center text-[13px] font-extrabold tracking-tighter shrink-0">
            NI
          </div>
          <div>
            <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest">Incubé chez</p>
            <p className="text-[13.5px] font-bold text-ink-900 tracking-tight">NEOMA Incubator</p>
          </div>
        </div>
      </div>

      {/* Urgence */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[9px] bg-orange-50 text-orange-600 flex items-center justify-center">
            <IcChat className="w-4 h-4" />
          </div>
          <span className="text-[13px] font-bold text-ink-900">Urgence support</span>
        </div>
        <p className="text-[13.5px] text-ink-500 leading-relaxed">
          Un paiement bloqué, un client à votre table en ce moment ? Notre équipe répond en chat sous <strong className="text-ink-900 font-semibold">4 minutes</strong>.
        </p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onMouseEnter={() => setChatHover(true)}
          onMouseLeave={() => setChatHover(false)}
          className={`h-11 rounded-xl border-[1.5px] text-[13.5px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${chatHover ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-900 border-ink-900'}`}
        >
          Ouvrir le chat
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
        </motion.button>
      </div>

      {/* SLA pills */}
      <div className="grid grid-cols-3 gap-2.5">
        {[{ label: 'Démo', time: '< 24 h' }, { label: 'Support', time: '< 4 h' }, { label: 'Presse', time: '< 24 h' }].map((s) => (
          <div key={s.label} className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] text-center">
            <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-[14px] font-extrabold text-ink-900 tracking-tight mt-1">{s.time}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}

// ── FAQ ────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Combien coûte Splitzy ?', a: '0 € pour démarrer. 59 € ou 99 € HT/mois ensuite selon le plan. Pas de commission côté client.' },
  { q: "Comment fonctionne l'interception d'avis ?", a: "Quand un client donne 1-3 ★, il vous envoie un message privé au lieu d'un avis Google. Vous traitez le problème en interne." },
  { q: 'Faut-il installer une app ?', a: "Non. Vos clients scannent un QR code, c'est tout. Le navigateur fait le reste — aucun téléchargement requis." },
  { q: 'Combien de temps pour se lancer ?', a: "Moins de 15 minutes. Vous créez votre compte, on génère vos QR codes, vous les imprimez. C'est tout." },
]

function FaqTeaser() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="bg-[#FAFAFA] py-20 md:py-24 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 mb-8">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[11px] font-bold tracking-widest uppercase mb-3">FAQ</span>
            <h2 className="text-[32px] md:text-[36px] font-extrabold text-ink-900 tracking-tight leading-tight">
              Vous avez peut-être<br />déjà la réponse.
            </h2>
            <p className="text-[14.5px] text-ink-500 mt-2">On a réuni les 4 questions les plus fréquentes.</p>
          </div>
          <a href="/faq" className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-900 font-semibold no-underline px-4 py-2.5 rounded-full border border-[#E4E4E7] bg-white hover:bg-[#FAFAFA] transition-colors shrink-0">
            Toutes les questions <IconArrowRight size={13} />
          </a>
        </div>
        <div className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden">
          {FAQ_ITEMS.map((f, idx) => {
            const isOpen = open === idx
            return (
              <div key={idx} className={idx < FAQ_ITEMS.length - 1 ? 'border-b border-[#F1F1F2]' : ''}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="w-full px-5 md:px-[22px] py-5 border-0 bg-transparent cursor-pointer flex justify-between items-center gap-4 text-left"
                >
                  <span className="text-[15px] md:text-[15.5px] font-semibold text-ink-900 tracking-tight">{f.q}</span>
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-colors ${isOpen ? 'bg-orange-600 text-white' : 'bg-[#FAFAFA] text-ink-900'}`}>
                    <IcChevDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 md:px-[22px] pb-5 text-[14px] text-ink-500 leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── Toast (success notification) ──────────────────────────────
function SuccessToast({ email, onDismiss }: { email: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="fixed top-[76px] right-6 z-[100] flex items-center gap-3 px-4 py-3 bg-ink-900 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] min-w-[280px] border border-white/[0.08]"
    >
      <div className="w-[22px] h-[22px] rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <IcCheck className="w-3.5 h-3.5 text-white" />
      </div>
      <div>
        <p className="text-white text-[14px] font-medium">Message envoyé !</p>
        <p className="text-white/60 text-[12px] mt-0.5">Réponse sous 24 h à {email}</p>
      </div>
    </motion.div>
  )
}

// ── Page ───────────────────────────────────────────────────────
export function ContactPage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  return (
    <div className="marketing-site w-full min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-ink-900 text-white overflow-hidden py-24 md:py-28 px-4 md:px-6">
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 16px)' }} />
        <div className="absolute -top-[100px] -right-[80px] w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,146,10,0.22) 0%, transparent 60%)' }} />
        <div className="absolute -bottom-[120px] -left-[80px] w-[360px] h-[360px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,146,10,0.08) 0%, transparent 60%)' }} />
        <div className="max-w-6xl mx-auto relative text-center">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-600/10 text-orange-400 text-[11.5px] font-bold tracking-widest uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(232,146,10,0.22)]" />
            Contact
          </span>
          <h1 className="text-[48px] md:text-[64px] font-extrabold tracking-[-0.04em] leading-[1.02] mb-4">
            Parlons-<span className="text-orange-500">nous</span>.
          </h1>
          <p className="text-[16px] md:text-[17px] text-white/60 max-w-[520px] mx-auto leading-relaxed">
            Une question, une démo, un partenariat — on lit chaque message<br className="hidden md:inline" />
            {' '}et on répond en moins de <strong className="text-white font-semibold">24 h ouvrées</strong>.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-5 md:gap-7 mt-8 px-5 md:px-[22px] py-3.5 rounded-full bg-white/[0.025] border border-white/[0.06]">
            {[
              { Icon: IcClock,   label: 'Réponse 24h' },
              { Icon: IcShield,  label: 'RGPD compliant' },
              { Icon: IcSparkle, label: 'Sans démarchage' },
            ].map(({ Icon, label }, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-white/70 text-[12.5px] font-medium whitespace-nowrap">
                <Icon className="w-3.5 h-3.5 text-orange-500" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Form + sidebar */}
      <section className="bg-white py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-7 items-start">
            <ContactForm onSent={(email) => setSentEmail(email)} />
            <ContactSidebar />
          </div>
        </div>
      </section>

      <FaqTeaser />
      <Footer />

      {/* Toast */}
      <AnimatePresence>
        {sentEmail && <SuccessToast email={sentEmail} onDismiss={() => setSentEmail(null)} />}
      </AnimatePresence>
    </div>
  )
}

import { useState, type ElementType } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from 'convex/react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { BlurFade } from '../components/ui/BlurFade'
import { Skeleton } from '../../components/ui/skeleton'
import {
  LifeBuoy, Plus, Send, ChevronRight, Clock, CheckCircle2, AlertCircle, MessageSquare,
} from 'lucide-react'

type Ticket = {
  _id: Id<'tickets'>
  _creationTime: number
  subject: string
  status: string
  priority: string
  restaurantId?: Id<'restaurants'>
  createdBy?: Id<'users'>
}

type TicketMessage = {
  _id: Id<'ticketMessages'>
  _creationTime: number
  ticketId: Id<'tickets'>
  authorId?: Id<'users'>
  body: string
  isInternal?: boolean
  isAdminReply?: boolean
}

// Statuts backend → libellé FR + couleur + icône.
const STATUS: Record<string, { label: string; color: string; bg: string; Icon: ElementType }> = {
  new:              { label: 'Nouveau',    color: '#B45309', bg: 'rgba(232,146,10,0.12)', Icon: AlertCircle },
  in_progress:      { label: 'En cours',   color: '#1D4ED8', bg: 'rgba(59,130,246,0.12)', Icon: Clock },
  waiting_customer: { label: 'En attente', color: '#B45309', bg: 'rgba(232,146,10,0.12)', Icon: Clock },
  resolved:         { label: 'Résolu',     color: '#15803D', bg: 'rgba(34,197,94,0.12)',  Icon: CheckCircle2 },
  closed:           { label: 'Fermé',      color: '#52525B', bg: 'var(--ds-bg-subtle)',   Icon: CheckCircle2 },
}

function statusInfo(status: string) {
  return STATUS[status] ?? { label: status, color: '#52525B', bg: 'var(--ds-bg-subtle)', Icon: MessageSquare }
}

// Priorités → libellé FR + couleur.
const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: 'Basse',   color: '#52525B', bg: 'var(--ds-bg-subtle)' },
  normal: { label: 'Normale', color: '#52525B', bg: 'var(--ds-bg-subtle)' },
  high:   { label: 'Haute',   color: '#B45309', bg: 'rgba(232,146,10,0.12)' },
  urgent: { label: 'Urgente', color: '#DC2626', bg: 'rgba(239,68,68,0.12)' },
}

function priorityInfo(priority: string) {
  return PRIORITY[priority] ?? PRIORITY.normal
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  return `il y a ${months} mois`
}

export function SupportPage() {
  const rawTickets = useQuery(api.tickets.listMyTickets, {})
  const createTicket = useMutation(api.tickets.createFromDashboard)
  const reply = useMutation(api.tickets.replyFromDashboard)

  const tickets = (rawTickets as Ticket[] | undefined) ?? []
  const loading = rawTickets === undefined

  const [selectedId, setSelectedId] = useState<Id<'tickets'> | null>(null)
  const selected = tickets.find(t => t._id === selectedId) ?? null

  // --- Nouveau ticket (dialog) ---
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    const s = subject.trim()
    const b = body.trim()
    if (!s || !b || creating) return
    setCreating(true)
    try {
      const id = await createTicket({ subject: s, body: b, priority })
      toast.success('Ticket créé — notre équipe vous répondra rapidement.')
      setDialogOpen(false)
      setSubject('')
      setBody('')
      setPriority('normal')
      setSelectedId(id as Id<'tickets'>)
    } catch {
      toast.error("Impossible de créer le ticket. Réessayez.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <RestaurantLayout>
      <PageHeader
        title="Support"
        subtitle={<span>Assistance Splitzy · Vos tickets</span>}
        actions={
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--ds-accent)' }}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nouveau ticket</span>
          </button>
        }
      />

      <div className="px-4 py-5 md:px-9 md:py-6">
        <AnimatePresence mode="wait">
          {selected ? (
            <ThreadView
              key={selected._id}
              ticket={selected}
              onBack={() => setSelectedId(null)}
              onReply={async (text) => { await reply({ ticketId: selected._id, body: text }) }}
            />
          ) : (
            <m.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[104px] rounded-2xl" />
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <EmptyState onCreate={() => setDialogOpen(true)} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {tickets.map((t, i) => (
                    <BlurFade key={t._id} delay={i * 0.04}>
                      <TicketCard ticket={t} onClick={() => setSelectedId(t._id)} />
                    </BlurFade>
                  ))}
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <NewTicketDialog
        open={dialogOpen}
        onClose={() => { if (!creating) setDialogOpen(false) }}
        subject={subject}
        setSubject={setSubject}
        body={body}
        setBody={setBody}
        priority={priority}
        setPriority={setPriority}
        creating={creating}
        onSubmit={handleCreate}
      />
    </RestaurantLayout>
  )
}

// --- Carte ticket (vue liste) ---
function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const st = statusInfo(ticket.status)
  const pr = priorityInfo(ticket.priority)
  return (
    <button
      onClick={onClick}
      className="ds-panel w-full text-left p-4 flex flex-col gap-3 transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.07)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2 py-[3px] rounded-full"
          style={{ background: st.bg, color: st.color }}
        >
          <st.Icon size={12} />
          {st.label}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-[3px] rounded-full"
          style={{ background: pr.bg, color: pr.color }}
        >
          {pr.label}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-[14.5px] ds-text-primary leading-snug line-clamp-2">{ticket.subject}</p>
        <ChevronRight size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }} />
      </div>

      <div className="flex items-center gap-1.5 text-[12px] ds-text-tertiary">
        <Clock size={12} />
        {timeAgo(ticket._creationTime)}
      </div>
    </button>
  )
}

// --- Vue thread (slide-in droite) ---
function ThreadView({
  ticket, onBack, onReply,
}: { ticket: Ticket; onBack: () => void; onReply: (text: string) => Promise<void> }) {
  const rawMessages = useQuery(api.tickets.listMyMessages, { ticketId: ticket._id })
  const messages = (rawMessages as TicketMessage[] | undefined) ?? []
  const loading = rawMessages === undefined

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const st = statusInfo(ticket.status)

  async function handleSend() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await onReply(t)
      setText('')
    } catch {
      toast.error("Envoi impossible. Réessayez.")
    } finally {
      setSending(false)
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="ds-panel overflow-hidden flex flex-col"
      style={{ maxWidth: 760 }}
    >
      {/* Header thread */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
        <button
          onClick={onBack}
          aria-label="Retour"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:ds-bg-subtle shrink-0"
        >
          <ChevronRight size={18} style={{ color: 'var(--ds-text-secondary)', transform: 'rotate(180deg)' }} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] ds-text-primary leading-snug truncate">{ticket.subject}</p>
          <span
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold mt-0.5 px-2 py-[2px] rounded-full"
            style={{ background: st.bg, color: st.color }}
          >
            <st.Icon size={11} />
            {st.label}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 px-5 py-5" style={{ minHeight: 240 }}>
        {loading ? (
          <>
            <Skeleton className="h-[52px] w-2/3 rounded-2xl" />
            <Skeleton className="h-[52px] w-2/3 rounded-2xl self-end" />
          </>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
            <MessageSquare size={22} style={{ color: 'var(--ds-text-tertiary)' }} />
            <p className="text-[13px] ds-text-tertiary">Aucun message pour le moment.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isGerant = !msg.isAdminReply
            return (
              <m.div
                key={msg._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className={`flex ${isGerant ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[78%] rounded-2xl px-3.5 py-2.5"
                  style={
                    isGerant
                      ? { background: 'var(--ds-accent)', color: '#fff' }
                      : { background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)' }
                  }
                >
                  <p className="text-[13px] leading-[1.5] whitespace-pre-wrap break-words">{msg.body}</p>
                  <div
                    className="text-[10.5px] mt-1 text-right"
                    style={{ color: isGerant ? 'rgba(255,255,255,0.7)' : 'var(--ds-text-tertiary)' }}
                  >
                    {isGerant ? 'Vous' : 'Support Splitzy'} · {timeAgo(msg._creationTime)}
                  </div>
                </div>
              </m.div>
            )
          })
        )}
      </div>

      {/* Reply bar */}
      <div className="flex items-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--ds-border)' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void handleSend() }
          }}
          placeholder="Écrivez votre message…"
          rows={1}
          className="flex-1 text-base md:text-[13px] rounded-[10px] border px-3 py-2 resize-none leading-[1.4] outline-none"
          style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)', color: 'var(--ds-text-primary)', minHeight: 42, maxHeight: 120 }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Envoyer"
          className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center text-white shrink-0 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--ds-accent)' }}
        >
          <Send size={16} />
        </button>
      </div>
    </m.div>
  )
}

// --- État vide ---
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="ds-panel flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--ds-accent-soft)' }}
      >
        <LifeBuoy size={26} style={{ color: 'var(--ds-accent)' }} />
      </div>
      <div>
        <p className="font-bold text-[16px] ds-text-primary">Aucun ticket pour le moment</p>
        <p className="text-[13px] ds-text-secondary mt-1 max-w-sm">
          Une question, un bug, une demande ? Ouvrez un ticket, notre équipe vous répond rapidement.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--ds-accent)' }}
      >
        <Plus size={15} />
        Créer un ticket
      </button>
    </div>
  )
}

// --- Dialog nouveau ticket ---
function NewTicketDialog({
  open, onClose, subject, setSubject, body, setBody, priority, setPriority, creating, onSubmit,
}: {
  open: boolean
  onClose: () => void
  subject: string
  setSubject: (v: string) => void
  body: string
  setBody: (v: string) => void
  priority: string
  setPriority: (v: string) => void
  creating: boolean
  onSubmit: () => void
}) {
  const canSubmit = subject.trim().length > 0 && body.trim().length > 0 && !creating
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <m.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <m.div
            className="relative w-full sm:max-w-md rounded-t-[20px] sm:rounded-2xl overflow-hidden"
            style={{ background: 'var(--ds-bg-surface)', boxShadow: 'var(--ds-shadow-lg, 0 20px 60px rgba(0,0,0,0.25))' }}
            initial={{ y: 40, opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--ds-accent-soft)' }}
              >
                <LifeBuoy size={17} style={{ color: 'var(--ds-accent)' }} />
              </div>
              <div>
                <p className="font-bold text-[15px] ds-text-primary leading-tight">Nouveau ticket</p>
                <p className="text-[12px] ds-text-tertiary">Décrivez votre demande à l'équipe Splitzy.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 px-5 pb-3">
              {/* Sujet */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold ds-text-secondary">Sujet</span>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={120}
                  placeholder="Ex : Problème de synchronisation menu"
                  className="text-base md:text-[13.5px] rounded-[9px] border px-3 py-2.5 outline-none"
                  style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)', color: 'var(--ds-text-primary)' }}
                />
              </label>

              {/* Message */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold ds-text-secondary">Message</span>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Décrivez votre demande en détail…"
                  className="text-base md:text-[13.5px] rounded-[9px] border px-3 py-2.5 resize-none leading-[1.5] outline-none"
                  style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)', color: 'var(--ds-text-primary)', minHeight: 96 }}
                />
              </label>

              {/* Priorité */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold ds-text-secondary">Priorité</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'high', 'urgent'] as const).map(p => {
                    const info = priorityInfo(p)
                    const active = priority === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className="px-2 py-2 rounded-[9px] text-[12.5px] font-semibold border transition-colors"
                        style={{
                          background: active ? info.bg : 'var(--ds-bg-base)',
                          color: active ? info.color : 'var(--ds-text-secondary)',
                          borderColor: active ? info.color : 'var(--ds-border)',
                        }}
                      >
                        {info.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--ds-border)' }}>
              <button
                onClick={onClose}
                disabled={creating}
                className="px-3.5 py-2 rounded-[9px] text-[13px] font-medium ds-text-secondary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: 'var(--ds-accent)' }}
              >
                <Send size={14} />
                {creating ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}

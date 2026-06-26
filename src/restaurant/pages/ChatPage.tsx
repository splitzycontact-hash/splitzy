import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { MessageSquare, Send, Users, ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useRestaurantId } from '../context/RestaurantContext'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useServiceStartTs } from '../hooks/useServiceStartTs'

// 4 couleurs cycliques pour les avatars-initiales (alignées palette app).
const AVATAR_COLORS = ['#E8920A', '#3B82F6', '#8B5CF6', '#10B981']

// Libellés FR des rôles members (owner|manager|staff).
const ROLE_LABEL: Record<string, string> = {
  owner: 'Propriétaire',
  manager: 'Manager',
  staff: 'Équipier',
}

type Member = NonNullable<ReturnType<typeof useMembersQuery>>[number]
function useMembersQuery() {
  const restaurantId = useRestaurantId()
  return useQuery(api.members.getTeamMembers, restaurantId ? { restaurantId } : 'skip')
}

const nameOf = (m: Member) => m.displayName || m.firstName || m.name
const initialOf = (m: Member) => (nameOf(m).trim()[0] ?? '?').toUpperCase()
const hhmm = (ts: number) =>
  new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Ligne d'annuaire / conversation (panneau gauche). Hors composant : pas de
// re-création à chaque render (sinon reset d'état + warning react-hooks).
function ThreadRow({
  label, sublabel, initial, color, preview, unread, active, onClick,
}: {
  label: string; sublabel?: string; initial: React.ReactNode; color: string
  preview?: string; unread: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[8px] text-left transition-colors ${
        active ? 'ds-bg-subtle' : 'hover:ds-bg-subtle'
      }`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
        style={{ background: color }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold ds-text-primary truncate leading-tight">{label}</div>
        {preview ? (
          <div className="text-[11.5px] ds-text-tertiary truncate leading-tight mt-0.5">{preview}</div>
        ) : sublabel ? (
          <div className="text-[11.5px] ds-text-tertiary truncate leading-tight mt-0.5">{sublabel}</div>
        ) : null}
      </div>
      {unread > 0 && (
        <span className="text-[10.5px] min-w-[18px] h-[18px] px-1 rounded-full bg-[#EF4444] text-white font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
          {unread}
        </span>
      )}
    </button>
  )
}

export function ChatPage() {
  const restaurantId = useRestaurantId()
  const { user } = useUser()
  // null = broadcast ("Toute la salle"). Sinon, DM avec ce membre.
  const [selectedMemberId, setSelectedMemberId] = useState<Id<'members'> | null>(null)
  // Mobile : panneau unique — false = liste des conversations, true = fil ouvert.
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const sinceTs = useServiceStartTs()
  const members = useMembersQuery()
  const conversations = useQuery(
    api.messages.listConversations,
    restaurantId ? { restaurantId, sinceTs } : 'skip',
  )
  const messages = useQuery(
    api.messages.listThread,
    restaurantId
      ? selectedMemberId
        ? { restaurantId, recipientId: selectedMemberId, sinceTs }
        : { restaurantId, threadId: 'broadcast', sinceTs }
      : 'skip',
  )
  const sendMsg = useMutation(api.messages.send)
  const markRead = useMutation(api.messages.markRead)

  // me._id : ligne `members` du gérant connecté. Absent pour le propriétaire pur
  // (sans ligne members) tant qu'il n'a pas envoyé son 1er message — l'envoi
  // crée la ligne côté backend, et les threadId 1:1 se résolvent ensuite.
  const me = members?.find(m => m.clerkUserId === user?.id) ?? null
  const otherMembers = (members ?? []).filter(m => m._id !== me?._id)
  const memberById = new Map((members ?? []).map(m => [m._id, m]))

  // threadId 1:1 = [me|member] trié — doit matcher le calcul backend (send).
  const threadIdFor = (memberId: string) =>
    me ? [me._id.toString(), memberId.toString()].sort().join('|') : ''
  const convFor = (threadId: string) =>
    conversations?.find(c => c.threadId === threadId)

  const activeThreadId = selectedMemberId && me ? threadIdFor(selectedMemberId) : 'broadcast'
  const selectedMember = selectedMemberId
    ? otherMembers.find(m => m._id === selectedMemberId) ?? null
    : null
  const threadTitle = selectedMember ? nameOf(selectedMember) : 'Toute la salle'

  // Scroll en bas à chaque nouveau message / changement de fil.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length, activeThreadId])

  // Marquer le thread comme lu à l'ouverture / au changement.
  useEffect(() => {
    if (!restaurantId) return
    markRead({ restaurantId, threadId: activeThreadId }).catch(() => {})
  }, [activeThreadId, restaurantId, markRead])

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || !restaurantId) return
    try {
      await sendMsg({ restaurantId, content, recipientId: selectedMemberId ?? undefined })
      setDraft('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'envoi du message")
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <RestaurantLayout>
      <PageHeader
        title="Chat équipe"
        subtitle={<span>Messagerie interne — diffusion à toute la salle ou messages privés</span>}
      />

      <div className="flex h-[calc(100dvh-150px)] md:h-[calc(100dvh-140px)] m-3 md:m-9 md:mt-6 rounded-[14px] border overflow-hidden"
        style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-surface)' }}
      >
        {/* Panneau gauche — broadcast + annuaire */}
        <div
          className={`${mobileThreadOpen ? 'hidden md:flex' : 'flex'} w-full md:w-64 shrink-0 border-r flex-col`}
          style={{ borderColor: 'var(--ds-border)' }}
        >
          <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-px">
            <ThreadRow
              label="Toute la salle"
              initial={<Users size={16} />}
              color="#0A0A0A"
              preview={convFor('broadcast')?.lastMsg.content}
              unread={convFor('broadcast')?.unread ?? 0}
              active={!selectedMemberId}
              onClick={() => { setSelectedMemberId(null); setMobileThreadOpen(true) }}
            />

            <div className="px-1.5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ds-text-tertiary">
              Annuaire
            </div>
            {otherMembers.map((m, i) => {
              const conv = convFor(threadIdFor(m._id))
              return (
                <ThreadRow
                  key={m._id}
                  label={nameOf(m)}
                  sublabel={ROLE_LABEL[m.role] ?? m.role}
                  initial={initialOf(m)}
                  color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                  preview={conv?.lastMsg.content}
                  unread={conv?.unread ?? 0}
                  active={selectedMemberId === m._id}
                  onClick={() => { setSelectedMemberId(m._id); setMobileThreadOpen(true) }}
                />
              )
            })}
            {members && otherMembers.length === 0 && (
              <div className="px-2.5 py-3 text-[12px] ds-text-tertiary">
                Aucun autre membre dans l'équipe.
              </div>
            )}
          </div>
        </div>

        {/* Panneau droit — fil + composer */}
        <div className={`${mobileThreadOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          <div className="px-4 md:px-5 py-3 md:py-3.5 border-b flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
            <button
              onClick={() => setMobileThreadOpen(false)}
              className="md:hidden -ml-1 p-1 rounded-md ds-text-secondary hover:ds-bg-subtle"
              aria-label="Retour aux conversations"
            >
              <ChevronLeft size={20} />
            </button>
            <MessageSquare size={16} style={{ color: 'var(--ds-text-tertiary)' }} />
            <span className="text-[14px] font-semibold ds-text-primary truncate">{threadTitle}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {messages && messages.length === 0 && (
              <div className="m-auto text-center ds-text-tertiary text-[13px]">
                {!selectedMemberId
                  ? 'Aucun message depuis le début du service.'
                  : 'Aucun message — commencez la conversation !'}
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages?.map(msg => {
                const mine = !!me && msg.senderId === me._id
                const sender = memberById.get(msg.senderId)
                const senderName = mine ? 'Vous' : sender ? nameOf(sender) : 'Membre'
                const avatarSeed = sender ? (sender.avatarSeed ?? nameOf(sender)) : 'default'
                return (
                  <motion.div
                    key={msg._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={`flex items-end gap-2 ${mine ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    {!mine && (
                      <img
                        src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`}
                        className="w-7 h-7 rounded-full flex-shrink-0"
                        style={{ background: 'var(--ds-bg-subtle)' }}
                        alt={senderName}
                      />
                    )}
                    <div className={`flex flex-col max-w-[65%] ${mine ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10.5px] ds-text-tertiary mb-0.5 px-1">
                        {senderName} · {hhmm(msg.createdAt)}
                      </div>
                      <div
                        className="px-3 py-2 text-[13.5px] leading-snug whitespace-pre-wrap break-words"
                        style={
                          mine
                            ? { background: '#3B82F6', color: '#FFFFFF', borderRadius: '18px 18px 4px 18px' }
                            : { background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)', borderRadius: '18px 18px 18px 4px' }
                        }
                      >
                        {msg.content}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {messages === undefined && (
              <div className="self-start flex items-end gap-2">
                <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: 'var(--ds-bg-subtle)' }} />
                <div className="px-3 py-2.5 flex gap-1.5 items-center" style={{ background: 'var(--ds-bg-subtle)', borderRadius: '18px 18px 18px 4px' }}>
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full block"
                      style={{ background: 'var(--ds-text-tertiary)' }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t px-4 py-3 shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
            <div
              className="flex items-center gap-2 rounded-full px-4 border transition-colors"
              style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
            >
              <textarea
                rows={1}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={`Message à ${threadTitle}…`}
                className="flex-1 resize-none bg-transparent py-3 text-[14px] leading-snug outline-none"
                style={{ color: 'var(--ds-text-primary)' }}
              />
              <motion.button
                onClick={() => void handleSend()}
                disabled={!draft.trim()}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
                style={{ background: '#3B82F6' }}
                aria-label="Envoyer"
              >
                <Send size={14} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  )
}

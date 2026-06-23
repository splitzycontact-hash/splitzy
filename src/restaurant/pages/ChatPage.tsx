import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { MessageSquare, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useRestaurantId } from '../context/RestaurantContext'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'

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
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const members = useMembersQuery()
  const conversations = useQuery(
    api.messages.listConversations,
    restaurantId ? { restaurantId } : 'skip',
  )
  const messages = useQuery(
    api.messages.listThread,
    restaurantId
      ? selectedMemberId
        ? { restaurantId, recipientId: selectedMemberId }
        : { restaurantId, threadId: 'broadcast' }
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

      <div className="flex h-[calc(100vh-140px)] m-9 mt-6 rounded-[14px] border overflow-hidden"
        style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-surface)' }}
      >
        {/* Panneau gauche — broadcast + annuaire */}
        <div className="w-64 shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-px">
            <ThreadRow
              label="Toute la salle"
              initial={<Users size={16} />}
              color="#0A0A0A"
              preview={convFor('broadcast')?.lastMsg.content}
              unread={convFor('broadcast')?.unread ?? 0}
              active={!selectedMemberId}
              onClick={() => setSelectedMemberId(null)}
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
                  onClick={() => setSelectedMemberId(m._id)}
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
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 py-3.5 border-b flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
            <MessageSquare size={16} style={{ color: 'var(--ds-text-tertiary)' }} />
            <span className="text-[14px] font-semibold ds-text-primary truncate">{threadTitle}</span>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2">
            {messages && messages.length === 0 && (
              <div className="m-auto text-center ds-text-tertiary text-[13px]">
                Aucun message — commencez la conversation !
              </div>
            )}
            {messages?.map(msg => {
              const mine = !!me && msg.senderId === me._id
              const sender = memberById.get(msg.senderId)
              const senderName = mine ? 'Vous' : sender ? nameOf(sender) : 'Membre'
              return (
                <div
                  key={msg._id}
                  className={`flex flex-col max-w-[75%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  <div className="text-[10.5px] ds-text-tertiary mb-0.5 px-1">
                    {senderName} · {hhmm(msg.createdAt)}
                  </div>
                  <div
                    className="px-3 py-2 rounded-2xl text-[13.5px] leading-snug whitespace-pre-wrap break-words"
                    style={
                      mine
                        ? { background: '#3B82F6', color: '#FFFFFF' }
                        : { background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)' }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t px-4 py-3 flex items-end gap-2 shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
            <textarea
              rows={2}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Message à ${threadTitle}…  (Entrée pour envoyer, Maj+Entrée = retour à la ligne)`}
              className="flex-1 resize-none rounded-[10px] border px-3 py-2 text-[14px] outline-none"
              style={{
                background: 'var(--ds-bg-base)',
                borderColor: 'var(--ds-border)',
                color: 'var(--ds-text-primary)',
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!draft.trim()}
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
              style={{ background: '#3B82F6' }}
              aria-label="Envoyer"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { MessageSquare, X, ChevronLeft, Send, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { useServiceStartTs } from '../hooks/useServiceStartTs'

// 4 couleurs cycliques pour les avatars-initiales (alignées ChatPage).
const AVATAR_COLORS = ['#E8920A', '#3B82F6', '#8B5CF6', '#10B981']
const ROLE_LABEL: Record<string, string> = {
  owner: 'Propriétaire',
  manager: 'Manager',
  staff: 'Équipier',
}

type Member = NonNullable<ReturnType<typeof useQuery<typeof api.members.getTeamMembers>>>[number]

const nameOf = (m: Member) => m.displayName || m.firstName || m.name
const initialOf = (m: Member) => (nameOf(m).trim()[0] ?? '?').toUpperCase()
const hhmm = (ts: number) =>
  new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function FloatingChat({ restaurantId }: { restaurantId: Id<'restaurants'> }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  // undefined = liste convos, null = broadcast, Id = DM
  const [activeId, setActiveId] = useState<Id<'members'> | null | undefined>(undefined)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const sinceTs = useServiceStartTs()
  const convos = useQuery(api.messages.listConversations, { restaurantId, sinceTs })
  const members = useQuery(api.members.getTeamMembers, { restaurantId })
  const msgs = useQuery(api.messages.listThread,
    activeId !== undefined
      ? activeId === null
        ? { restaurantId, threadId: 'broadcast', sinceTs }
        : { restaurantId, recipientId: activeId, sinceTs }
      : 'skip'
  )
  const sendMsg = useMutation(api.messages.send)
  const markRead = useMutation(api.messages.markRead)

  const { user } = useUser()
  const me = members?.find(m => m.clerkUserId === user?.id) ?? null

  const totalUnread = convos?.reduce((s, c) => s + (c.unread ?? 0), 0) ?? 0
  // M6-B — badge pulsant si un appel gérant non lu est le dernier message broadcast.
  const broadcastConv = convos?.find(c => c.threadId === 'broadcast')
  const managerCalled =
    (broadcastConv?.unread ?? 0) > 0 &&
    !!broadcastConv?.lastMsg.content.includes('appel gérant')
  // null tant que Convex n'a pas répondu → pas d'auto-open au 1er load (Bug A).
  const prevUnread = useRef<number | null>(null)

  // Auto-ouvrir sur nouvelle notif si pas déjà sur /chat
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prevUnread.current === null) {
      prevUnread.current = totalUnread // premier load : snapshot sans ouvrir
      return
    }
    if (totalUnread > prevUnread.current && !location.pathname.includes('/chat')) {
      const newest = convos?.find(c => (c.unread ?? 0) > 0)
      if (newest) {
        setIsOpen(true)
        const ids = newest.threadId === 'broadcast' ? [] : newest.threadId.split('|')
        // Bug B fix : ids[0] peut être mon propre ID — prendre l'autre
        const otherId = ids.find(id => id !== me?._id?.toString())
        setActiveId(newest.threadId === 'broadcast' ? null : otherId as Id<'members'>)
      }
    }
    prevUnread.current = totalUnread
  }, [totalUnread, convos, location.pathname, me?._id])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    if (activeId !== undefined && restaurantId) {
      markRead({ restaurantId, threadId: activeId === null ? 'broadcast' : undefined, recipientId: activeId ?? undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, restaurantId])

  async function handleSend() {
    if (!draft.trim()) return
    await sendMsg({ restaurantId, content: draft.trim(), recipientId: activeId ?? undefined })
    setDraft('')
  }

  // --- Dérivations pour le rendu (annuaire, titres, "mes" messages) ---
  const otherMembers = (members ?? []).filter(m => m._id !== me?._id)
  const memberById = new Map((members ?? []).map(m => [m._id, m]))
  const threadIdFor = (memberId: string) =>
    me ? [me._id.toString(), memberId.toString()].sort().join('|') : ''
  const convFor = (threadId: string) => convos?.find(c => c.threadId === threadId)
  const selectedMember = activeId ? otherMembers.find(m => m._id === activeId) ?? null : null
  const threadTitle = activeId === null ? 'Toute la salle' : selectedMember ? nameOf(selectedMember) : ''
  const inThread = activeId !== undefined

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (location.pathname.includes('/chat')) return null

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6 right-4 md:right-6 z-40 w-14 h-14 rounded-full bg-primary shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
        <MessageSquare size={22} className="text-primary-foreground"/>
        {totalUnread > 0 && (
          <span className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${managerCalled ? 'animate-pulse' : ''}`}>
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-[calc(140px+env(safe-area-inset-bottom))] md:bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[360px] h-[68vh] max-h-[520px] md:h-[520px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="px-3.5 py-3 border-b flex items-center gap-2 shrink-0"
            style={{ borderColor: 'var(--ds-border)' }}
          >
            {inThread && (
              <button
                onClick={() => setActiveId(undefined)}
                aria-label="Retour"
                className="p-1 -ml-1 rounded-md hover:ds-bg-subtle ds-text-secondary"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <span className="text-[14px] font-semibold ds-text-primary truncate flex-1">
              {inThread ? threadTitle : 'Messages'}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fermer"
              className="p-1 -mr-1 rounded-md hover:ds-bg-subtle ds-text-tertiary"
            >
              <X size={18} />
            </button>
          </div>

          {/* Liste des conversations */}
          {!inThread && (
            <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-px">
              <ThreadRow
                label="Toute la salle"
                initial={<Users size={16} />}
                color="#0A0A0A"
                preview={convFor('broadcast')?.lastMsg.content}
                unread={convFor('broadcast')?.unread ?? 0}
                onClick={() => setActiveId(null)}
              />
              <div className="px-1.5 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ds-text-tertiary">
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
                    onClick={() => setActiveId(m._id)}
                  />
                )
              })}
              {members && otherMembers.length === 0 && (
                <div className="px-2.5 py-3 text-[12px] ds-text-tertiary">
                  Aucun autre membre dans l'équipe.
                </div>
              )}
            </div>
          )}

          {/* Fil + composer */}
          {inThread && (
            <>
              <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2">
                {msgs && msgs.length === 0 && (
                  <div className="m-auto text-center ds-text-tertiary text-[12.5px]">
                    {activeId === null
                      ? 'Aucun message depuis le début du service.'
                      : 'Aucun message — commencez la conversation !'}
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {msgs?.map(msg => {
                    const mine = !!me && msg.senderId === me._id
                    const sender = memberById.get(msg.senderId)
                    const senderName = mine ? 'Vous' : sender ? nameOf(sender) : 'Membre'
                    const avatarSeed = sender ? (sender.avatarSeed ?? '👤') : '👤'
                    return (
                      <motion.div
                        key={msg._id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        className={`flex items-end gap-1.5 ${mine ? 'self-end flex-row-reverse' : 'self-start'}`}
                      >
                        {!mine && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: 'var(--ds-bg-subtle)' }}
                            aria-label={senderName}
                          >
                            {avatarSeed}
                          </div>
                        )}
                        <div className={`flex flex-col max-w-[68%] ${mine ? 'items-end' : 'items-start'}`}>
                          <div className="text-[10px] ds-text-tertiary mb-0.5 px-1">
                            {senderName} · {hhmm(msg.createdAt)}
                          </div>
                          <div
                            className="px-3 py-1.5 text-[13px] leading-snug whitespace-pre-wrap break-words"
                            style={
                              mine
                                ? { background: '#3B82F6', color: '#FFFFFF', borderRadius: '16px 16px 4px 16px' }
                                : { background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)', borderRadius: '16px 16px 16px 4px' }
                            }
                          >
                            {msg.content}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {msgs === undefined && (
                  <div className="self-start flex items-end gap-1.5">
                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: 'var(--ds-bg-subtle)' }} />
                    <div className="px-3 py-2 flex gap-1 items-center" style={{ background: 'var(--ds-bg-subtle)', borderRadius: '16px 16px 16px 4px' }}>
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full block"
                          style={{ background: 'var(--ds-text-tertiary)' }}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t px-3 py-2.5 shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
                <div
                  className="flex items-center gap-2 rounded-full px-3 border transition-colors"
                  style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                >
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={`Message à ${threadTitle}…`}
                    className="flex-1 resize-none bg-transparent py-2.5 text-[13px] leading-snug outline-none max-h-24"
                    style={{ color: 'var(--ds-text-primary)' }}
                  />
                  <motion.button
                    onClick={() => void handleSend()}
                    disabled={!draft.trim()}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Envoyer"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
                    style={{ background: '#3B82F6' }}
                  >
                    <Send size={13} />
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

// Ligne d'annuaire / conversation (réplique allégée de ChatPage.ThreadRow).
function ThreadRow({
  label, sublabel, initial, color, preview, unread, onClick,
}: {
  label: string; sublabel?: string; initial: React.ReactNode; color: string
  preview?: string; unread: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[8px] text-left transition-colors hover:ds-bg-subtle"
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

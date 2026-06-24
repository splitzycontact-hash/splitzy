import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../../../convex/_generated/api'
import { useRestaurantId } from '../context/RestaurantContext'
import { useServiceStartTs } from './useServiceStartTs'

// Notifie le gérant/staff d'un nouveau message chat : toast Sonner (si on n'est
// pas déjà sur /restaurant/chat) + Notification navigateur (si l'onglet est
// masqué). Réactif via la query Convex listConversations (incrément `unread`).
export function useChatNotifications() {
  const restaurantId = useRestaurantId()
  const location = useLocation()
  const onChatPage = location.pathname === '/restaurant/chat'

  const sinceTs = useServiceStartTs()
  const members = useQuery(api.members.getTeamMembers, restaurantId ? { restaurantId } : 'skip')
  const conversations = useQuery(api.messages.listConversations, restaurantId ? { restaurantId, sinceTs } : 'skip')

  const prevUnread = useRef<Record<string, number>>({})
  const initialized = useRef(false)

  // Demander la permission navigateur une seule fois.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!conversations) return

    // Premier rendu → mémoriser l'état sans notifier (sinon flood au montage).
    if (!initialized.current) {
      conversations.forEach(c => { prevUnread.current[c.threadId] = c.unread })
      initialized.current = true
      return
    }

    for (const conv of conversations) {
      const prev = prevUnread.current[conv.threadId] ?? 0
      if (conv.unread <= prev) continue

      // Nouveau message non lu dans ce thread.
      const isBC = conv.threadId === 'broadcast'
      const sender = members?.find(m => m._id === conv.lastMsg.senderId)
      const senderName = sender
        ? (sender.displayName ?? sender.firstName ?? sender.name)
        : 'Quelqu\'un'
      const title = isBC ? '💬 Toute la salle' : `💬 ${senderName}`
      const body = conv.lastMsg.content.slice(0, 80)

      // A — Toast Sonner (sauf si déjà sur la page chat).
      if (!onChatPage) {
        toast(title, { description: body, duration: 5000 })
      }

      // B — Notification navigateur (si l'onglet n'est pas visible).
      if (document.hidden && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' })
      }

      prevUnread.current[conv.threadId] = conv.unread
    }
  }, [conversations, members, onChatPage])
}

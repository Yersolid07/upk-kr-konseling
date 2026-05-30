// src/hooks/useRealtimeNotifications.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types/database'
import toast from 'react-hot-toast'

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      setNotifications(data as any)
      setUnreadCount((data as any[]).filter(n => !n.is_read).length)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as Notification
          setNotifications(prev => [notif, ...prev])
          setUnreadCount(prev => prev + 1)
          // Show toast for important notifications
          toast(notif.title, {
            icon: getNotifIcon(notif.type),
            duration: 4000,
          })
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [userId, fetchNotifications])

  const markAllRead = useCallback(async () => {
    await (supabase.from('notifications') as any)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [userId])

  const markRead = useCallback(async (id: string) => {
    await (supabase.from('notifications') as any)
      .update({ is_read: true })
      .eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  return { notifications, unreadCount, markAllRead, markRead, refetch: fetchNotifications }
}

function getNotifIcon(type: string): string {
  const icons: Record<string, string> = {
    new_message: '💬',
    new_comment: '🗨️',
    new_reaction: '🙏',
    booking_confirmed: '📅',
    booking_cancelled: '❌',
    prayer_support: '🙏',
    sos_alert: '🆘',
    konselor_verified: '✅',
    system: 'ℹ️',
  }
  return icons[type] ?? '🔔'
}

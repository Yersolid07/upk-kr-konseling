// src/hooks/useRealtimeChat.ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

interface UseRealtimeChatOptions {
  sessionId: string
  currentUserId: string
}

export function useRealtimeChat({ sessionId, currentUserId }: UseRealtimeChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, full_name, display_name, avatar_url, role, anon_token)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data as Message[])
      // Mark messages as read
      await (supabase.from('messages') as any)
        .update({ is_read: true })
        .eq('session_id', sessionId)
        .neq('sender_id', currentUserId)
        .eq('is_read', false)
    }
    setLoading(false)
  }, [sessionId, currentUserId])

  // Subscribe to realtime
  useEffect(() => {
    fetchMessages()

    channelRef.current = supabase
      .channel(`chat:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          // Fetch full message with sender info
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles(id, full_name, display_name, avatar_url, role, anon_token)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages(prev => {
              // Prevent duplicates
              const incoming = data as any
              if (prev.find(m => m.id === incoming.id)) return prev
              return [...prev, incoming as Message]
            })

            // Auto-mark as read if from other party
            if (payload.new.sender_id !== currentUserId) {
              await (supabase.from('messages') as any)
                .update({ is_read: true })
                .eq('id', payload.new.id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [sessionId, fetchMessages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return
    setSending(true)

    const { error } = await (supabase.from('messages') as any).insert({
      session_id: sessionId,
      sender_id: currentUserId,
      content: content.trim(),
      is_read: false,
    })

    setSending(false)
    if (error) console.error('Send message error:', error)
  }, [sessionId, currentUserId])

  return { messages, loading, sending, sendMessage, refetch: fetchMessages }
}

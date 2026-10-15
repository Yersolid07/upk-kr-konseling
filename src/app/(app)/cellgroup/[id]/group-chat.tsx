// src/app/(app)/cellgroup/[id]/group-chat.tsx
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Users, MessageCircle } from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'
import { sendGroupMessage } from '../actions'
import toast from 'react-hot-toast'

interface GroupChatProps {
  groupId: string
  currentUserId: string
  initialMessages: any[]
}

export function GroupChat({ groupId, currentUserId, initialMessages }: GroupChatProps) {
  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel(`cellgroup-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cell_group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const msg = payload.new as any
          // Enrich with sender profile (realtime payload has no join)
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', msg.sender_id)
            .single()
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, { ...msg, sender }]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId, supabase])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || isSending) return

    setIsSending(true)
    setNewMessage('')

    const res = await sendGroupMessage(groupId, content)
    if (res?.error) {
      toast.error(res.error)
      setNewMessage(content)
    }
    setIsSending(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-360px)] min-h-[420px] card-premium overflow-hidden bg-white/60 backdrop-blur-xl border border-white">
      <div className="px-6 py-4 bg-white/80 border-b border-[var(--cream-dark)] flex items-center gap-3">
        <MessageCircle size={18} className="text-[var(--terra)]" />
        <h2 className="text-sm font-black text-[var(--brown-dark)] uppercase tracking-widest">Obrolan Group</h2>
        <span className="ml-auto text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Realtime</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-[var(--cream)]/30 to-white/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-[var(--text-muted)]">
            <Users size={40} className="opacity-40" />
            <p className="text-sm">Belum ada pesan. Mulai percakapan dengan menyapa anggota group.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId
            const name = msg.is_anonymous && !isOwn ? 'Anggota' : (msg.sender?.full_name ?? 'Anggota')
            return (
              <div key={msg.id} className={cn('flex flex-col max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300', isOwn ? 'ml-auto items-end' : 'mr-auto items-start')}>
                {!isOwn && <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 px-1">{name}</span>}
                <div className={cn(
                  'px-5 py-3 rounded-3xl text-sm leading-relaxed shadow-sm',
                  isOwn ? 'bg-[var(--brown-dark)] text-white rounded-tr-none' : 'bg-white border border-[var(--cream-dark)] text-[var(--brown-dark)] rounded-tl-none'
                )}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 px-1">
                  {getRelativeTime(msg.created_at)}
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 bg-white border-t border-[var(--cream-dark)]">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Tulis pesan untuk group..."
            className="flex-1 bg-[var(--cream)]/50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[var(--terra)]/20 transition-all outline-none"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all shadow-lg active:scale-95',
              newMessage.trim() && !isSending ? 'bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] shadow-[var(--terra)]/20' : 'bg-gray-300 cursor-not-allowed'
            )}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  )
}

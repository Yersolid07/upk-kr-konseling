// src/app/chat/[id]/chat-interface.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Send, 
  ArrowLeft, 
  ShieldCheck, 
  MoreVertical,
  Paperclip,
  Smile
} from 'lucide-react'
import Link from 'next/link'
import { cn, getRelativeTime } from '@/lib/utils'

interface ChatInterfaceProps {
  session: any
  initialMessages: any[]
  currentUserId: string
}

export function ChatInterface({ session, initialMessages, currentUserId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const isMember = session.member_id === currentUserId
  const otherUser = isMember ? session.konselor : session.member

  // Setup Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, supabase])

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await (supabase.from('messages') as any).insert({
      session_id: session.id,
      sender_id: currentUserId,
      content,
    })

    if (error) {
      console.error('Error sending message:', error)
      setNewMessage(content) // Restore message if failed
    }
    
    // Update last_message in session
    await (supabase.from('chat_sessions') as any).update({ 
      last_message: content,
      updated_at: new Date().toISOString()
    }).eq('id', session.id)

    setIsSending(false)
  }

  return (
    <div className="flex flex-col h-full card-premium overflow-hidden bg-white/50 backdrop-blur-xl border border-white">
      {/* Header */}
      <div className="px-6 py-4 bg-white/80 border-b border-[var(--cream-dark)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/chat" className="p-2 rounded-xl hover:bg-[var(--cream)] transition-all">
            <ArrowLeft size={20} className="text-[var(--brown-dark)]" />
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white font-bold shadow-md">
                {otherUser?.full_name?.charAt(0) ?? 'K'}
             </div>
             <div>
                <h3 className="text-sm font-bold text-[var(--brown-dark)] leading-none">{otherUser?.full_name ?? 'Konselor UPK-Kr'}</h3>
                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1 block">Online</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--sage)]/10 text-[var(--sage)] text-[10px] font-bold border border-[var(--sage)]/20">
              <ShieldCheck size={12} /> Terenkripsi
           </div>
           <button className="p-2 text-[var(--text-muted)] hover:text-[var(--brown-dark)] transition-all">
              <MoreVertical size={20} />
           </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-[var(--cream)]/30 to-white/50"
      >
        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                isOwn ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "px-5 py-3 rounded-3xl text-sm leading-relaxed shadow-sm",
                isOwn 
                  ? "bg-[var(--brown-dark)] text-white rounded-tr-none" 
                  : "bg-white border border-[var(--cream-dark)] text-[var(--brown-dark)] rounded-tl-none"
              )}>
                {msg.content}
              </div>
              <span className="text-[9px] text-[var(--text-muted)] mt-1 font-medium px-2">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-[var(--cream-dark)]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex items-center gap-1">
             <button type="button" className="p-2 text-[var(--text-muted)] hover:bg-[var(--cream)] rounded-xl transition-all">
                <Paperclip size={20} />
             </button>
             <button type="button" className="p-2 text-[var(--text-muted)] hover:bg-[var(--cream)] rounded-xl transition-all">
                <Smile size={20} />
             </button>
          </div>
          <input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ketik pesan Anda di sini..."
            className="flex-1 bg-[var(--cream)]/50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[var(--terra)]/20 transition-all outline-none"
            disabled={isSending}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all shadow-lg active:scale-95",
              newMessage.trim() && !isSending 
                ? "bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] shadow-[var(--terra)]/20" 
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-[9px] text-center text-[var(--text-muted)] mt-3 uppercase tracking-widest font-bold opacity-40">
           Hanya Anda dan konselor yang dapat melihat percakapan ini
        </p>
      </div>
    </div>
  )
}

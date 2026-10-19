// src/app/(app)/chat/[id]/chat-interface.tsx
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, ArrowLeft, ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/profile/Avatar'

// Jam pesan memakai zona waktu tetap. Tanpa ini server merender di zona
// waktu mesin dan browser di zona pengguna, sehingga React melaporkan
// hydration mismatch (#425) setiap kali ruang chat dibuka.
function jamPesan(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  })
}

interface Message {
  id: string
  session_id: string
  sender_id: string
  content: string
  created_at: string
}

interface ChatInterfaceProps {
  session: {
    id: string
    member_id: string
    konselor_id: string | null
    status: string
    member?: { full_name: string | null; is_online: boolean | null; avatar_url: string | null } | null
    konselor?: { full_name: string | null; is_online: boolean | null; avatar_url: string | null } | null
  }
  initialMessages: Message[]
  currentUserId: string
}

export function ChatInterface({ session, initialMessages, currentUserId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Instance dibuat sekali. Sebelumnya `createClient()` dipanggil pada setiap
  // render, sehingga efek berlangganan berjalan ulang terus dan channel lama
  // tidak pernah benar-benar dilepas.
  const supabase = useMemo(() => createClient(), [])

  const isMember = session.member_id === currentUserId
  const otherUser = isMember ? session.konselor : session.member
  const canSend = session.status === 'pending' || session.status === 'active'
  const hasKonselor = Boolean(session.konselor_id)

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
          const incoming = payload.new as Message
          // Realtime bisa mengirim ulang pesan yang sudah ada di state awal;
          // tanpa pemeriksaan ini pesan tampil dua kali.
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, supabase])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || isSending) return

    setIsSending(true)
    setSendError('')
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      session_id: session.id,
      sender_id: currentUserId,
      content,
      is_flagged: false,
      is_read: false,
    })

    if (error) {
      console.error('sendMessage:', error.message)
      setNewMessage(content) // kembalikan isi supaya tidak hilang
      // RLS menolak tanpa pesan yang berguna bagi pengguna; terjemahkan.
      setSendError(
        error.code === '42501'
          ? 'Pesan tidak dapat dikirim — sesi ini sudah ditutup atau Anda bukan pesertanya.'
          : 'Pesan gagal terkirim. Periksa koneksi lalu coba lagi.'
      )
    }

    setIsSending(false)
  }

  return (
    <div className="flex flex-col h-full card-premium overflow-hidden bg-white/50 backdrop-blur-xl border border-white">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/80 border-b border-[var(--cream-dark)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/chat"
            className="p-2 -ml-1 rounded-xl hover:bg-[var(--cream)] transition-all shrink-0"
            aria-label="Kembali ke daftar konseling"
          >
            <ArrowLeft size={20} className="text-[var(--brown-dark)]" />
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name} size="md" className="shadow-md" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--brown-dark)] leading-tight truncate">
                {otherUser?.full_name ?? 'Menunggu konselor'}
              </h3>
              {/* Status diambil dari data, bukan ditulis mati "Online". */}
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-widest mt-0.5 block',
                  otherUser?.is_online ? 'text-[var(--sage)]' : 'text-[var(--text-muted)]'
                )}
              >
                {otherUser?.is_online ? 'Online' : hasKonselor ? 'Offline' : 'Belum ada konselor'}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--sage)]/10 text-[var(--sage)] text-[10px] font-bold border border-[var(--sage)]/20 shrink-0">
          <ShieldCheck size={12} /> Terenkripsi
        </div>
      </div>

      {/* Banner antrean */}
      {!hasKonselor && (
        <div className="px-4 sm:px-6 py-3 bg-[var(--gold)]/10 border-b border-[var(--gold)]/20 text-[11px] text-[var(--brown-dark)] leading-relaxed">
          Permintaan Anda masuk antrean. Konselor akan mengambil sesi ini dan membalas.
          Anda tetap bisa menulis sekarang — pesan Anda tersimpan.
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 custom-scrollbar bg-gradient-to-b from-[var(--cream)]/30 to-white/50"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-10">
            <div className="w-14 h-14 rounded-full bg-[var(--cream)] flex items-center justify-center text-[var(--text-muted)]">
              <ShieldCheck size={26} />
            </div>
            <p className="text-sm font-bold text-[var(--brown-dark)]">Belum ada pesan</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
              Tulis apa yang sedang Anda hadapi. Tidak perlu merangkai kata dengan rapi.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col max-w-[85%] sm:max-w-[75%] animate-in fade-in slide-in-from-bottom-2 duration-300',
                isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
              )}
            >
              <div
                className={cn(
                  'px-4 sm:px-5 py-2.5 sm:py-3 rounded-3xl text-sm leading-relaxed shadow-sm break-words',
                  isOwn
                    ? 'bg-[var(--brown-dark)] text-white rounded-tr-none'
                    : 'bg-white border border-[var(--cream-dark)] text-[var(--brown-dark)] rounded-tl-none'
                )}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-[var(--text-muted)] mt-1 font-medium px-2">
                {jamPesan(msg.created_at)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 bg-white border-t border-[var(--cream-dark)]">
        {sendError && (
          <div className="mb-2 flex items-start gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={canSend ? 'Ketik pesan Anda...' : 'Sesi ini sudah ditutup'}
            className="flex-1 bg-[var(--cream)]/50 border-none rounded-2xl px-4 sm:px-5 py-3 text-sm focus:ring-2 focus:ring-[var(--terra)]/20 transition-all outline-none disabled:opacity-60"
            disabled={!canSend || isSending}
            aria-label="Tulis pesan"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || !canSend}
            className={cn(
              'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white transition-all shadow-lg active:scale-95 shrink-0',
              newMessage.trim() && !isSending && canSend
                ? 'bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] shadow-[var(--terra)]/20'
                : 'bg-gray-300 cursor-not-allowed'
            )}
            aria-label="Kirim pesan"
          >
            {isSending ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}
          </button>
        </form>

        <p className="text-[9px] text-center text-[var(--text-muted)] mt-2.5 uppercase tracking-widest font-bold opacity-40">
          Hanya Anda dan konselor yang dapat melihat percakapan ini
        </p>
      </div>
    </div>
  )
}

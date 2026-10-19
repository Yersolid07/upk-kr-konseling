// src/app/(app)/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  MessageCircle,
  User,
  ChevronRight,
  Plus,
  ShieldCheck,
  Inbox,
} from 'lucide-react'
import { getRelativeTime } from '@/lib/utils'
import { StartChatButton } from './chat-buttons'
import { ClaimButton } from './claim-button'
import { Avatar } from '@/components/profile/Avatar'

export const dynamic = 'force-dynamic'

interface SessionRow {
  id: string
  status: string
  created_at: string
  updated_at: string
  last_message: string | null
  member_id: string
  konselor_id: string | null
  konselor: { id: string; full_name: string; avatar_url: string | null } | null
  member: { id: string; full_name: string; avatar_url: string | null } | null
}

export default async function ChatListPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (me as unknown as { role: string } | null)?.role ?? 'member'
  const isKonselor = role === 'konselor'

  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select(
      `id, status, created_at, updated_at, last_message, member_id, konselor_id,
       konselor:profiles!chat_sessions_konselor_id_fkey(id, full_name, avatar_url),
       member:profiles!chat_sessions_member_id_fkey(id, full_name, avatar_url)`
    )
    .or(`member_id.eq.${user.id},konselor_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  const rows = (sessions ?? []) as unknown as SessionRow[]

  // Antrean: sesi tanpa konselor. RLS hanya memperlihatkannya kepada konselor,
  // jadi daftar ini kosong untuk anggota biasa tanpa perlu disaring di sini.
  const queue = isKonselor
    ? rows.filter((s) => s.status === 'pending' && !s.konselor_id)
    : []
  const mine = rows.filter((s) => s.konselor_id === user.id || s.member_id === user.id)

  const renderCard = (session: SessionRow, showClaim: boolean) => {
    const isMember = session.member_id === user.id
    const otherUser = isMember ? session.konselor : session.member

    return (
      <div key={session.id} className="card-premium p-4 sm:p-5 flex items-center gap-3 sm:gap-5 hover-lift">
        <Link href={`/chat/${session.id}`} className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0 group">
          <div className="relative shrink-0">
            <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name} size="lg" className="shadow-md" />
            {session.status === 'active' && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--sage)] border-2 sm:border-4 border-white rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors truncate text-sm sm:text-base">
                {otherUser?.full_name ?? 'Menunggu konselor'}
              </h3>
              <span className="text-[10px] text-[var(--text-muted)] font-medium shrink-0">
                {getRelativeTime(session.updated_at)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate opacity-80">
              {session.last_message || 'Belum ada pesan...'}
            </p>
            {session.status === 'pending' && (
              <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                Menunggu konselor
              </span>
            )}
          </div>
        </Link>

        {showClaim ? (
          <ClaimButton sessionId={session.id} />
        ) : (
          <Link
            href={`/chat/${session.id}`}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--cream)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--terra)] hover:text-white transition-all shrink-0"
            aria-label="Buka percakapan"
          >
            <ChevronRight size={18} />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold text-[var(--brown-dark)]">
            Konseling Private
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Ruang aman dan rahasia untuk berkonsultasi dengan konselor kami.
          </p>
        </div>
        <Link href="/booking" className="btn-primary !w-auto flex items-center gap-2 self-start md:self-auto">
          <Plus size={18} />
          Booking Sesi Baru
        </Link>
      </div>

      <div className="bg-gradient-to-r from-[var(--sage)] to-[#4d6a52] rounded-[2rem] p-5 sm:p-6 text-white shadow-xl shadow-[var(--sage)]/20 flex items-center gap-4 sm:gap-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
          <ShieldCheck size={26} />
        </div>
        <div>
          <h3 className="font-bold text-base sm:text-lg">Keamanan Terjamin</h3>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Percakapan hanya dapat dibaca oleh Anda dan konselor yang menangani sesi ini. Admin pun tidak
            dapat membukanya tanpa alasan tercatat.
          </p>
        </div>
      </div>

      {/* Antrean — hanya untuk konselor */}
      {isKonselor && queue.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Inbox size={13} /> Antrean Menunggu ({queue.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">{queue.map((s) => renderCard(s, true))}</div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2">
          {isKonselor ? 'Sesi Saya' : 'Percakapan Aktif'}
        </h2>

        {mine.length === 0 ? (
          <div className="card-premium p-10 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--cream)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <MessageCircle size={30} />
            </div>
            <div>
              <p className="font-bold text-[var(--brown-dark)]">Belum ada sesi konseling</p>
              <p className="text-sm text-[var(--text-muted)]">
                Mulai percakapan dengan konselor, atau buat janji temu.
              </p>
            </div>
            <Link href="/booking" className="text-[var(--terra)] text-sm font-bold hover:underline inline-block">
              Lihat Jadwal Konselor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">{mine.map((s) => renderCard(s, false))}</div>
        )}
      </div>

      {/* Mulai percakapan baru — anggota saja */}
      {!isKonselor && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2">
            Mulai Percakapan
          </h2>
          <div className="card-premium p-5 sm:p-6 flex items-center gap-4 bg-gradient-to-br from-white to-[var(--cream)]">
            <div className="w-12 h-12 rounded-xl bg-[var(--sage)]/10 flex items-center justify-center text-[var(--sage)] shrink-0">
              <User size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Layanan Cepat
              </p>
              <h4 className="font-bold text-[var(--brown-dark)] text-sm sm:text-base">
                Terhubung dengan konselor
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Ditugaskan otomatis ke konselor yang paling longgar.
              </p>
            </div>
            <StartChatButton />
          </div>
        </div>
      )}
    </div>
  )
}

// src/app/chat/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  MessageCircle, 
  User, 
  Clock, 
  ChevronRight,
  Plus,
  ShieldCheck
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'
import { StartChatButton } from './chat-buttons'

export const dynamic = 'force-dynamic'

export default async function ChatListPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch active chat sessions
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select(`
      id,
      status,
      created_at,
      updated_at,
      last_message,
      konselor:profiles!chat_sessions_konselor_id_fkey(id, full_name, avatar_url),
      member:profiles!chat_sessions_member_id_fkey(id, full_name, avatar_url)
    `)
    .or(`member_id.eq.${user.id},konselor_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--brown-dark)]">Konseling Private</h1>
          <p className="text-sm text-[var(--text-muted)]">Ruang aman dan rahasia untuk berkonsultasi dengan konselor kami.</p>
        </div>
        <Link href="/booking" className="btn-primary !w-auto flex items-center gap-2">
          <Plus size={18} />
          Booking Sesi Baru
        </Link>
      </div>

      {/* Safety Banner */}
      <div className="bg-gradient-to-r from-[var(--sage)] to-[#4d6a52] rounded-[2rem] p-6 text-white shadow-xl shadow-[var(--sage)]/20 flex items-center gap-6">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h3 className="font-bold text-lg">Keamanan Terjamin</h3>
          <p className="text-sm text-white/80 leading-relaxed">
            Semua percakapan dienkripsi dan hanya dapat diakses oleh Anda dan konselor yang bertugas.
          </p>
        </div>
      </div>

      {/* Chat List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2">Percakapan Aktif</h2>
        
        {(!sessions || sessions.length === 0) ? (
          <div className="card-premium p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--cream)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
              <MessageCircle size={32} />
            </div>
            <div>
              <p className="font-bold text-[var(--brown-dark)]">Belum ada sesi konseling</p>
              <p className="text-sm text-[var(--text-muted)]">Silakan buat janji temu atau hubungi konselor online.</p>
            </div>
            <Link href="/booking" className="text-[var(--terra)] text-sm font-bold hover:underline inline-block">
              Lihat Jadwal Konselor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {(sessions as any[]).map((session: any) => {
              const isMember = session.member?.id === user.id
              const otherUser = isMember ? session.konselor : session.member
              
              return (
                <Link 
                  key={session.id} 
                  href={`/chat/${session.id}`}
                  className="card-premium p-5 flex items-center gap-5 hover-lift group"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white font-bold text-xl shadow-md">
                      {otherUser?.full_name?.charAt(0) ?? 'K'}
                    </div>
                    {session.status === 'active' && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-4 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors">
                        {otherUser?.full_name ?? 'Konselor UPK-Kr'}
                      </h3>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {getRelativeTime(session.updated_at)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] truncate opacity-80">
                      {session.last_message || 'Belum ada pesan...'}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-[var(--cream)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--terra)] group-hover:text-white transition-all">
                    <ChevronRight size={20} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Recommended Counselors */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] px-2">Konselor Tersedia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-premium p-6 flex items-center gap-4 bg-gradient-to-br from-white to-[var(--cream)]">
             <div className="w-12 h-12 rounded-xl bg-[var(--sage)]/10 flex items-center justify-center text-[var(--sage)]">
               <User size={24} />
             </div>
             <div className="flex-1">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Layanan Cepat</p>
                <h4 className="font-bold text-[var(--brown-dark)]">Konselor Jaga</h4>
             </div>
             <StartChatButton />
          </div>
          
          <div className="card-premium p-6 flex items-center gap-4 bg-gradient-to-br from-white to-[var(--cream)]">
             <div className="w-12 h-12 rounded-xl bg-[var(--terra)]/10 flex items-center justify-center text-[var(--terra)]">
               <Clock size={24} />
             </div>
             <div className="flex-1">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Antrian</p>
                <h4 className="font-bold text-[var(--brown-dark)]">Lihat Riwayat</h4>
             </div>
             <button className="px-4 py-2 bg-[var(--cream-dark)] text-[var(--brown)] text-xs font-bold rounded-lg hover:bg-[var(--cream)] transition-all">
                Riwayat
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}

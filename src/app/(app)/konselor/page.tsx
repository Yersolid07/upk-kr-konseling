// src/app/konselor/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  MessageSquare, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

import { CounselorOnboarding } from '@/components/konselor/counselor-onboarding'

export const dynamic = 'force-dynamic'

export default async function KonselorDashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Verify role and setup status using select('*') to avoid crashing if SQL not run yet
  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile || (profile.role !== 'konselor' && profile.role !== 'admin' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  const needsSetup = profile.role === 'konselor' && profile.is_counselor_setup_completed !== true

  // Fetch pending SOS/urgent sessions
  const { data: urgentSessions } = await supabase
    .from('chat_sessions')
    .select('*, member:profiles!chat_sessions_member_id_fkey(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch upcoming bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, member:profiles!bookings_member_id_fkey(*)')
    .eq('konselor_id', user.id)
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })

  // Fetch active chats
  const { data: activeChats } = await supabase
    .from('chat_sessions')
    .select('*, member:profiles!chat_sessions_member_id_fkey(*)')
    .eq('konselor_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-20">
      {needsSetup && <CounselorOnboarding />}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--cream-dark)]">
         <div className="space-y-1">
            <h1 className="font-[var(--font-playfair)] text-4xl font-black text-[var(--brown-dark)]">Dashboard Pelayanan</h1>
            <p className="text-sm text-[var(--text-muted)]">Kelola sesi konseling dan berikan pendampingan bagi jiwa-jiwa.</p>
         </div>
         <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               Status: Siaga Pelayanan
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         
         {/* Left: Urgent & Bookings (8 cols) */}
         <div className="lg:col-span-8 space-y-10">
            
            {/* Urgent Alerts (SOS) */}
            {urgentSessions && urgentSessions.length > 0 && (
               <section className="space-y-4">
                  <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                     <ShieldAlert size={16} /> Permintaan Bantuan Darurat (SOS)
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                     {(urgentSessions as any[]).map(session => (
                        <div key={session.id} className="card-premium p-6 bg-red-50 border-red-100 flex items-center justify-between gap-6 animate-pulse">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center">
                                 <AlertCircle size={24} />
                              </div>
                              <div>
                                 <h3 className="font-bold text-red-900">{session.topic || 'Butuh Bantuan Segera'}</h3>
                                 <p className="text-xs text-red-700 font-medium">{getRelativeTime(session.created_at)} · Dari: {(session.member as any)?.full_name || 'Anggota'}</p>
                              </div>
                           </div>
                           <Link 
                             href={`/chat/${session.id}`}
                             className="px-6 py-3 bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                           >
                              Respon Sekarang
                           </Link>
                        </div>
                     ))}
                  </div>
               </section>
            )}

            {/* Upcoming Bookings */}
            <section className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">Jadwal Janji Temu</h2>
                  <Link href="#" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--terra)]">Lihat Kalender</Link>
               </div>
               <div className="grid grid-cols-1 gap-4">
                  {(!bookings || bookings.length === 0) ? (
                     <div className="card-premium p-12 text-center text-[var(--text-muted)] italic text-sm">
                        Belum ada jadwal janji temu yang tertunda.
                     </div>
                  ) : (bookings as any[]).map(booking => (
                     <div key={booking.id} className="card-premium p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover-lift">
                        <div className="flex items-center gap-5">
                           <div className="w-14 h-14 bg-[var(--cream)] rounded-2xl flex flex-col items-center justify-center text-[var(--brown-dark)] shrink-0 border border-[var(--cream-dark)]">
                              <span className="text-[9px] font-black uppercase tracking-tighter">{new Date(booking.scheduled_at).toLocaleDateString('id-ID', { month: 'short' })}</span>
                              <span className="text-xl font-black leading-none">{new Date(booking.scheduled_at).getDate()}</span>
                           </div>
                           <div className="space-y-1">
                              <h3 className="font-bold text-[var(--brown-dark)]">{(booking.member as any)?.full_name}</h3>
                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-3">
                                 <span className="flex items-center gap-1"><Clock size={12} /> {new Date(booking.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                 <span>•</span>
                                 <span className="italic">"{booking.topic || 'Konseling Umum'}"</span>
                              </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button className="px-4 py-2 bg-[var(--sage)]/10 text-[var(--sage)] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--sage)]/20 transition-all">Konfirmasi</button>
                           <button className="px-4 py-2 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-100 transition-all">Tolak</button>
                        </div>
                     </div>
                  ))}
               </div>
            </section>
         </div>

         {/* Right Sidebar: Active Chats & Stats (4 cols) */}
         <aside className="lg:col-span-4 space-y-10">
            
            {/* Quick Stats */}
            <section className="grid grid-cols-2 gap-4">
               <div className="card-premium p-6 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] text-white">
                  <span className="text-2xl font-black">{activeChats?.length || 0}</span>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Chat Aktif</p>
               </div>
               <div className="card-premium p-6 bg-white text-[var(--brown-dark)]">
                  <span className="text-2xl font-black">12</span>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Total Sesi</p>
               </div>
            </section>

            {/* Active Sessions List */}
            <section className="space-y-6">
               <h3 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-widest flex items-center gap-2 px-2">
                  <MessageSquare size={16} className="text-[var(--terra)]" /> Konseling Berjalan
               </h3>
               <div className="space-y-3">
                  {(!activeChats || activeChats.length === 0) ? (
                     <p className="text-xs text-[var(--text-muted)] italic px-2">Tidak ada chat aktif saat ini.</p>
                  ) : (activeChats as any[]).map(chat => (
                     <Link key={chat.id} href={`/chat/${chat.id}`} className="card-premium p-4 flex items-center gap-4 hover-lift group">
                        <div className="w-10 h-10 rounded-full bg-[var(--cream)] flex items-center justify-center text-[var(--brown)] font-bold text-sm">
                           {(chat.member as any)?.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="text-sm font-bold text-[var(--brown-dark)] truncate">{(chat.member as any)?.full_name}</h4>
                           <p className="text-[10px] text-[var(--text-muted)] truncate">{chat.last_message || 'Siap melayani...'}</p>
                        </div>
                        <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--terra)] transition-colors" />
                     </Link>
                  ))}
               </div>
            </section>

            {/* Counselor Note */}
            <section className="card-premium p-6 bg-[var(--cream)] border-none">
               <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 size={20} className="text-[var(--sage)]" />
                  <h3 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-widest">Etika Konselor</h3>
               </div>
               <ul className="space-y-3">
                  {[
                     'Menjaga kerahasiaan penuh sesi anggota.',
                     'Memberikan respon berbasis Kasih Kristus.',
                     'Merujuk ke tenaga medis jika ada indikasi klinis.'
                  ].map((note, i) => (
                     <li key={i} className="text-xs text-[var(--text-muted)] leading-relaxed flex gap-2">
                        <span className="text-[var(--terra)]">•</span> {note}
                     </li>
                  ))}
               </ul>
            </section>

         </aside>

      </div>
    </div>
  )
}

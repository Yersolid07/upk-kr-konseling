// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatCard } from '@/components/dashboard/stat-card'
import { VerseBanner } from '@/components/dashboard/verse-banner'
import { 
  MessageSquare, 
  UserCheck, 
  Users, 
  ArrowRight,
  PlusCircle,
  Calendar,
  Heart,
  Flame,
  Bookmark,
  ChevronRight
} from 'lucide-react'
import { HandsPraying } from '@/components/icons/HandsPraying'
import { cn, getRelativeTime } from '@/lib/utils'

import { getDailyVerse } from '@/lib/bible'
import { SOSButton } from './sos-button'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  // Fetch today's verse from DB
  const todayDate = new Date().toISOString().split('T')[0]
  const { data: verse } = await supabase
    .from('daily_verses')
    .select('*')
    .eq('display_date', todayDate)
    .maybeSingle()

  const verseData = verse as any
  const v = verseData 
    ? { text: verseData.verse_text, ref: verseData.verse_ref } 
    : getDailyVerse()

  // Parallel data fetching for stats
  const [threadsRes, prayersRes, konselorRes, membersRes] = await Promise.all([
    supabase.from('threads').select('id', { count: 'exact', head: true }),
    supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('role', 'konselor').eq('is_online', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  // Recent threads with author details
  const { data: recentThreads } = await supabase
    .from('threads')
    .select(`
      id, title, is_anonymous, created_at, comment_count, view_count,
      author:profiles(id, full_name, anon_token),
      category:thread_categories(name, slug, icon, color)
    `)
    .order('created_at', { ascending: false })
    .limit(4)

  // Fetch user profile to get role and name
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
  const profileData = profile as any

  const firstName = profileData?.full_name ? profileData.full_name.split(' ')[0] : 'Sahabat Terkasih'
  const isAdmin = profileData?.role === 'admin' || profileData?.role === 'super_admin'

  return (
    <div className="space-y-12 animate-fade-in max-w-7xl mx-auto">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-[var(--cream-dark)]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="px-4 py-1.5 rounded-full bg-[var(--terra)]/10 text-[var(--terra)] text-[11px] font-black uppercase tracking-[0.2em] shadow-sm">
                Komunitas Aktif
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold border border-green-100">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
             </div>
          </div>
          <h1 className="font-[var(--font-playfair)] text-5xl md:text-6xl font-black text-[var(--brown-dark)] leading-[1.1] tracking-tight">
            Selamat Datang, <br />
            <span className="text-gradient">{firstName}</span>
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <Link href="/chat" className="px-8 py-4 bg-[var(--brown-dark)] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--brown)] transition-all shadow-2xl shadow-[var(--brown-dark)]/20 active:scale-95 flex items-center gap-2">
             <MessageSquare size={18} /> Chat Konselor
           </Link>
           <Link href="/booking" className="px-8 py-4 bg-white text-[var(--brown-dark)] text-sm font-black uppercase tracking-widest rounded-2xl border border-[var(--brown)]/10 hover:border-[var(--brown)]/30 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2">
             <Calendar size={18} /> Buat Pertemuan
           </Link>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Content Area (8 cols) */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Verse Banner */}
          <VerseBanner text={v.text} reference={v.ref} />

          {/* Stat Cards Grid (Admin Only) */}
          {isAdmin && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard 
                label="Diskusi" 
                value={threadsRes.count ?? 0} 
                icon={<MessageSquare className="text-[var(--terra)]" />} 
                color="rgba(var(--terra-rgb), 0.1)"
              />
              <StatCard 
                label="Didoakan" 
                value={prayersRes.count ?? 0} 
                icon={<HandsPraying className="text-[var(--gold)]" />} 
                color="rgba(var(--gold-rgb), 0.1)"
              />
              <StatCard 
                label="Konselor" 
                value={konselorRes.count ?? 0} 
                icon={<UserCheck className="text-[var(--sage)]" />} 
                color="rgba(var(--sage-rgb), 0.1)"
              />
              <StatCard 
                label="Anggota" 
                value={membersRes.count ?? 0} 
                icon={<Users className="text-[var(--brown)]" />} 
                color="rgba(var(--brown-rgb), 0.1)"
              />
            </section>
          )}

          {/* Recent Activity */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--brown-dark)]">Diskusi Terbaru</h2>
              <Link href="/forum" className="text-sm font-black text-[var(--terra)] uppercase tracking-widest hover:underline flex items-center gap-1 group">
                Lihat Semua <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {!recentThreads || recentThreads.length === 0 ? (
                <div className="card-premium p-12 text-center text-[var(--text-muted)] italic">
                  Belum ada diskusi terbaru.
                </div>
              ) : (recentThreads as any[]).map((thread: any) => (
                <Link 
                  key={thread.id} 
                  href={`/forum/${thread.id}`}
                  className="card-premium p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover-lift group"
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg shrink-0" style={{ backgroundColor: (thread.category as any)?.color || 'var(--terra)' }}>
                      {(thread.category as any)?.icon || '✝'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          {(thread.category as any)?.name || 'Umum'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] opacity-50">•</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          {getRelativeTime(thread.created_at)}
                        </span>
                      </div>
                      <h3 className="font-bold text-[var(--brown-dark)] text-lg truncate group-hover:text-[var(--terra)] transition-colors">
                        {thread.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-[var(--text-muted)] shrink-0 px-2">
                     <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-[var(--brown-dark)]">{thread.comment_count}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Komentar</span>
                     </div>
                     <div className="w-px h-8 bg-[var(--cream-dark)]" />
                     <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-[var(--brown-dark)]">{thread.view_count}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Dilihat</span>
                     </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-10">
          
          {/* SOS Action Card */}
          <SOSButton />

          {/* Prayer Wall Preview */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-widest flex items-center gap-2">
                <Heart size={16} className="text-[var(--terra)]" /> Prayer Wall
              </h3>
              <Link href="/prayer" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--terra)]">
                Lihat Semua
              </Link>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-premium p-5 space-y-3 bg-gradient-to-br from-white to-[var(--cream)]">
                   <p className="text-sm italic text-[var(--text)] leading-relaxed line-clamp-3">
                     "Mohon dukungan doa untuk perkuliahan semester ini agar diberikan hikmat dan kesabaran..."
                   </p>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Anonim#A3F{i}</span>
                      <div className="flex items-center gap-1.5 text-[var(--gold)]">
                         <HandsPraying size={14} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Amin</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </section>

          {/* Articles Preview */}
          <section className="space-y-6">
            <h3 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-widest flex items-center gap-2 px-2">
              <Bookmark size={16} className="text-[var(--sage)]" /> Artikel Pilihan
            </h3>
            <div className="space-y-4">
               {[1, 2].map((i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-3 shadow-md">
                       <img 
                         src={`https://picsum.photos/seed/${i+100}/800/450`} 
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                         alt="Article"
                       />
                    </div>
                    <h4 className="font-bold text-[var(--brown-dark)] text-sm leading-tight group-hover:text-[var(--terra)] transition-colors">
                      Cara Menjaga Kesehatan Mental di Tengah Tekanan Tugas Akhir
                    </h4>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium mt-1 block">5 Menit Baca</span>
                  </div>
               ))}
            </div>
          </section>

        </aside>

      </div>
      
      {/* Quick Action FAB for Mobile */}
      <Link 
        href="/forum/new" 
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] text-white rounded-full shadow-2xl flex items-center justify-center lg:hidden z-40 active:scale-90 transition-transform"
      >
        <PlusCircle size={28} />
      </Link>
    </div>
  )
}

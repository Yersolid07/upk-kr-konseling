// src/app/prayer/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  Heart, 
  Plus, 
  MessageCircle, 
  Shield, 
  Users,
  Search
} from 'lucide-react'
import { HandsPraying } from '@/components/icons/HandsPraying'
import { cn, getRelativeTime } from '@/lib/utils'

import { PrayerCard } from '@/components/prayer/PrayerCard'

export const dynamic = 'force-dynamic'

export default async function PrayerWallPage() {
  const supabase = createClient()

  const { data: prayers } = await supabase
    .from('prayer_requests')
    .select(`
      id, content, is_anonymous, pray_count, created_at,
      author:profiles(id, full_name, anon_token)
    `)
    .order('created_at', { ascending: false })
    .limit(30)

  // Real stats
  const { count: totalPrayers } = await supabase.from('prayer_requests').select('*', { count: 'exact', head: true })
  const totalSupports = (prayers as any[])?.reduce((sum: number, p: any) => sum + (p.pray_count || 0), 0) ?? 0

  return (
    <div className="space-y-10 animate-fade-in max-w-6xl mx-auto pb-20">
      {/* Hero Section */}
      <section className="relative rounded-[3rem] overflow-hidden bg-[var(--brown-dark)] p-10 md:p-16 text-center space-y-6">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--gold)]/20 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 space-y-4">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[var(--gold-light)] text-xs font-bold uppercase tracking-widest">
             <Heart size={14} className="animate-pulse" /> Komunitas Saling Mendoakan
           </div>
           <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-black text-white">Prayer Wall</h1>
           <p className="text-[var(--cream-dark)] opacity-70 max-w-2xl mx-auto text-lg leading-relaxed">
             "Sebab di mana dua atau tiga orang berkumpul dalam Nama-Ku, di situ Aku ada di tengah-tengah mereka." — Matius 18:20
           </p>
        </div>

        <div className="relative z-10 pt-6">
           <Link href="/prayer/new" className="px-8 py-4 bg-[var(--gold)] text-[var(--brown-dark)] font-black rounded-2xl hover:bg-[var(--gold-light)] transition-all shadow-2xl shadow-[var(--gold)]/20 active:scale-95 inline-flex items-center gap-2">
             <Plus size={20} />
             Kirim Pokok Doa
           </Link>
        </div>
      </section>

      {/* Stats & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
         <div className="flex items-center gap-8">
            <div className="text-center">
               <div className="text-2xl font-bold text-[var(--brown-dark)]">{totalPrayers ?? 0}</div>
               <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Doa Terkirim</div>
            </div>
            <div className="text-center">
               <div className="text-2xl font-bold text-[var(--sage)]">{totalSupports}</div>
               <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Telah Didoakan</div>
            </div>
         </div>

         <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Cari pokok doa..." 
              className="w-full pl-12 pr-6 py-3.5 bg-white border border-[var(--cream-dark)] rounded-2xl text-sm focus:ring-4 focus:ring-[var(--gold)]/10 transition-all outline-none"
            />
         </div>
      </div>

      {/* Masonry-like Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 px-4">
        {(prayers as any[])?.map((p: any) => (
          <PrayerCard key={p.id} prayer={p} />
        ))}
      </div>

      {/* Floating Action Button for Mobile */}
      <Link href="/prayer/new" className="md:hidden fixed bottom-8 right-8 w-16 h-16 bg-[var(--gold)] rounded-full shadow-2xl flex items-center justify-center text-[var(--brown-dark)] z-50 animate-bounce">
         <Plus size={32} />
      </Link>
    </div>
  )
}

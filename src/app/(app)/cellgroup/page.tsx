// src/app/cellgroup/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { 
  Users, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Heart,
  ShieldCheck,
  Plus
} from 'lucide-react'
import Link from 'next/link'

export default async function CellGroupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      <section className="text-center space-y-4">
        <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-black text-[var(--brown-dark)]">Cell Group</h1>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
          Temukan komunitas kecil untuk tumbuh bersama dalam iman dan persaudaraan.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Your Cell Group (Placeholder) */}
        <div className="card-premium p-10 border-2 border-dashed border-[var(--cream-dark)] bg-white/50 flex flex-col items-center justify-center text-center space-y-6">
           <div className="w-20 h-20 bg-[var(--cream)] rounded-full flex items-center justify-center text-[var(--text-muted)]">
              <Users size={40} />
           </div>
           <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--brown-dark)]">Belum Ada Group</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                 Anda belum bergabung dengan Cell Group manapun. Bergabunglah untuk mendapatkan dukungan komunitas.
              </p>
           </div>
           <button className="btn-primary !w-auto flex items-center gap-2">
              <Plus size={18} /> Cari Cell Group
           </button>
        </div>

        {/* Featured / Nearby Groups */}
        <div className="space-y-4">
           <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Group Populer</h3>
           {[1, 2, 3].map((i) => (
             <div key={i} className="card-premium p-6 flex items-center gap-6 hover-lift group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">
                   {String.fromCharCode(64 + i)}
                </div>
                <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-[var(--brown-dark)] text-lg group-hover:text-[var(--terra)] transition-colors">Fellowship Teknik {i}</h4>
                   <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                         <MapPin size={12} /> Malalayang
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                         <Calendar size={12} /> Jumat, 18:00
                      </div>
                   </div>
                </div>
                <ChevronRight size={20} className="text-[var(--cream-dark)] group-hover:text-[var(--terra)] transition-all" />
             </div>
           ))}
        </div>
      </div>

      {/* Info section */}
      <div className="bg-[var(--sage)]/10 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-10 border border-[var(--sage)]/20">
         <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[var(--sage)] shadow-xl shadow-[var(--sage)]/10 shrink-0">
            <ShieldCheck size={40} />
         </div>
         <div className="space-y-2 flex-1 text-center md:text-left">
            <h3 className="font-bold text-[var(--brown-dark)] text-2xl">Keanggotaan Terverifikasi</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
               Setiap Cell Group dipimpin oleh kakak pembina yang telah terverifikasi dan dibimbing langsung oleh alumni senior UPK-Kr.
            </p>
         </div>
         <Link href="/contact" className="text-sm font-black text-[var(--sage)] uppercase tracking-widest hover:underline flex items-center gap-2">
            Pelajari Lebih Lanjut <ChevronRight size={16} />
         </Link>
      </div>
    </div>
  )
}

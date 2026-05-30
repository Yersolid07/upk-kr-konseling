// src/app/booking/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  Calendar, 
  Clock, 
  User, 
  Info, 
  CheckCircle, 
  ArrowRight,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function BookingPage() {
  const supabase = createClient()

  // Fetch verified counselors
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, full_name, specialization, avatar_url, bio')
    .eq('role', 'konselor')
    .eq('is_verified', true)

  const konselors = profileData as any[]

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      {/* Hero Header */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--terra)]/10 text-[var(--terra)] text-xs font-bold uppercase tracking-widest">
          <Calendar size={14} /> Penjadwalan Sesi
        </div>
        <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-black text-[var(--brown-dark)]">
           Temukan Waktu <span className="text-gradient">Terbaik Anda</span>
        </h1>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-lg">
           Pilih konselor dan jadwalkan sesi tatap muka atau online secara privat.
        </p>
      </section>

      {/* Booking Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { step: '01', title: 'Pilih Konselor', desc: 'Cari konselor yang sesuai dengan kebutuhan Anda.' },
          { step: '02', title: 'Tentukan Waktu', desc: 'Lihat ketersediaan jadwal mereka secara realtime.' },
          { step: '03', title: 'Konfirmasi', desc: 'Dapatkan pengingat sesi melalui email/notifikasi.' },
        ].map((s, i) => (
          <div key={i} className="card-premium p-8 relative overflow-hidden group">
             <div className="text-5xl font-black text-[var(--cream-dark)] absolute -top-2 -right-2 group-hover:text-[var(--terra)]/10 transition-colors">{s.step}</div>
             <h3 className="font-bold text-[var(--brown-dark)] text-lg mb-2 relative z-10">{s.title}</h3>
             <p className="text-sm text-[var(--text-muted)] leading-relaxed relative z-10">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Counselor Selection */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
           <h2 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--brown-dark)]">Daftar Konselor</h2>
           <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
             <Shield size={14} className="text-[var(--sage)]" /> Terverifikasi oleh UPK-Kr
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {konselors?.map((k) => (
            <div key={k.id} className="card-premium p-8 flex flex-col sm:flex-row gap-6 hover-lift">
               <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white text-3xl font-bold shadow-xl shrink-0 mx-auto sm:mx-0">
                  {k.full_name.charAt(0)}
               </div>
               <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <h3 className="text-xl font-black text-[var(--brown-dark)]">{k.full_name}</h3>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                       {k.specialization?.map((s: string) => (
                         <span key={s} className="px-2 py-0.5 rounded-full bg-[var(--cream-dark)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-wider">{s}</span>
                       ))}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-2 italic leading-relaxed">
                    "{k.bio || 'Siap melayani dan mendengarkan keluh kesah Anda dengan kasih Kristus.'}"
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                     <Link 
                       href={`/booking/${k.id}`} 
                       className="flex-1 px-6 py-3 bg-[var(--brown-dark)] text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[var(--brown)] transition-all flex items-center justify-center gap-2"
                     >
                       <Calendar size={14} /> Pilih Jadwal
                     </Link>
                     <Link 
                       href={`/chat?id=${k.id}`} 
                       className="px-6 py-3 bg-[var(--terra)]/10 text-[var(--terra)] text-xs font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[var(--terra)]/20 transition-all flex items-center justify-center gap-2"
                     >
                       <Clock size={14} /> Tanya Dulu
                     </Link>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-[var(--cream-dark)]/50 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-8 border border-[var(--cream-dark)]">
         <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[var(--brown)] shadow-inner shrink-0">
           <Info size={32} />
         </div>
         <div className="space-y-2 flex-1 text-center md:text-left">
            <h4 className="font-bold text-[var(--brown-dark)] text-xl">Butuh Sesi Darurat?</h4>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
               Jika Anda merasa dalam keadaan krisis atau butuh bantuan segera, silakan gunakan tombol SOS di dashboard atau hubungi hotline kami melalui WhatsApp.
            </p>
         </div>
         <Link href="/hotline" className="px-8 py-4 bg-white text-[var(--brown-dark)] font-bold rounded-2xl border border-[var(--brown)]/20 shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap">
            Hubungi Hotline
         </Link>
      </div>
    </div>
  )
}

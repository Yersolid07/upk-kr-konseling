// src/app/booking/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react'
import { BookingForm } from './booking-form'

export const dynamic = 'force-dynamic'

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Fetch counselor details
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .eq('role', 'konselor')
    .single()

  const konselor = profileData as any

  if (!konselor) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header Navigation */}
      <Link href="/booking" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Pilih Konselor Lain
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Counselor Profile Info (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-premium p-8 text-center space-y-6 sticky top-8">
             <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white text-5xl font-black shadow-2xl mx-auto ring-8 ring-[var(--cream)]">
                {konselor.full_name.charAt(0)}
             </div>
             <div>
                <h2 className="text-2xl font-black text-[var(--brown-dark)]">{konselor.full_name}</h2>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                   {konselor.specialization?.map((s: string) => (
                     <span key={s} className="px-2 py-0.5 rounded-full bg-[var(--terra)]/10 text-[var(--terra)] text-[9px] font-black uppercase tracking-wider">{s}</span>
                   ))}
                </div>
             </div>
             
             <div className="w-full h-px bg-[var(--cream-dark)]" />
             
             <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-lg bg-[var(--sage)]/10 flex items-center justify-center text-[var(--sage)] shrink-0">
                      <ShieldCheck size={18} />
                   </div>
                   <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Konselor profesional berlisensi dan terverifikasi oleh UPK-Kr.
                   </p>
                </div>
                <div className="flex items-start gap-3">
                   <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)] shrink-0">
                      <Info size={18} />
                   </div>
                   <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Sesi tersedia dalam durasi 45-60 menit.
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* Right: Booking Form (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
           <section className="card-premium p-8 space-y-8">
              <div className="space-y-1">
                 <h3 className="font-[var(--font-playfair)] text-3xl font-black text-[var(--brown-dark)]">Atur Pertemuan</h3>
                 <p className="text-sm text-[var(--text-muted)]">Pilih tanggal dan waktu yang paling sesuai untuk Anda.</p>
              </div>

              <BookingForm 
                 konselorId={konselor.id} 
                 schedule={konselor.counselor_schedule} 
              />
           </section>

           {/* FAQ / Info */}
           <div className="bg-[var(--cream)]/30 rounded-3xl p-6 border border-[var(--cream-dark)] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--brown)] shadow-sm shrink-0">
                 <MapPin size={20} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-sm font-bold text-[var(--brown-dark)]">Lokasi & Metode</h4>
                 <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Pertemuan dapat dilakukan secara luring (offline) di kantor UPK-Kr atau secara daring (online) melalui link meeting yang akan dikirimkan setelah konfirmasi.
                 </p>
              </div>
           </div>
        </div>

      </div>
    </div>
  )
}

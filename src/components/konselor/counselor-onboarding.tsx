'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Info } from 'lucide-react'

export function CounselorOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [schedule, setSchedule] = useState({
    Senin: '10:00-12:00, 15:00-17:00',
    Selasa: '',
    Rabu: '',
    Kamis: '',
    Jumat: '19:00-21:00',
    Sabtu: '10:00-12:00',
    Minggu: ''
  })
  const [certificate, setCertificate] = useState('')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Transform simple text format to array of objects if needed, but saving as raw JSON is fine
    // Or save string to parse later
    const jsonSchedule = {
      Senin: schedule.Senin.split(',').map(s => s.trim()).filter(Boolean),
      Selasa: schedule.Selasa.split(',').map(s => s.trim()).filter(Boolean),
      Rabu: schedule.Rabu.split(',').map(s => s.trim()).filter(Boolean),
      Kamis: schedule.Kamis.split(',').map(s => s.trim()).filter(Boolean),
      Jumat: schedule.Jumat.split(',').map(s => s.trim()).filter(Boolean),
      Sabtu: schedule.Sabtu.split(',').map(s => s.trim()).filter(Boolean),
      Minggu: schedule.Minggu.split(',').map(s => s.trim()).filter(Boolean),
    }

    const { error } = await (supabase
      .from('profiles') as any)
      .update({
        counselor_schedule: jsonSchedule,
        counselor_certificate: certificate,
        is_counselor_setup_completed: true
      })
      .eq('id', user.id)

    if (error) {
      alert('Gagal menyimpan data: ' + error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 mb-2">
           <CheckCircle2 size={24} className="text-[var(--terra)]" />
           <h2 className="font-[var(--font-playfair)] text-3xl font-black text-[var(--brown-dark)]">
             Selamat Datang, Konselor!
           </h2>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          Sebelum melayani, harap lengkapi profil dan jadwal rutin (jam kerja) Anda. Anggota hanya dapat membuat pertemuan berdasarkan jam kerja yang Anda tetapkan di bawah ini.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-3">
             <label className="text-xs font-black uppercase tracking-widest text-[var(--brown-dark)]">
               Sertifikasi / Latar Belakang (Opsional)
             </label>
             <input 
               type="text" 
               value={certificate}
               onChange={e => setCertificate(e.target.value)}
               placeholder="Contoh: S.Psi, M.Psi, atau Pengalaman Pelayanan 5 Tahun" 
               className="w-full bg-[var(--cream)]/30 border border-[var(--cream-dark)] rounded-xl p-3 text-sm outline-none focus:border-[var(--terra)]"
             />
          </div>

          <div className="space-y-4 pt-4">
             <label className="text-xs font-black uppercase tracking-widest text-[var(--brown-dark)] flex items-center gap-2">
               Jadwal Rutin Mingguan <Info size={14} className="text-[var(--text-muted)]" />
             </label>
             <p className="text-xs text-[var(--text-muted)] mb-4">
               Masukkan rentang waktu (misal: <b>10:00-12:00, 15:00-17:00</b>). Kosongkan hari jika Anda tidak sedia.
             </p>

             {Object.keys(schedule).map((day) => (
                <div key={day} className="flex items-center gap-4">
                   <div className="w-20 font-bold text-sm text-[var(--brown-dark)]">{day}</div>
                   <input 
                     type="text" 
                     value={schedule[day as keyof typeof schedule]}
                     onChange={e => setSchedule({...schedule, [day]: e.target.value})}
                     placeholder="Contoh: 10:00-12:00" 
                     className="flex-1 bg-white border border-[var(--cream-dark)] rounded-lg p-2 text-sm outline-none focus:border-[var(--terra)] transition-colors"
                   />
                </div>
             ))}
          </div>

          <div className="pt-8">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-[var(--brown-dark)] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[var(--brown)] transition-all disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Profil & Mulai Melayani'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

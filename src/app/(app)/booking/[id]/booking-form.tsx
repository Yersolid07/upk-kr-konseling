// src/app/booking/[id]/booking-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingFormProps {
  konselorId: string
  schedule?: any
}

export function BookingForm({ konselorId, schedule }: BookingFormProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  // Generate slots dynamically based on counselor's schedule
  const timeSlots: string[] = []
  if (selectedDate && schedule) {
    const dateObj = new Date(selectedDate)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const dayName = days[dateObj.getDay()]
    const daySchedule = schedule[dayName] || []

    // If daySchedule is ["10:00-12:00"], generate "10:00" and "11:00"
    daySchedule.forEach((range: string) => {
      const [start, end] = range.split('-')
      if (start && end) {
        let currentHour = parseInt(start.split(':')[0])
        const endHour = parseInt(end.split(':')[0])
        while (currentHour < endHour) {
          timeSlots.push(`${currentHour.toString().padStart(2, '0')}:00`)
          currentHour++
        }
      }
    })
  }

  // If no schedule set, fallback for demo purposes
  if (timeSlots.length === 0 && !schedule) {
    timeSlots.push('09:00', '10:30', '13:00', '14:30', '16:00')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedSlot || loading) return

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const scheduledAt = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString()

    const { data, error: bookingError } = await (supabase.from('bookings') as any)
      .insert({
        konselor_id: konselorId,
        member_id: user.id,
        scheduled_at: scheduledAt,
        topic: topic.trim(),
        status: 'pending'
      })
      .select()
      .single()

    if (bookingError) {
      setError('Gagal membuat janji. Silakan coba tanggal/waktu lain.')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // Auto redirect after 3s
      setTimeout(() => router.push('/dashboard'), 3000)
    }
  }

  if (success) {
    return (
      <div className="py-12 text-center space-y-6 animate-in zoom-in-95 duration-500">
         <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
            <CheckCircle2 size={40} />
         </div>
         <div className="space-y-2">
            <h3 className="text-2xl font-black text-[var(--brown-dark)]">Berhasil Dipesan!</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
               Jadwal Anda telah tercatat. Konselor akan melakukan konfirmasi segera melalui notifikasi.
            </p>
         </div>
         <div className="pt-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-[var(--terra)] font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-2 mx-auto"
            >
               Kembali ke Dashboard <ChevronRight size={16} />
            </button>
         </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
       {/* Date Selection */}
       <div className="space-y-4">
          <label className="text-xs font-black text-[var(--brown-dark)] uppercase tracking-widest flex items-center gap-2">
             <CalendarIcon size={14} className="text-[var(--terra)]" /> Pilih Tanggal
          </label>
          <input 
            type="date" 
            required
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-[var(--cream)]/30 border border-[var(--cream-dark)] rounded-2xl p-4 font-bold text-[var(--brown-dark)] outline-none focus:ring-4 focus:ring-[var(--terra)]/10 transition-all"
          />
       </div>

       {/* Slot Selection */}
       <div className="space-y-4">
          <label className="text-xs font-black text-[var(--brown-dark)] uppercase tracking-widest flex items-center gap-2">
             <Clock size={14} className="text-[var(--terra)]" /> Pilih Jam
          </label>
          {timeSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
               {timeSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "py-3 rounded-xl text-xs font-black transition-all border",
                      selectedSlot === slot 
                        ? "bg-[var(--brown-dark)] text-white border-[var(--brown-dark)] shadow-lg scale-105" 
                        : "bg-white text-[var(--text-muted)] border-[var(--cream-dark)] hover:border-[var(--terra)]/30"
                    )}
                  >
                     {slot}
                  </button>
               ))}
            </div>
          ) : (
             <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">
               Konselor tidak melayani pada hari yang dipilih.
             </div>
          )}
       </div>

       {/* Topic Input */}
       <div className="space-y-4">
          <label className="text-xs font-black text-[var(--brown-dark)] uppercase tracking-widest flex items-center gap-2">
             <MessageSquare size={14} className="text-[var(--terra)]" /> Apa yang ingin didiskusikan?
          </label>
          <textarea 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Tuliskan sedikit tentang alasan Anda ingin berkonsultasi (Opsional)"
            rows={3}
            className="w-full bg-[var(--cream)]/30 border border-[var(--cream-dark)] rounded-2xl p-4 text-sm resize-none outline-none focus:ring-4 focus:ring-[var(--terra)]/10 transition-all"
          />
       </div>

       {error && <p className="text-xs text-red-500 font-bold animate-shake">{error}</p>}

       <button 
         type="submit"
         disabled={!selectedDate || !selectedSlot || loading}
         className="w-full py-5 bg-[var(--brown-dark)] text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-[var(--brown)] transition-all shadow-2xl shadow-[var(--brown-dark)]/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
       >
          {loading ? 'Memproses...' : 'Konfirmasi Jadwal'}
       </button>
    </form>
  )
}

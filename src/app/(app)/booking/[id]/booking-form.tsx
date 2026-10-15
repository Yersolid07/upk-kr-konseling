// src/app/(app)/booking/[id]/booking-form.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Lock,
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
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [loadingSlots, setLoadingSlots] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Generate slots dynamically based on counselor's weekly schedule
  const timeSlots: string[] = []
  if (selectedDate && schedule) {
    const dateObj = new Date(`${selectedDate}T00:00:00`)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const dayName = days[dateObj.getDay()]
    const daySchedule = schedule[dayName] || []

    // daySchedule like ["10:00-12:00", "15:00-17:00"] -> "10:00","11:00",...
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

  // Fallback demo slots only when the counselor has no schedule configured at all
  if (timeSlots.length === 0 && !schedule) {
    timeSlots.push('09:00', '10:30', '13:00', '14:30', '16:00')
  }

  // Hide slots that are already in the past when booking for today
  const now = new Date()
  const isToday = selectedDate === now.toISOString().split('T')[0]
  const visibleSlots = isToday
    ? timeSlots.filter(slot => {
        const [h, m] = slot.split(':').map(Number)
        return h > now.getHours() || (h === now.getHours() && m > now.getMinutes())
      })
    : timeSlots

  // Fetch booked slots whenever the date changes (anti double-booking)
  useEffect(() => {
    let cancelled = false
    if (!selectedDate) {
      setBookedSlots(new Set())
      return
    }
    setLoadingSlots(true)
    ;(supabase as any)
      .rpc('get_booked_slots', { p_konselor_id: konselorId, p_date: selectedDate })
      .then(({ data }: { data: any[] | null }) => {
        if (cancelled) return
        const taken = new Set<string>()
        ;(data ?? []).forEach((row: any) => {
          const d = new Date(row.scheduled_at)
          taken.add(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
        })
        setBookedSlots(taken)
        setLoadingSlots(false)
      })
      .catch(() => setLoadingSlots(false))

    return () => { cancelled = true }
  }, [selectedDate, konselorId, supabase])

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

    const { error: bookingError } = await (supabase.from('bookings') as any)
      .insert({
        konselor_id: konselorId,
        member_id: user.id,
        scheduled_at: scheduledAt,
        topic: topic.trim() || null,
        status: 'pending',
      })
      .select()
      .single()

    if (bookingError) {
      // 23505 = unique_violation -> slot already taken (anti double-booking)
      if (bookingError.code === '23505') {
        setError('Maaf, slot waktu ini baru saja dipesan orang lain. Silakan pilih jam lain.')
        setBookedSlots(prev => new Set(prev).add(selectedSlot))
        setSelectedSlot('')
      } else {
        setError('Gagal membuat janji. Silakan coba tanggal/waktu lain.')
      }
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
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
          onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot('') }}
          className="w-full bg-[var(--cream)]/30 border border-[var(--cream-dark)] rounded-2xl p-4 font-bold text-[var(--brown-dark)] outline-none focus:ring-4 focus:ring-[var(--terra)]/10 transition-all"
        />
      </div>

      {/* Slot Selection */}
      <div className="space-y-4">
        <label className="text-xs font-black text-[var(--brown-dark)] uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} className="text-[var(--terra)]" /> Pilih Jam
          {loadingSlots && <span className="text-[9px] text-[var(--text-muted)] normal-case font-bold">memuat...</span>}
        </label>
        {visibleSlots.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {visibleSlots.map(slot => {
              const taken = bookedSlots.has(slot)
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={taken}
                  onClick={() => setSelectedSlot(slot)}
                  title={taken ? 'Sudah dipesan' : undefined}
                  className={cn(
                    'py-3 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1',
                    taken
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                      : selectedSlot === slot
                        ? 'bg-[var(--brown-dark)] text-white border-[var(--brown-dark)] shadow-lg scale-105'
                        : 'bg-white text-[var(--text-muted)] border-[var(--cream-dark)] hover:border-[var(--terra)]/30'
                  )}
                >
                  {taken && <Lock size={11} />}
                  {slot}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">
            {selectedDate
              ? 'Tidak ada jam tersedia pada tanggal ini. Konselor tidak melayani atau semua slot sudah terisi.'
              : 'Pilih tanggal terlebih dahulu untuk melihat jam tersedia.'}
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

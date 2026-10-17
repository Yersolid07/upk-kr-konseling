// src/components/konselor/booking-actions.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Check, X, Loader2, CheckCheck } from 'lucide-react'
import { decideBooking } from '@/app/(app)/konselor/actions'

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string
  status: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  async function decide(decision: 'confirmed' | 'cancelled' | 'completed', note?: string) {
    setBusy(decision)
    const res = await decideBooking({ bookingId, decision, reason: note })
    setBusy(null)
    if ('error' in res) return toast.error(res.error)
    toast.success(res.message)
    setRejecting(false)
    setReason('')
    router.refresh()
  }

  if (status !== 'pending') {
    if (status === 'confirmed') {
      return (
        <button
          onClick={() => decide('completed')}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--sage)]/10 text-[var(--sage)] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--sage)]/20 transition-all disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
          Tandai selesai
        </button>
      )
    }
    return (
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
        {status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => decide('confirmed')}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--sage)]/10 text-[var(--sage)] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--sage)]/20 transition-all disabled:opacity-50"
      >
        {busy === 'confirmed' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        Konfirmasi
      </button>
      <button
        onClick={() => setRejecting(true)}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
      >
        <X size={12} /> Tolak
      </button>

      {rejecting && (
        <div className="fixed inset-0 z-[140] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => !busy && setRejecting(false)}
          />
          <div className="relative flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
                <h2 className="font-bold text-[var(--brown-dark)] text-sm">Tolak janji temu</h2>
                <button onClick={() => setRejecting(false)} aria-label="Tutup">
                  <X size={16} className="text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Anggota menerima alasan ini lewat notifikasi. Tulis dengan jelas agar ia bisa
                  mencari jadwal lain.
                </p>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={300}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Contoh: jadwal bentrok, silakan pilih hari lain."
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRejecting(false)}
                    disabled={busy !== null}
                    className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (reason.trim().length < 5) return toast.error('Alasan minimal 5 karakter.')
                      decide('cancelled', reason.trim())
                    }}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busy === 'cancelled' && <Loader2 size={13} className="animate-spin" />}
                    Tolak janji
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

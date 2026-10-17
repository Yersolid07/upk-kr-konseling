// src/components/reports/report-button.tsx
// Tombol "Laporkan" untuk konten publik.
//
// Kenapa dialog, bukan window.prompt: alasan laporan adalah pilihan baku yang
// tersimpan terstruktur, sehingga antrean moderator bisa diurutkan dan
// dihitung. prompt() hanya menghasilkan teks bebas yang tidak bisa dianalisis.
//
// Tombol ini sengaja TIDAK menyembunyikan konten dari pelapor setelah laporan
// terkirim — memberi tahu bahwa laporan diterima sudah cukup, dan menyembunyikan
// dari pelapor saja akan menyesatkan (orang lain tetap melihatnya).

'use client'

import { useState } from 'react'
import { Flag, Loader2, X, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { submitReport } from '@/lib/reports/report-actions'
import { REPORT_REASONS, type ReportContentType } from '@/lib/reports/reasons'

interface Props {
  contentType: ReportContentType
  contentId: string
  /** Tampil sebagai ikon saja — untuk komentar. */
  compact?: boolean
  /** Pemilik konten: tombol disembunyikan. */
  isOwn?: boolean
}

export function ReportButton({ contentType, contentId, compact = false, isOwn = false }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('spam')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  // Melaporkan konten sendiri tidak masuk akal dan hanya mengotori antrean.
  if (isOwn) return null

  async function send() {
    setBusy(true)
    const res = await submitReport({ contentType, contentId, reason, detail: detail.trim() })
    setBusy(false)

    if ('error' in res) {
      toast.error(res.error)
      return
    }
    setDone(true)
    toast.success(res.message)
    setTimeout(() => {
      setOpen(false)
      setDone(false)
    }, 2200)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-red-600 transition-colors'
            : 'inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-red-600 transition-colors'
        }
        aria-label="Laporkan konten ini"
      >
        <Flag size={compact ? 11 : 14} />
        {!compact && 'Laporkan'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => !busy && setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
              <h2 className="font-bold text-[var(--brown-dark)] text-sm">Laporkan konten</h2>
              <button
                onClick={() => !busy && setOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--brown)]"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {done ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <p className="mt-3 text-sm font-semibold text-[var(--brown-dark)]">
                  Laporan terkirim
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Tim moderasi akan meninjaunya dan kamu akan mendapat notifikasi hasilnya.
                </p>
              </div>
            ) : (
              <>
                <div className="p-5 space-y-3">
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Pilih alasan yang paling sesuai. Laporan palsu yang berulang dapat
                    memengaruhi akunmu.
                  </p>

                  <div className="space-y-1.5">
                    {REPORT_REASONS.map((r) => (
                      <label
                        key={r.key}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${
                          reason === r.key
                            ? 'border-[var(--terra)] bg-[var(--terra)]/8 text-[var(--brown-dark)] font-semibold'
                            : 'border-[var(--cream-dark)] text-[var(--text-2)] hover:border-[var(--terra)]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="report-reason"
                          value={r.key}
                          checked={reason === r.key}
                          onChange={() => setReason(r.key)}
                          className="accent-[var(--terra)]"
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Keterangan tambahan (opsional)</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      maxLength={500}
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      placeholder="Ceritakan singkat apa yang membuat konten ini bermasalah."
                      style={{ resize: 'vertical' }}
                    />
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {detail.length}/500
                    </p>
                  </div>

                  {reason === 'bahaya-diri' && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-800 leading-relaxed">
                      <strong>Kalau kamu atau seseorang dalam bahaya sekarang:</strong> hubungi
                      119 ekst. 8 (Kemenkes) atau D&apos;Patens 24 jam di 0811 979 10000. Laporan
                      ini akan ditandai prioritas dan dilihat tim moderasi secepatnya.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={busy}
                    className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)]"
                  >
                    Batal
                  </button>
                  <button
                    onClick={send}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
                    Kirim laporan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

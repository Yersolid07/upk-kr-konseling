// src/components/admin/confirm-dialog.tsx
// Dialog konfirmasi bertingkat untuk tindakan yang tidak bisa dibatalkan.
//
// MASALAH YANG DIPERBAIKI
// Konsol lama memakai `confirm()` bawaan browser untuk MENGHAPUS konten secara
// permanen. Dua masalah: (1) tidak ada tempat untuk menuliskan alasan, padahal
// audit menuntut alasan; (2) tidak ada perbedaan antara "sembunyikan" dan
// "hapus permanen", sehingga tindakan ringan terasa sama berbahayanya dengan
// yang berat — dan sebaliknya.
//
// Di sini tingkat bahaya ditulis eksplisit:
//   - 'normal'   : satu klik, tanpa mengetik apa pun
//   - 'reason'   : wajib menulis alasan
//   - 'critical' : wajib menulis alasan DAN mengetik ulang frasa konfirmasi

'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmLevel = 'normal' | 'reason' | 'critical'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  level?: ConfirmLevel
  /** Kata yang harus diketik ulang pada level 'critical'. */
  confirmWord?: string
  /** Label tombol utama, mis. 'Sembunyikan' atau 'Hapus permanen'. */
  confirmLabel?: string
  /** Jalankan aksi. Melempar error untuk menampilkan pesan gagal. */
  onConfirm: (data: { reason: string }) => Promise<{ ok: boolean; error?: string }>
  onDone?: (ok: boolean) => void
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  level = 'reason',
  confirmWord = 'HAPUS',
  confirmLabel = 'Lanjutkan',
  onConfirm,
  onDone,
}: Props) {
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!open) return null

  const needsReason = level !== 'normal'
  const needsWord = level === 'critical'
  const canSubmit =
    (!needsReason || reason.trim().length >= 5) &&
    (!needsWord || typed.trim().toUpperCase() === confirmWord.toUpperCase()) &&
    !pending

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await onConfirm({ reason: reason.trim() })
      if (res.ok) {
        setReason('')
        setTyped('')
        onDone?.(true)
        onClose()
      } else {
        setError(res.error ?? 'Gagal menyelesaikan tindakan.')
        onDone?.(false)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={() => !pending && onClose()}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] overflow-hidden">
        <div className="flex items-start gap-3 p-5 pb-3">
          <span
            className={cn(
              'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
              level === 'critical'
                ? 'bg-red-50 text-red-600'
                : 'bg-amber-50 text-amber-600'
            )}
          >
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-[var(--brown-dark)] text-base">{title}</h2>
            {description && (
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={() => !pending && onClose()}
            className="text-[var(--text-muted)] hover:text-[var(--brown)] p-1"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {needsReason && (
            <div className="form-group">
              <label className="form-label">
                Alasan {level === 'critical' ? '(wajib, tercatat permanen)' : '(wajib)'}
              </label>
              <textarea
                className="form-input"
                rows={3}
                style={{ resize: 'vertical' }}
                placeholder="Jelaskan singkat mengapa tindakan ini diambil…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {needsWord && (
            <div className="form-group">
              <label className="form-label">
                Ketik <strong className="font-mono">{confirmWord}</strong> untuk memastikan
              </label>
              <input
                className="form-input font-mono"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={confirmWord}
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '9px 16px', fontSize: 13 }}
              onClick={() => !pending && onClose()}
              disabled={pending}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-all disabled:opacity-40',
                level === 'critical'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[var(--terra)] hover:brightness-105'
              )}
            >
              {pending && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

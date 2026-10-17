// src/components/admin/detail-drawer.tsx
// Panel samping untuk melihat detail satu baris tanpa meninggalkan daftar.
//
// Dipakai konsol CMS supaya moderator bisa memeriksa konteks lengkap sebuah
// laporan atau konten (isi penuh, penulis, riwayat moderasi) sambil tetap
// melihat daftarnya. Pada layar kecil panel ini menjadi lembar penuh.

'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  /** Tombol aksi di bagian bawah panel. */
  footer?: React.ReactNode
}

export function DetailDrawer({ open, onClose, title, subtitle, children, footer }: Props) {
  // Tutup dengan tombol Escape.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <aside
        className={cn(
          'absolute right-0 top-0 h-full w-full sm:max-w-lg bg-white shadow-2xl',
          'flex flex-col animate-in slide-in-from-right duration-200'
        )}
      >
        <header className="flex items-start gap-3 px-5 py-4 border-b border-[var(--cream-dark)]">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-[var(--brown-dark)] text-base leading-snug break-words">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-[var(--text-muted)] hover:text-[var(--brown)] p-1"
            aria-label="Tutup panel"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>

        {footer && (
          <footer className="border-t border-[var(--cream-dark)] px-5 py-3 flex flex-wrap gap-2 justify-end bg-[var(--cream)]/40">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  )
}

/** Baris label/nilai untuk isi drawer. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 text-sm">
      <span className="text-[var(--text-muted)] text-xs pt-0.5">{label}</span>
      <span className="text-[var(--text)] break-words min-w-0">{children}</span>
    </div>
  )
}

/** Badge status moderasi dengan warna yang konsisten di seluruh konsol. */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    visible: { label: 'Tampil', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    hidden: { label: 'Disembunyikan', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    pending: { label: 'Menunggu', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    rejected: { label: 'Ditolak', className: 'bg-red-50 text-red-700 border-red-200' },
    deleted: { label: 'Di tempat sampah', className: 'bg-stone-100 text-stone-600 border-stone-300' },
  }
  const s = map[status] ?? { label: status, className: 'bg-stone-100 text-stone-600 border-stone-300' }
  return (
    <span
      className={cn(
        'inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
        s.className
      )}
    >
      {s.label}
    </span>
  )
}

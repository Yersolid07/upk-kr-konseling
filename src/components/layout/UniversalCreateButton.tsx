// src/components/layout/UniversalCreateButton.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Plus,
  PenLine,
  BookOpen,
  MessageSquarePlus,
  Users,
  CalendarPlus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { HandsPraying } from '@/components/icons/HandsPraying'
import type { UserRole } from '@/types/database'

/**
 * Satu tombol untuk semua jenis konten.
 *
 * Sebelumnya tombol tambah hanya ada di Beranda dan selalu membuat diskusi
 * forum — pengguna yang ingin menulis doa atau renungan harus mencari menunya
 * sendiri. Sekarang satu tombol yang sama muncul di seluruh aplikasi dan
 * menampilkan semua jenis yang boleh dibuat pengguna tersebut.
 *
 * Yang ditampilkan mengikuti peran: anggota tidak melihat pintu ke halaman
 * admin, konselor melihat pintu menulis renungan. Penyaringan di sini hanya
 * tampilan — setiap halaman tujuan tetap memeriksa izinnya sendiri.
 */

interface CreateOption {
  href: string
  label: string
  hint: string
  icon: React.ReactNode
  roles?: UserRole[]
  accent: string
}

const OPTIONS: CreateOption[] = [
  {
    href: '/renungan/new',
    label: 'Tulis Renungan',
    hint: 'Renungan, kesaksian, atau artikel',
    icon: <BookOpen size={18} />,
    roles: ['member', 'konselor', 'moderator', 'admin', 'super_admin'],
    accent: 'bg-[var(--terra)]/10 text-[var(--terra)]',
  },
  {
    href: '/forum/new',
    label: 'Mulai Diskusi',
    hint: 'Bertanya atau berbagi di forum',
    icon: <MessageSquarePlus size={18} />,
    roles: ['member', 'konselor', 'moderator', 'admin', 'super_admin'],
    accent: 'bg-[var(--sage)]/10 text-[var(--sage)]',
  },
  {
    href: '/prayer/new',
    label: 'Kirim Pokok Doa',
    hint: 'Bisa anonim',
    icon: <HandsPraying size={18} />,
    roles: ['member', 'konselor', 'moderator', 'admin', 'super_admin'],
    accent: 'bg-[var(--gold)]/10 text-[var(--gold)]',
  },
  {
    href: '/cellgroup',
    label: 'Buat KK / KTB',
    hint: 'Kelompok kecil alumni',
    icon: <Users size={18} />,
    roles: ['konselor', 'moderator', 'admin', 'super_admin'],
    accent: 'bg-[var(--brown)]/10 text-[var(--brown)]',
  },
  {
    href: '/booking',
    label: 'Booking Sesi',
    hint: 'Jadwalkan konseling',
    icon: <CalendarPlus size={18} />,
    roles: ['member', 'konselor', 'moderator', 'admin', 'super_admin'],
    accent: 'bg-[var(--cream-dark)] text-[var(--brown-dark)]',
  },
]

// Halaman yang tidak memerlukan tombol ini: formulirnya sendiri, halaman
// masuk, dan ruang chat (input sudah ada di bawah layar).
const HIDDEN_PREFIXES = ['/auth', '/chat/', '/forum/new', '/prayer/new', '/renungan/new', '/booking/']

export function UniversalCreateButton({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement>(null)

  // Tutup saat berpindah halaman.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Tutup dengan Escape dan klik di luar.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return null
  if (pathname.startsWith('/admin')) return null

  const options = OPTIONS.filter((o) => !o.roles || o.roles.includes(role))

  return (
    <>
      {/* Latar gelap saat panel terbuka */}
      {open && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Panel pilihan */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Buat konten baru"
          className="fixed z-50 left-4 right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] lg:left-auto lg:right-6 lg:bottom-24 lg:w-80 bg-white rounded-3xl shadow-2xl border border-[var(--cream-dark)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--cream-dark)]">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.18em]">
                Buat Baru
              </p>
              <h3 className="text-sm font-bold text-[var(--brown-dark)] mt-0.5">Apa yang ingin dibuat?</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 -mr-1 rounded-xl text-[var(--text-muted)] hover:bg-[var(--cream)] transition-all"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {options.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[var(--cream)]/70 transition-colors active:scale-[0.99]"
              >
                <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', o.accent)}>
                  {o.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[var(--brown-dark)] leading-tight">
                    {o.label}
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">{o.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tombol */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Tutup menu buat baru' : 'Buat konten baru'}
        aria-expanded={open}
        className={cn(
          // Di ponsel: mengambang di atas BottomNav, tidak menutupi isi.
          'fixed z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95',
          'right-4 bottom-[calc(76px+env(safe-area-inset-bottom))]',
          // Di desktop: sudut kanan bawah, di atas konten.
          'lg:right-6 lg:bottom-6',
          open
            ? 'bg-[var(--brown-dark)] rotate-45'
            : 'bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] hover:shadow-2xl'
        )}
        style={{ boxShadow: '0 8px 24px rgba(58,39,24,0.28)' }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </>
  )
}

// src/components/layout/BottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, BookOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

// Empat tujuan utama saja. Yang paling kanan selalu Profil.
// Konseling, Jadwal, Prayer Wall, Pengaturan lanjutan dapat dari
// sidebar/hamburger atau dari menu di dalam halaman Profil.
const ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: Home },
  { href: '/forum', label: 'Forum', icon: MessageCircle },
  { href: '/renungan', label: 'Renungan', icon: BookOpen },
  { href: '/pengaturan', label: 'Profil', icon: User },
]

export function BottomNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[var(--line)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigasi utama"
    >
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors',
                active ? 'text-[var(--terra)]' : 'text-[var(--text-muted)]'
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
              <span className={cn('text-[10px] font-semibold', active && 'font-bold')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

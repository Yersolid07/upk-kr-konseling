// src/components/layout/AppShell.tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { UniversalCreateButton } from './UniversalCreateButton'
import { SOSModal } from '@/components/ui/SOSModal'
import { useAppStore } from '@/store/useAppStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { usePresence } from '@/hooks/usePresence'
import { SiteBanner } from './SiteBanner'
import type { Profile } from '@/types/database'
import type { SiteBanner as BannerRow } from '@/types/database'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Beranda',
  '/forum':      'Forum Diskusi',
  '/chat':       'Konseling 1-on-1',
  '/booking':    'Booking Sesi',
  '/prayer':     'Prayer Wall',
  '/renungan':   'Renungan & Artikel',
  '/resource':   'Resource Kesehatan',
  '/cellgroup':  'KK & KTB',
  '/konselor':   'Dashboard Konselor',
  '/admin':      'Panel Admin',
}

export function AppShell({
  profile,
  banners = [],
  footerPages = [],
  sosNumber = null,
  children,
}: {
  profile: Profile
  banners?: BannerRow[]
  footerPages?: { slug: string; title: string }[]
  sosNumber?: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { setProfile, setSidebarOpen, sidebarOpen } = useAppStore()

  const { notifications, unreadCount, markAllRead, markRead } = useRealtimeNotifications(profile.id)
  usePresence(profile.id)

  useEffect(() => {
    setProfile(profile)
  }, [profile])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'IKA UPK-Kr FT UNSRAT'

  return (
    <div className="app-shell">
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        profile={profile}
        unreadMessages={notifications.filter(n => n.type === 'new_message' && !n.is_read).length}
      />

      <main className="main-content">
        <Topbar
          title={title}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
        />
        <div className="view-container">
          <div className="max-w-7xl mx-auto">
            <SiteBanner
              banners={banners.map((b) => ({
                id: b.id,
                message: b.message,
                level: b.level,
                dismissible: b.dismissible,
              }))}
            />
            {children}

            {footerPages.length > 0 && (
              <footer className="mt-10 pt-6 border-t border-[var(--cream-dark)]">
                <nav className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-muted)]">
                  {footerPages.map((f) => (
                    <a key={f.slug} href={`/halaman/${f.slug}`} className="hover:text-[var(--terra)]">
                      {f.title}
                    </a>
                  ))}
                </nav>
              </footer>
            )}
          </div>
        </div>
      </main>

      <BottomNav profile={profile} />
      <UniversalCreateButton role={profile.role} />
      <SOSModal waNumber={sosNumber} />
    </div>
  )
}

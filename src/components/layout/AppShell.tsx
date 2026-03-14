// src/components/layout/AppShell.tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SOSModal } from '@/components/ui/SOSModal'
import { useAppStore } from '@/store/useAppStore'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { usePresence } from '@/hooks/usePresence'
import type { Profile } from '@/types/database'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Beranda',
  '/forum':      'Forum Diskusi',
  '/chat':       'Konseling 1-on-1',
  '/booking':    'Booking Sesi',
  '/prayer':     'Prayer Wall',
  '/renungan':   'Renungan & Artikel',
  '/resource':   'Resource Kesehatan',
  '/cellgroup':  'Cell Group',
  '/konselor':   'Dashboard Konselor',
  '/admin':      'Panel Admin',
}

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
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
  )?.[1] ?? 'UPK-Kr. Konseling'

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
          {children}
        </div>
      </main>

      <SOSModal />
    </div>
  )
}

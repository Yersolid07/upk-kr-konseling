// src/components/layout/Topbar.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import type { Notification } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { 
  Search, 
  Bell, 
  AlertTriangle, 
  Menu, 
  X,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopbarProps {
  title: string
  notifications: Notification[]
  unreadCount: number
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}

export function Topbar({ title, notifications, unreadCount, onMarkAllRead, onMarkRead }: TopbarProps) {
  const { isAnonymous, toggleAnonymous, toggleSidebar, setSosOpen, sidebarOpen } = useAppStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/forum?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-[var(--cream-dark)] sticky top-0 z-40 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Hamburger (mobile) */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-[var(--cream)] text-[var(--brown)] hover:bg-[var(--cream-dark)] transition-colors border-none cursor-pointer"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <h1 className="font-[var(--font-playfair)] text-lg md:text-xl font-bold text-[var(--brown-dark)] truncate">
            {title}
          </h1>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-3 bg-[var(--cream)] border border-[var(--cream-dark)] rounded-2xl px-4 py-2 w-full max-w-sm focus-within:border-[var(--terra)] focus-within:ring-2 focus-within:ring-[var(--terra)]/10 transition-all group">
            <Search size={16} className="text-[var(--text-muted)] group-focus-within:text-[var(--terra)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik, doa, atau konselor..."
              className="bg-transparent border-none outline-none text-sm text-[var(--text)] w-full placeholder:text-[var(--text-muted)]/60 font-[var(--font-sans)]"
            />
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Anon Toggle */}
          <button
            onClick={toggleAnonymous}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer",
              isAnonymous 
                ? "bg-[var(--gold)]/10 border-[var(--gold)]/30 text-[var(--gold)]" 
                : "bg-white border-[var(--cream-dark)] text-[var(--text-muted)] hover:border-[var(--terra)]/30"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full transition-all",
              isAnonymous ? "bg-[var(--gold)] shadow-[0_0_8px_rgba(201,153,58,0.5)]" : "bg-gray-300"
            )} />
            <span className="hidden sm:inline">Anonim</span>
            <span className="sm:hidden">A</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={cn(
                "p-2.5 rounded-xl border transition-all relative group cursor-pointer",
                notifOpen ? "bg-[var(--cream)] border-[var(--terra)]/30" : "bg-white border-[var(--cream-dark)] hover:bg-[var(--cream)]"
              )}
            >
              <Bell size={20} className={cn("transition-colors", notifOpen ? "text-[var(--terra)]" : "text-[var(--text-muted)]")} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--terra)] rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notif Panel */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[var(--cream-dark)] z-20 overflow-hidden animate-fade-up">
                  <div className="px-5 py-4 border-b border-[var(--cream-dark)] bg-[var(--cream)]/30 flex items-center justify-between">
                    <h3 className="font-[var(--font-playfair)] font-bold text-[var(--brown-dark)]">
                      Notifikasi
                    </h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={onMarkAllRead}
                        className="text-[10px] font-bold text-[var(--terra)] hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--cream-dark)] custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center text-[var(--text-muted)]">
                        <Bell size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Belum ada notifikasi</p>
                      </div>
                    ) : notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { onMarkRead(n.id); setNotifOpen(false) }}
                        className={cn(
                          "p-4 flex gap-3 cursor-pointer transition-colors group",
                          n.is_read ? "opacity-60" : "bg-[var(--terra)]/[0.02]"
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          n.is_read ? "bg-gray-200" : "bg-[var(--terra)] shadow-[0_0_8px_rgba(196,137,90,0.5)]"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--text)] group-hover:text-[var(--terra)] transition-colors leading-normal">
                            {n.title}
                          </p>
                          {n.body && <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">{n.body}</p>}
                          <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-wider">
                            <Clock size={10} />
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: idLocale })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SOS Button */}
          <button
            onClick={() => setSosOpen(true)}
            className="p-2.5 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center group shadow-sm cursor-pointer"
            title="Bantuan Darurat"
          >
            <AlertTriangle size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>
    </>
  )
}

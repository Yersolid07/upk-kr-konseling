// src/components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { logout } from '@/app/auth/actions'
import type { Profile } from '@/types/database'
import { cn } from '@/lib/utils'
import { 
  Home, 
  MessageCircle, 
  Heart, 
  Calendar, 
  BookOpen,
  PlusCircle,
  Users as UsersIcon,
  LayoutDashboard,
  Settings,
  LogOut,
  Languages,
  ChevronRight,
  Phone,
  X
} from 'lucide-react'
import { HandsPraying } from '@/components/icons/HandsPraying'

interface NavItem {
  href: string
  label: string
  labelEn: string
  icon: React.ReactNode
  badge?: number
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  icon: <Home size={18} />, label: 'Beranda',          labelEn: 'Home' },
  { href: '/forum',      icon: <MessageCircle size={18} />, label: 'Forum Diskusi',     labelEn: 'Forum' },
  { href: '/chat',       icon: <Heart size={18} />, label: 'Konseling 1-on-1',  labelEn: '1-on-1 Chat' },
  { href: '/booking',    icon: <Calendar size={18} />, label: 'Booking Sesi',      labelEn: 'Book Session' },
]

const SPIRITUAL_ITEMS: NavItem[] = [
  { href: '/prayer',    icon: <HandsPraying size={18} />, label: 'Prayer Wall',         labelEn: 'Prayer Wall' },
  { href: '/renungan',  icon: <BookOpen size={18} />, label: 'Renungan & Artikel',  labelEn: 'Devotions' },
  { href: '/resource',  icon: <PlusCircle size={18} />, label: 'Resource Kesehatan', labelEn: 'Mental Health' },
  { href: '/hotline',   icon: <Phone size={18} />, label: 'Hotline Darurat',     labelEn: 'Emergency Hotline' },
]

const GROUP_ITEMS: NavItem[] = [
  { href: '/cellgroup', icon: <UsersIcon size={18} />, label: 'Cell Group Saya',     labelEn: 'My Cell Group' },
]

const STAFF_ITEMS: NavItem[] = [
  { href: '/konselor',  icon: <LayoutDashboard size={18} />, label: 'Dashboard Konselor', labelEn: 'Counselor Hub', roles: ['konselor','admin','super_admin'] },
  { href: '/admin',     icon: <Settings size={18} />, label: 'Panel Admin',         labelEn: 'Admin Panel',   roles: ['admin','super_admin'] },
]

interface SidebarProps {
  profile: Profile
  unreadMessages?: number
  unreadNotifications?: number
}

export function Sidebar({ profile, unreadMessages = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { lang, setLang, sidebarOpen } = useAppStore()

  const t = (id: string, en: string) => lang === 'en' ? en : id

  const visibleStaff = STAFF_ITEMS.filter(
    item => !item.roles || item.roles.includes(profile.role)
  )

  return (
    <>
      <nav className={cn(
        "sidebar bg-gradient-to-b from-[#2D1B10] to-[var(--brown-dark)] shadow-2xl lg:shadow-none",
        sidebarOpen && "open"
      )}>
        {/* Brand */}
        <div className="px-6 py-8 border-b border-white/5 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--terra)] to-[var(--gold)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--terra)]/20 font-bold text-lg">
              ✝
            </div>
            <div>
              <div className="font-[var(--font-playfair)] text-sm font-bold text-white leading-tight">
                UPK-Kr. Konseling
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                FT. UNSRAT Alumni
              </div>
            </div>
          </div>
          
          <button 
            className="absolute top-1/2 -translate-y-1/2 right-4 p-2 text-white/40 hover:text-white lg:hidden"
            onClick={() => useAppStore.getState().setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info Card */}
        <div className="mx-4 my-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--sage)] to-[var(--sage-light)] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10 shadow-inner">
              {profile.full_name.slice(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate leading-tight">
                {profile.full_name}
              </div>
              <div className="text-[10px] text-white/40 font-medium capitalize mt-0.5">
                {profile.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          <NavSection label={t('Utama', 'Main')} items={NAV_ITEMS} pathname={pathname} lang={lang} unreadMessages={unreadMessages} />
          <NavSection label={t('Rohani', 'Spiritual')} items={SPIRITUAL_ITEMS} pathname={pathname} lang={lang} />
          <NavSection label={t('Komunitas', 'Community')} items={GROUP_ITEMS} pathname={pathname} lang={lang} />
          {visibleStaff.length > 0 && (
            <NavSection label={t('Kelola', 'Manage')} items={visibleStaff} pathname={pathname} lang={lang} />
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex p-1 bg-black/20 rounded-xl">
            {(['id', 'en'] as const).map((l) => (
              <button 
                key={l} 
                onClick={() => setLang(l)} 
                className={cn(
                  "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  lang === l ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                )}
              >
                <Languages size={12} />
                {l === 'id' ? 'ID' : 'EN'}
              </button>
            ))}
          </div>

          <form action={logout}>
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm font-medium group text-left border-none bg-transparent cursor-pointer font-[var(--font-sans)]">
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>{t('Keluar', 'Sign Out')}</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}

function NavSection({ label, items, pathname, lang, unreadMessages = 0 }: {
  label: string, items: NavItem[], pathname: string, lang: string, unreadMessages?: number
}) {
  return (
    <div className="mb-6 last:mb-2">
      <div className="px-4 mb-2">
        <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="space-y-0.5">
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const badge = item.href === '/chat' ? unreadMessages : item.badge
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group",
              isActive 
                ? "text-[var(--terra-light)] bg-white/5 shadow-inner" 
                : "text-white/50 hover:text-white hover:bg-white/[0.03]"
            )}>
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1 bg-[var(--terra)] rounded-r-full" />
              )}
              <div className={cn(
                "shrink-0 transition-transform group-hover:scale-110",
                isActive ? "text-[var(--terra)]" : "opacity-70"
              )}>
                {item.icon}
              </div>
              <span className="text-sm font-medium truncate">
                {lang === 'en' ? item.labelEn : item.label}
              </span>
              {badge && badge > 0 ? (
                <span className="ml-auto bg-[var(--terra)] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-[var(--terra)]/20 animate-pulse">
                  {badge}
                </span>
              ) : (
                <ChevronRight size={14} className={cn(
                  "ml-auto opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0",
                  isActive ? "text-[var(--terra)]/50" : "text-white/20"
                )} />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

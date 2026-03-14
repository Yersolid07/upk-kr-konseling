// src/components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { logout } from '@/app/auth/actions'
import type { Profile } from '@/types/database'

interface NavItem {
  href: string
  label: string
  labelEn: string
  icon: string
  badge?: number
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',  icon: '🏠', label: 'Beranda',          labelEn: 'Home' },
  { href: '/forum',      icon: '💬', label: 'Forum Diskusi',     labelEn: 'Forum' },
  { href: '/chat',       icon: '💌', label: 'Konseling 1-on-1',  labelEn: '1-on-1 Chat' },
  { href: '/booking',    icon: '📅', label: 'Booking Sesi',      labelEn: 'Book Session' },
]

const SPIRITUAL_ITEMS: NavItem[] = [
  { href: '/prayer',    icon: '🙏', label: 'Prayer Wall',         labelEn: 'Prayer Wall' },
  { href: '/renungan',  icon: '📖', label: 'Renungan & Artikel',  labelEn: 'Devotions' },
  { href: '/resource',  icon: '❤️', label: 'Resource Kesehatan', labelEn: 'Mental Health' },
]

const GROUP_ITEMS: NavItem[] = [
  { href: '/cellgroup', icon: '👥', label: 'Cell Group Saya',     labelEn: 'My Cell Group' },
]

const STAFF_ITEMS: NavItem[] = [
  { href: '/konselor',  icon: '📊', label: 'Dashboard Konselor', labelEn: 'Counselor Hub', roles: ['konselor','admin','super_admin'] },
  { href: '/admin',     icon: '⚙️', label: 'Panel Admin',         labelEn: 'Admin Panel',   roles: ['admin','super_admin'] },
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
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, var(--terra), var(--gold))',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0
            }}>✝</div>
            <div>
              <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 13, fontWeight: 700, color: 'var(--white)', lineHeight: 1.3 }}>
                UPK-Kr. Konseling
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3px' }}>
                FT. UNSRAT Alumni
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div style={{
          margin: '12px 12px 4px',
          padding: '14px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--sage), var(--sage-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'var(--white)'
          }}>
            {profile.full_name.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.full_name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {profile.role === 'member' ? 'Anggota' :
               profile.role === 'konselor' ? 'Konselor' :
               profile.role === 'admin' ? 'Admin' :
               profile.role === 'super_admin' ? 'Super Admin' : 'Moderator'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
          <NavSection label={t('Utama', 'Main')} items={NAV_ITEMS} pathname={pathname} lang={lang} unreadMessages={unreadMessages} />
          <NavSection label={t('Rohani', 'Spiritual')} items={SPIRITUAL_ITEMS} pathname={pathname} lang={lang} />
          <NavSection label={t('Komunitas', 'Community')} items={GROUP_ITEMS} pathname={pathname} lang={lang} />
          {visibleStaff.length > 0 && (
            <NavSection label={t('Kelola', 'Manage')} items={visibleStaff} pathname={pathname} lang={lang} />
          )}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Language toggle */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '3px', marginBottom: 8
          }}>
            {(['id', 'en'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{
                flex: 1, padding: '6px', border: 'none',
                borderRadius: 6, fontFamily: 'var(--font-sans)',
                fontSize: 11, fontWeight: 600,
                background: lang === l ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: lang === l ? 'var(--white)' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', letterSpacing: '0.5px',
                transition: 'all 0.2s'
              }}>
                {l === 'id' ? '🇮🇩 ID' : '🇺🇸 EN'}
              </button>
            ))}
          </div>
          {/* Logout */}
          <form action={logout}>
            <button type="submit" style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', border: 'none', background: 'transparent',
              color: 'rgba(255,255,255,0.35)', fontSize: 13, borderRadius: 8,
              cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s'
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff9090')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              <span>↩</span> {t('Keluar', 'Sign Out')}
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
    <div style={{ marginBottom: 4 }}>
      <div style={{
        fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '1px', color: 'rgba(255,255,255,0.25)',
        padding: '12px 8px 4px'
      }}>{label}</div>
      {items.map(item => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const badge = item.href === '/chat' ? unreadMessages : item.badge
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            transition: 'all 0.2s', marginBottom: 2, textDecoration: 'none',
            color: isActive ? 'var(--terra-light)' : 'rgba(255,255,255,0.55)',
            fontWeight: isActive ? 500 : 400, fontSize: 14,
            background: isActive ? 'linear-gradient(135deg, rgba(196,137,90,0.25), rgba(196,137,90,0.12))' : 'transparent',
            position: 'relative',
          }}>
            {isActive && <div style={{
              position: 'absolute', left: 0, top: 6, bottom: 6,
              width: 3, background: 'var(--terra-light)', borderRadius: '0 2px 2px 0'
            }} />}
            <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
            <span>{lang === 'en' ? item.labelEn : item.label}</span>
            {badge && badge > 0 ? (
              <span style={{
                marginLeft: 'auto', background: 'var(--terra)', color: 'var(--white)',
                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center'
              }}>{badge}</span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}

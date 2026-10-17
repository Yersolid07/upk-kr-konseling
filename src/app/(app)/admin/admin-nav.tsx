// src/app/(app)/admin/admin-nav.tsx
// Navigasi samping konsol admin.
//
// Hanya menampilkan tautan yang perannya memang boleh membuka — menu yang
// tidak bisa diakses tidak ditampilkan, bukan ditampilkan lalu memantul.
// Ini kenyamanan, BUKAN keamanan: penjagaan sebenarnya ada di layout.tsx,
// di setiap Server Action (requireCap), dan di RLS database.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Flag, Newspaper, Users, MessagesSquare,
  HandHeart, HeartHandshake, BookOpenText, CalendarCheck,
  Settings, ScrollText, Trash2, Phone, ShieldCheck, FileText,
  FlagTriangleRight, FolderTree, PenLine, Ban,
  UsersRound, MessagesSquare as MsgSq, Megaphone, LayoutTemplate,
  HardDrive, ShieldAlert, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Capability } from '@/lib/rbac'

export interface NavItem {
  href: string
  label: string
  /** Nama ikon di peta ICONS. Bertipe string agar daftar menu di layout bisa
   *  disusun tanpa anotasi `as const` di setiap cabang kondisional. */
  icon: string
  cap?: Capability
}

const ICONS = {
  dashboard: LayoutDashboard,
  reports: Flag,
  reportsQueue: FlagTriangleRight,
  categories: FolderTree,
  write: PenLine,
  banned: Ban,
  articles: Newspaper,
  users: Users,
  forum: MessagesSquare,
  prayer: HandHeart,
  konselor: HeartHandshake,
  renungan: BookOpenText,
  bookings: CalendarCheck,
  settings: Settings,
  audit: ScrollText,
  trash: Trash2,
  hotlines: Phone,
  legal: FileText,
  admins: ShieldCheck,
  cellGroups: UsersRound,
  sessions: MsgSq,
  broadcast: Megaphone,
  siteContent: LayoutTemplate,
  media: HardDrive,
  privacy: ShieldAlert,
  system: Activity,
} as const

export interface NavGroup {
  title: string
  items: NavItem[]
}

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {g.title}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard
              // Cocokkan tepat untuk /admin, dan berawalan untuk submenu.
              const active =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-[var(--brown-dark)] text-[var(--cream)] shadow-sm'
                        : 'text-[var(--text-2)] hover:bg-[var(--cream-dark)] hover:text-[var(--brown-dark)]'
                    )}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

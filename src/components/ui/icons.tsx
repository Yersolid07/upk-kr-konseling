// src/components/ui/icons.tsx
// Shared, tasteful icon set built on lucide-react. Single source of truth so
// no screen ever needs an emoji. Category icons are keyed by forum slug.

import {
  HeartHandshake,
  Waves,
  Home,
  GraduationCap,
  Briefcase,
  Heart,
  Flame,
  MessageCircle,
  BookOpen,
  Brain,
  Church,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** Forum / article category slug -> icon */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  kesaksian: Heart,
  iman: BookOpen,
  mental: Brain,
  hubungan: HeartHandshake,
  akademik: GraduationCap,
  keluarga: Home,
  karir: Briefcase,
  motivasi: Flame,
  umum: MessageCircle,
}

export function CategoryIcon({ slug, className }: { slug?: string | null; className?: string }) {
  const Icon = (slug && CATEGORY_ICONS[slug]) || MessageCircle
  return <Icon className={className} />
}

/** Selectable icons for KK/KTB groups (stored as a stable key, not emoji). */
export const GROUP_ICON_KEYS = [
  'church',
  'book',
  'users',
  'heart',
  'flame',
  'leaf',
  'sun',
  'handshake',
] as const

export type GroupIconKey = (typeof GROUP_ICON_KEYS)[number]

export const GROUP_ICONS: Record<string, LucideIcon> = {
  church: Church,
  book: BookOpen,
  users: HeartHandshake,
  heart: Heart,
  flame: Flame,
  leaf: Waves,
  sun: Flame,
  handshake: HeartHandshake,
}

export function GroupIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && GROUP_ICONS[name]) || HeartHandshake
  return <Icon className={className} />
}

/**
 * Maps any legacy emoji value (from existing DB rows) to a proper icon key,
 * so old data keeps rendering with real icons.
 */
export function normalizeGroupIcon(value?: string | null): GroupIconKey {
  if (!value) return 'users'
  if ((GROUP_ICON_KEYS as readonly string[]).includes(value)) return value as GroupIconKey
  const legacy: Record<string, GroupIconKey> = {
    '✝️': 'church', '✝': 'church', '🕊️': 'handshake', '📖': 'book',
    '🌿': 'leaf', '🔥': 'flame', '💡': 'sun', '🤝': 'handshake', '⭐': 'sun',
  }
  return legacy[value] ?? 'users'
}

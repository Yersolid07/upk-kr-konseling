// src/lib/rbac.ts
// Satu sumber kebenaran untuk otorisasi di seluruh aplikasi.
//
// Hierarki peran (selaras dengan public.role_rank() di supabase/cms-rbac.sql):
//   super_admin (5) > admin (4) > moderator (3) > konselor (2) > member (1)
//
// ATURAN PENTING: setiap Server Action dan Route Handler WAJIB memanggil salah
// satu guard di bawah ini. Menyembunyikan tombol di UI bukan kontrol keamanan —
// RLS di database adalah lapisan kedua, bukan pengganti pemeriksaan di server.

import type { UserRole } from '@/types/database'

export const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 5,
  admin: 4,
  moderator: 3,
  konselor: 2,
  member: 1,
}

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  konselor: 'Konselor',
  member: 'Anggota',
}

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  super_admin:
    'Akses penuh: mengelola admin, pengaturan situs, nomor hotline, dokumen legal, dan membuka identitas anonim lewat prosedur tercatat.',
  admin:
    'Menyetujui artikel dan pengajuan konselor, mengelola pengguna, dan menangani laporan konten.',
  moderator:
    'Menandai, menyembunyikan, dan mengunci konten yang melanggar ketentuan. Tidak dapat mengubah pengaturan situs.',
  konselor:
    'Melayani sesi konseling 1-on-1, mengelola jadwal, dan mengelola KK/KTB yang dibina.',
  member:
    'Membuat diskusi, doa, komentar, dan artikel (menunggu persetujuan admin).',
}

/** Daftar peran yang boleh melakukan aksi tertentu. */
export const ROLE_CAPABILITIES = {
  // Pengaturan & identitas situs
  manageSettings: ['super_admin'],
  manageHotlines: ['super_admin'],
  manageLegal: ['super_admin'],
  manageAdmins: ['super_admin'],
  revealIdentity: ['super_admin'],
  viewAuditLog: ['super_admin', 'admin'],

  // Pengguna & konselor
  manageUsers: ['super_admin', 'admin'],
  approveKonselor: ['super_admin', 'admin'],
  banUsers: ['super_admin', 'admin'],
  approveArticles: ['super_admin', 'admin'],

  // Moderasi konten
  moderateContent: ['super_admin', 'admin', 'moderator'],
  softDeleteContent: ['super_admin', 'admin', 'moderator'],
  restoreContent: ['super_admin', 'admin', 'moderator'],
  /** Hapus PERMANEN hanya super_admin — tidak bisa dibatalkan. */
  purgeContent: ['super_admin'],
  manageCategories: ['super_admin', 'admin'],
  manageReports: ['super_admin', 'admin', 'moderator'],

  // Konseling & komunitas
  manageBookings: ['super_admin', 'admin', 'moderator', 'konselor'],
  manageCellGroups: ['super_admin', 'admin', 'moderator', 'konselor'],
  manageKonselorProfiles: ['super_admin', 'admin'],
  breakGlassRead: ['super_admin'],

  // Operasional
  broadcast: ['super_admin', 'admin'],
  manageMedia: ['super_admin', 'admin', 'moderator'],
  manageSiteContent: ['super_admin', 'admin'],
  manageVerses: ['super_admin', 'admin'],
  exportData: ['super_admin'],
} satisfies Record<string, UserRole[]>

export type Capability = keyof typeof ROLE_CAPABILITIES

/** Apakah `role` memenuhi syarat minimum `min`? */
export function hasMinRole(role: UserRole | null | undefined, min: UserRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

/** Apakah `role` boleh melakukan `capability`? */
export function can(role: UserRole | null | undefined, capability: Capability): boolean {
  if (!role) return false
  const allowed: readonly UserRole[] = ROLE_CAPABILITIES[capability]
  return allowed.includes(role)
}

export const isAdminOrAbove = (r?: UserRole | null) => hasMinRole(r, 'admin')
export const isModeratorOrAbove = (r?: UserRole | null) => hasMinRole(r, 'moderator')
export const isKonselorOrAbove = (r?: UserRole | null) => hasMinRole(r, 'konselor')
export const isSuperAdmin = (r?: UserRole | null) => r === 'super_admin'

// ─── Error yang dipakai Server Actions ───
export class AuthorizationError extends Error {
  constructor(message = 'Anda tidak memiliki akses untuk tindakan ini.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/** Melempar bila peran tidak memenuhi syarat minimum. */
export function requireRole(role: UserRole | null | undefined, min: UserRole): void {
  if (!hasMinRole(role, min)) {
    throw new AuthorizationError()
  }
}

/** Melempar bila peran tidak punya capability. */
export function requireCapability(role: UserRole | null | undefined, capability: Capability): void {
  if (!can(role, capability)) {
    throw new AuthorizationError()
  }
}

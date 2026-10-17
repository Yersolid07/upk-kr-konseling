// src/app/(app)/admin/pengguna/actions.ts
// Aksi pengelolaan pengguna: peran, aktif/nonaktif, verifikasi konselor.
//
// Semua lewat cmsAction supaya izin + validasi + audit konsisten. Perubahan
// PERAN punya pagar tambahan di database (protect_profile_columns) — akun
// tidak bisa menaikkan perannya sendiri, dan hanya super_admin yang bisa
// membuat super_admin baru.

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'
import { ROLE_RANK } from '@/lib/rbac'
import type { UserRole } from '@/types/database'

const roleSchema = z.object({
  userId: z.string().uuid('ID pengguna tidak valid.'),
  role: z.enum(['super_admin', 'admin', 'moderator', 'konselor', 'member']),
  reason: z.string().trim().min(10, 'Alasan minimal 10 karakter.').max(500),
})

const changeUserRoleImpl = cmsAction({
  cap: 'manageUsers',
  entity: 'profiles',
  action: 'role_change',
  requireReason: true,
  schema: roleSchema,
  load: async ({ userId }, db) => {
    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Pengguna tidak ditemukan.')
    return data
  },
  run: async (ctx, { userId, role }, db, before) => {
    const prev = (before as { role: UserRole }).role

    // Tidak boleh mengubah peran sendiri — mencegah admin menaikkan dirinya
    // jadi super_admin, dan mencegah super_admin terakhir mengunci diri.
    if (userId === ctx.userId) {
      throw new Error('Tidak bisa mengubah peran akun sendiri.')
    }
    // Hanya super_admin boleh membuat/mencabut super_admin.
    if ((role === 'super_admin' || prev === 'super_admin') && ctx.role !== 'super_admin') {
      throw new Error('Hanya super admin yang boleh mengatur peran super admin.')
    }
    // Tidak boleh memberi peran di atas peran sendiri.
    if (ROLE_RANK[role] > ROLE_RANK[ctx.role]) {
      throw new Error('Tidak bisa memberi peran lebih tinggi dari peranmu sendiri.')
    }

    const { error } = await db.from('profiles').update({ role }).eq('id', userId)
    if (error) throw new Error(error.message)
    return { id: userId, after: { role }, data: { userId, role } }
  },
  revalidate: ['/admin/pengguna', '/admin/kelola-admin'],
})

const activeSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
  reason: z.string().trim().min(5, 'Alasan minimal 5 karakter.').max(500),
})

const setUserActiveImpl = cmsAction({
  cap: 'banUsers',
  entity: 'profiles',
  action: 'ban',
  requireReason: true,
  schema: activeSchema,
  load: async ({ userId }, db) => {
    const { data, error } = await db
      .from('profiles')
      .select('id, full_name, is_active, role')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Pengguna tidak ditemukan.')
    return data
  },
  run: async (ctx, { userId, isActive }, db, before) => {
    const prev = before as { role: UserRole }
    if (userId === ctx.userId) throw new Error('Tidak bisa menonaktifkan akun sendiri.')
    // Jangan sampai admin menonaktifkan akun dengan peran lebih tinggi.
    if (ROLE_RANK[prev.role] > ROLE_RANK[ctx.role]) {
      throw new Error('Tidak bisa menonaktifkan akun dengan peran lebih tinggi.')
    }
    const { error } = await db.from('profiles').update({ is_active: isActive }).eq('id', userId)
    if (error) throw new Error(error.message)
    return { id: userId, after: { is_active: isActive }, data: { userId, isActive } }
  },
  revalidate: ['/admin/pengguna'],
})

/** Pembungkus Server Action — berkas 'use server' hanya boleh ekspor async fn. */
export async function changeUserRoleAction(input: unknown) {
  return changeUserRoleImpl(input)
}

export async function setUserActiveAction(input: unknown) {
  return setUserActiveImpl(input)
}

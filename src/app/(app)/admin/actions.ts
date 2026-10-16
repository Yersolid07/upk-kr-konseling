// src/app/(app)/admin/actions.ts
// Server Actions untuk panel admin.
//
// ATURAN: setiap aksi memakai guard dari lib/auth-guard.ts (bukan pemeriksaan
// role manual), memvalidasi input dengan zod, dan menulis jejak audit.
// Klien Supabase biasa dipakai untuk MENULIS AUDIT supaya auth.uid() terisi —
// log_audit() adalah SECURITY DEFINER sehingga INSERT-nya tidak perlu policy.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCap, guarded } from '@/lib/auth-guard'
import { ROLE_RANK, AuthorizationError } from '@/lib/rbac'
import type { UserRole } from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Daftar konten untuk moderasi
// ─────────────────────────────────────────────────────────────

export async function getAdminContent() {
  return guarded(async () => {
    // Moderator ke atas boleh membuka konsol moderasi.
    await requireCap('moderateContent')

    const supabase = createClient()

    const [threads, comments, prayers] = await Promise.all([
      supabase
        .from('threads_public')
        .select('id, title, content, created_at, is_anonymous, anon_label, author_name')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('comments_public')
        .select('id, content, created_at, thread_id, is_anonymous, anon_label, author_name')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('prayers_public')
        .select('id, content, created_at, is_anonymous, anon_label, author_name')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    return {
      threads: threads.data ?? [],
      comments: comments.data ?? [],
      prayers: prayers.data ?? [],
    }
  })
}

const deleteContentSchema = z.object({
  type: z.enum(['thread', 'comment', 'prayer']),
  id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
})

const TABLE_BY_TYPE = {
  thread: 'threads',
  comment: 'comments',
  prayer: 'prayer_requests',
} as const

export async function deleteContent(
  type: 'thread' | 'comment' | 'prayer',
  id: string,
  reason?: string
) {
  return guarded(async () => {
    await requireCap('moderateContent')
    const { type: t, id: contentId, reason: why } = deleteContentSchema.parse({
      type,
      id,
      reason,
    })

    const supabase = createClient()
    const table = TABLE_BY_TYPE[t]

    // Ambil ringkasan dulu supaya audit memuat APA yang dihapus, bukan sekadar ID.
    const { data: before } = await supabase
      .from(table)
      .select('*')
      .eq('id', contentId)
      .maybeSingle()

    if (!before) throw new AuthorizationError('Konten tidak ditemukan.')

    const { error } = await supabase.from(table).delete().eq('id', contentId)
    if (error) throw new Error(error.message)

    await supabase.rpc('log_audit', {
      p_action: 'delete',
      p_entity: table,
      p_entity_id: contentId,
      p_detail: { before, reason: why ?? null },
    })

    revalidatePath('/admin')
    revalidatePath('/forum')
    revalidatePath('/prayer')
    return { success: true as const }
  })
}

// ─────────────────────────────────────────────────────────────
// Ubah peran pengguna
//
// Sebelumnya endpoint /api/admin/assign-role menerima role apa pun dalam
// daftar "allowedByAdmin" TANPA memeriksa peran TARGET — sehingga admin
// bisa menurunkan admin lain, bahkan super_admin, menjadi member. Tidak ada
// audit dan tidak ada validasi input.
//
// Aturan sekarang:
//   - pemanggil wajib punya capability manageUsers (admin ke atas)
//   - tidak boleh mengubah peran DIRI SENDIRI
//   - peran target harus LEBIH RENDAH dari pemanggil
//   - peran baru tidak boleh >= peran pemanggil
//   - super_admin terakhir tidak boleh diturunkan
//   - is_verified & specialization divalidasi
// ─────────────────────────────────────────────────────────────

const assignRoleSchema = z.object({
  user_id: z.string().uuid('ID pengguna tidak valid.'),
  role: z.enum(['super_admin', 'admin', 'moderator', 'konselor', 'member']),
  specialization: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  is_verified: z.boolean().optional(),
})

export async function assignRole(input: {
  user_id: string
  role: string
  specialization?: string[]
  is_verified?: boolean
}) {
  return guarded(async () => {
    const ctx = await requireCap('manageUsers')
    const { user_id, role, specialization, is_verified } = assignRoleSchema.parse(input)

    if (user_id === ctx.userId) {
      throw new AuthorizationError('Kamu tidak bisa mengubah peranmu sendiri.')
    }

    const supabase = createClient()

    const { data: targetData } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user_id)
      .maybeSingle()

    if (!targetData) throw new AuthorizationError('Pengguna tidak ditemukan.')

    const targetRole = targetData.role as UserRole

    // Target harus lebih rendah dari pemanggil.
    if (ROLE_RANK[targetRole] >= ROLE_RANK[ctx.role]) {
      throw new AuthorizationError(
        'Tidak boleh mengubah pengguna dengan peringkat setara atau lebih tinggi.'
      )
    }

    // Peran baru juga harus lebih rendah dari pemanggil.
    if (ROLE_RANK[role] >= ROLE_RANK[ctx.role]) {
      throw new AuthorizationError(
        `Kamu tidak bisa memberikan peran ${role} — maksimal peran di bawah ${ctx.role}.`
      )
    }

    // Jangan sampai super_admin terakhir hilang.
    if (targetRole === 'super_admin' && role !== 'super_admin') {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'super_admin')
      if ((count ?? 0) <= 1) {
        throw new AuthorizationError('Ini super admin terakhir — tidak bisa diturunkan.')
      }
    }

    const update: {
      role: UserRole
      specialization?: string[]
      is_verified?: boolean
    } = { role }
    if (specialization) update.specialization = specialization
    if (typeof is_verified === 'boolean') update.is_verified = is_verified
    // Verifikasi konselor otomatis saat peran berubah menjadi konselor.
    if (role === 'konselor' && is_verified === undefined) update.is_verified = true

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', user_id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    await supabase.rpc('log_audit', {
      p_action: 'role_change',
      p_entity: 'profiles',
      p_entity_id: user_id,
      p_detail: {
        from: targetRole,
        to: role,
        target_name: targetData.full_name,
        specialization: specialization ?? null,
        is_verified: (update.is_verified as boolean | undefined) ?? null,
      },
    })

    // Notifikasi lintas pengguna ditolak policy notif_insert (user_id =
    // auth.uid()); dikirim lewat RPC SECURITY DEFINER.
    await supabase.rpc('notify_user', {
      p_user_id: user_id,
      p_type: role === 'konselor' ? 'konselor_verified' : 'system',
      p_title:
        role === 'konselor'
          ? 'Selamat! Kamu telah diverifikasi sebagai Konselor'
          : `Peran kamu diperbarui menjadi ${role}`,
      p_body:
        role === 'konselor'
          ? 'Kamu sekarang bisa menerima sesi konseling dari anggota.'
          : null,
      p_link: '/dashboard',
    })

    revalidatePath('/admin')
    return { success: true as const, profile: updated }
  })
}

// ─────────────────────────────────────────────────────────────
// Pembukaan identitas penulis anonim (T5)
// ─────────────────────────────────────────────────────────────
//
// SEBELUMNYA: form di /admin memanggil `profiles.select(...).eq('anon_token', ...)`
// LANGSUNG dari browser. Artinya (a) siapa pun yang membuka DevTools bisa
// membaca identitas tanpa pernah tercatat, dan (b) pencarian memakai awalan
// token 4 huruf yang bisa bentrok antar pengguna sehingga bisa membuka orang
// yang salah. Sekarang seluruh proses berjalan di server lewat RPC
// `reveal_identity`, yang menulis log LEBIH DULU sebelum mengembalikan data.

const revealSchema = z.object({
  // Menerima UUID konten, atau tautan forum/prayer/renungan yang memuat UUID.
  contentRef: z.string().trim().min(1, 'Isi tautan atau ID konten.'),
  contentType: z.enum(['thread', 'comment', 'prayer']),
  reason: z
    .string()
    .trim()
    .min(20, 'Alasan pembukaan wajib diisi minimal 20 karakter.'),
})

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export async function revealIdentity(formData: FormData) {
  return guarded(async () => {
    // Hanya super admin — sama seperti yang dijaga RPC di database.
    const ctx = await requireCap('revealIdentity')

    const parsed = revealSchema.safeParse({
      contentRef: formData.get('content_ref'),
      contentType: formData.get('content_type'),
      reason: formData.get('reason'),
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
    }

    const uuid = parsed.data.contentRef.match(UUID_RE)?.[0]
    if (!uuid) {
      return {
        error:
          'Tidak menemukan ID konten. Tempelkan tautan konten (mis. /forum/xxxxxxxx-...) atau ID-nya langsung.',
      }
    }

    const supabase = createClient()
    const { data, error } = await supabase.rpc('reveal_identity', {
      p_content_type: parsed.data.contentType,
      p_content_id: uuid,
      p_reason: parsed.data.reason,
    })

    if (error) {
      // Pesan dari RPC sudah spesifik (mis. "Konten tidak ditemukan.").
      return { error: error.message }
    }

    const row = (data as { user_id: string; full_name: string; angkatan: string | null; jurusan: string | null }[] | null)?.[0]
    if (!row) return { error: 'Konten tidak ditemukan.' }

    revalidatePath('/admin')
    return {
      success: true as const,
      identity: `${row.full_name} · Angkatan ${row.angkatan ?? '—'} · ${row.jurusan ?? '—'}`,
      requestedBy: ctx.userId,
    }
  })
}

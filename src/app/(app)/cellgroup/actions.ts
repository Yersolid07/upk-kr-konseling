// src/app/(app)/cellgroup/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/** Create a new KK/KTB (Kelompok Kecil / Kelompok Tumbuh Bersama). Only konselor / admin / super_admin may lead one. */
export async function createCellGroup(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as any)?.role
  if (!['konselor', 'admin', 'super_admin'].includes(role)) {
    return { error: 'Hanya konselor/admin yang dapat membuat KK/KTB.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const icon = (formData.get('icon') as string)?.trim() || 'users'

  if (!name || name.length < 3) {
    return { error: 'Nama KK/KTB minimal 3 karakter.' }
  }

  const { data: group, error } = await (supabase.from('cell_groups') as any)
    .insert({ name, description, icon, leader_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('createCellGroup error:', error)
    return { error: 'Gagal membuat KK/KTB.' }
  }

  // Leader automatically becomes a member.
  await (supabase.from('cell_group_members') as any).insert({
    group_id: group.id,
    user_id: user.id,
    is_leader: true,
  })

  revalidatePath('/cellgroup')
  redirect(`/cellgroup/${group.id}`)
}

/**
 * Bergabung ke KK/KTB.
 *
 * Memakai RPC `join_cell_group`, bukan insert langsung. Pemeriksaan kode
 * undangan, status arsip, dan batas anggota harus terjadi dalam SATU transaksi:
 * dua orang yang menekan "Gabung" bersamaan tidak boleh sama-sama lolos saat
 * grup tersisa satu kursi.
 */
export async function joinCellGroup(groupId: string, inviteCode?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk.' }

  const { data, error } = await supabase.rpc('join_cell_group', {
    p_group_id: groupId,
    p_invite_code: inviteCode?.trim() || null,
  })

  if (error) {
    console.error('joinCellGroup error:', error)
    return { error: 'Gagal bergabung. Silakan coba lagi.' }
  }

  const res = data as unknown as {
    ok: boolean
    error?: string
    joined?: boolean
    already_member?: boolean
  }
  if (!res?.ok) return { error: res?.error ?? 'Gagal bergabung.' }

  revalidatePath('/cellgroup')
  revalidatePath(`/cellgroup/${groupId}`)
  return { success: true, alreadyMember: Boolean(res.already_member) }
}

/** Leave a KK/KTB (leader cannot leave their own group). */
export async function leaveCellGroup(groupId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk.' }

  const { data: group } = await supabase
    .from('cell_groups')
    .select('leader_id')
    .eq('id', groupId)
    .single()

  if ((group as any)?.leader_id === user.id) {
    return { error: 'Pemimpin tidak dapat keluar dari KK/KTB sendiri.' }
  }

  const { error } = await (supabase.from('cell_group_members') as any)
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) {
    console.error('leaveCellGroup error:', error)
    return { error: 'Gagal keluar dari KK/KTB.' }
  }

  revalidatePath('/cellgroup')
  redirect('/cellgroup')
}

/** Send a message to a KK/KTB (members only, enforced by RLS too). */
export async function sendGroupMessage(groupId: string, content: string, isAnonymous = false) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk.' }

  const trimmed = content?.trim()
  if (!trimmed) return { error: 'Pesan tidak boleh kosong.' }

  // Grup yang diarsipkan tidak menerima pesan baru — riwayat tetap terbaca.
  const { data: grp } = await supabase
    .from('cell_groups')
    .select('is_archived, is_active')
    .eq('id', groupId)
    .maybeSingle()

  const g = grp as unknown as { is_archived: boolean; is_active: boolean } | null
  if (!g) return { error: 'Grup tidak ditemukan.' }
  if (g.is_archived) return { error: 'Grup ini sudah diarsipkan dan tidak menerima pesan baru.' }
  if (!g.is_active) return { error: 'Grup ini sedang tidak aktif.' }

  const { error } = await (supabase.from('cell_group_messages') as any).insert({
    group_id: groupId,
    sender_id: user.id,
    content: trimmed,
    is_anonymous: isAnonymous,
  })

  if (error) {
    console.error('sendGroupMessage error:', error)
    return { error: 'Gagal mengirim pesan.' }
  }

  revalidatePath(`/cellgroup/${groupId}`)
  return { success: true }
}

// src/app/(app)/cellgroup/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/** Create a new cell group. Only konselor / admin / super_admin may lead one. */
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
    return { error: 'Hanya konselor/admin yang dapat membuat Cell Group.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const icon = (formData.get('icon') as string)?.trim() || '✝️'

  if (!name || name.length < 3) {
    return { error: 'Nama Cell Group minimal 3 karakter.' }
  }

  const { data: group, error } = await (supabase.from('cell_groups') as any)
    .insert({ name, description, icon, leader_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('createCellGroup error:', error)
    return { error: 'Gagal membuat Cell Group.' }
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

/** Join an active cell group by id. */
export async function joinCellGroup(groupId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk.' }

  // Already a member?
  const { data: existing } = await supabase
    .from('cell_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    revalidatePath('/cellgroup')
    return { success: true, alreadyMember: true }
  }

  const { error } = await (supabase.from('cell_group_members') as any).insert({
    group_id: groupId,
    user_id: user.id,
  })

  if (error) {
    console.error('joinCellGroup error:', error)
    return { error: 'Gagal bergabung. Silakan coba lagi.' }
  }

  revalidatePath('/cellgroup')
  revalidatePath(`/cellgroup/${groupId}`)
  return { success: true }
}

/** Leave a cell group (leader cannot leave their own group). */
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
    return { error: 'Pemimpin tidak dapat keluar dari grup sendiri.' }
  }

  const { error } = await (supabase.from('cell_group_members') as any)
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (error) {
    console.error('leaveCellGroup error:', error)
    return { error: 'Gagal keluar dari grup.' }
  }

  revalidatePath('/cellgroup')
  redirect('/cellgroup')
}

/** Send a message to a cell group (members only, enforced by RLS too). */
export async function sendGroupMessage(groupId: string, content: string, isAnonymous = false) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk.' }

  const trimmed = content?.trim()
  if (!trimmed) return { error: 'Pesan tidak boleh kosong.' }

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

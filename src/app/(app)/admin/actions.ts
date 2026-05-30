'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAdminContent() {
  const supabase = createClient()
  
  // Verify super_admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
    return { error: 'Unauthorized' }
  }

  // Fetch threads
  const { data: threads } = await supabase
    .from('threads')
    .select('id, title, content, created_at, author:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch comments
  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, created_at, thread_id, author:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch prayers
  const { data: prayers } = await supabase
    .from('prayer_requests')
    .select('id, content, created_at, author:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  return { threads, comments, prayers }
}

export async function deleteContent(type: 'thread' | 'comment' | 'prayer', id: string) {
  const supabase = createClient()
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as any
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
    return { error: 'Unauthorized' }
  }

  const table = type === 'thread' ? 'threads' : type === 'comment' ? 'comments' : 'prayer_requests'

  const { error } = await supabase.from(table).delete().eq('id', id)
  
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

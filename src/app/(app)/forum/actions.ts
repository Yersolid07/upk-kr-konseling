// src/app/forum/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createThread(formData: FormData) {
  const supabase = createClient()
  
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const categoryId = formData.get('category_id') as string
  const isAnonymous = formData.get('is_anonymous') === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk untuk memposting.' }

  const { data, error } = await (supabase.from('threads') as any)
    .insert({
      title,
      content,
      category_id: categoryId,
      author_id: user.id,
      is_anonymous: isAnonymous
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating thread:', error)
    return { error: 'Gagal membuat diskusi. Silakan coba lagi.' }
  }

  revalidatePath('/forum')
  redirect(`/forum/${data.id}`)
}

export async function createComment(threadId: string, content: string, isAnonymous: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk untuk berkomentar.' }

  const { error } = await (supabase.from('comments') as any)
    .insert({
      thread_id: threadId,
      author_id: user.id,
      content,
      is_anonymous: isAnonymous
    })

  if (error) return { error: 'Gagal mengirim komentar.' }

  revalidatePath(`/forum/${threadId}`)
  return { success: true }
}

export async function toggleLike(threadId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Anda harus masuk untuk menyukai.' }

  // Check existing reaction
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('content_type', 'thread')
    .eq('content_id', threadId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await (supabase.from('reactions') as any).delete().eq('id', (existing as any).id)
  } else {
    await (supabase.from('reactions') as any).insert({
      content_type: 'thread',
      content_id: threadId,
      user_id: user.id,
      reaction: '🙏'
    })
  }

  // Update thread comment_count to represent likes (if using comment_count as likes, but actually we should query it)
  // Let's just revalidate
  revalidatePath(`/forum/${threadId}`)
  revalidatePath(`/forum`)
  return { success: true }
}

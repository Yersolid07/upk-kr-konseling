// src/app/forum/actions.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, guarded } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getThread, listComments } from '@/lib/public-content'
import type { PublicComment } from '@/lib/public-content'

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

/**
 * Ambil SATU komentar dalam bentuk publik — dipakai komponen realtime di
 * browser saat komentar baru masuk.
 *
 * Kenapa lewat server: sebelumnya komponen klien mengambil komentar langsung
 * dari tabel `comments` dengan `author:profiles(..., anon_token)`, sehingga
 * anon_token penulis anonim ikut terkirim ke browser lewat jaringan. Di sini
 * view `comments_public` yang dipakai, jadi author_id dan token tidak pernah
 * meninggalkan server.
 */
const commentIdSchema = z.string().uuid()

export async function fetchCommentPublic(
  commentId: string
): Promise<{ comment: PublicComment } | { error: string }> {
  return guarded(async () => {
    await requireAuth()
    const id = commentIdSchema.parse(commentId)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('comments_public')
      .select(
        `id, thread_id, parent_id, content, is_anonymous, created_at,
         author_id, anon_label, author_name, author_avatar, author_role`
      )
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return { error: 'Komentar tidak ditemukan.' }

    const r = data as unknown as Record<string, unknown>
    const isAnon = Boolean(r.is_anonymous)
    const comment: PublicComment = {
      id: String(r.id),
      thread_id: String(r.thread_id),
      parent_id: (r.parent_id as string | null) ?? null,
      content: String(r.content ?? ''),
      is_anonymous: isAnon,
      created_at: String(r.created_at),
      author: {
        label: isAnon
          ? `Anonim#${String(r.anon_label ?? '????')}`
          : String(r.author_name ?? 'Pengguna'),
        avatarUrl: (r.author_avatar as string | null) ?? null,
        role: (r.author_role as string | null) ?? null,
        isAnonymous: isAnon,
      },
    }
    return { comment }
  })
}

/** Versi publik satu thread — dipakai halaman detail setelah pembaruan. */
export async function fetchThreadPublic(threadId: string) {
  return guarded(async () => {
    await requireAuth()
    const id = commentIdSchema.parse(threadId)
    const supabase = createClient()
    const thread = await getThread(supabase, id)
    if (!thread) return { error: 'Diskusi tidak ditemukan.' }
    return { thread }
  })
}

/** Daftar komentar sebuah thread (versi publik). */
export async function fetchThreadComments(threadId: string) {
  return guarded(async () => {
    await requireAuth()
    const id = commentIdSchema.parse(threadId)
    const supabase = createClient()
    return { comments: await listComments(supabase, id) }
  })
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
      reaction: 'pray'
    })
  }

  revalidatePath(`/forum/${threadId}`)
  revalidatePath(`/forum`)
  return { success: true }
}

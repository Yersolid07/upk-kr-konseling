// src/app/(app)/admin/cms/actions-articles.ts
'use server'

// Antrean persetujuan artikel. Artikel dari anggota/konselor masuk sebagai
// 'pending_review' dan TIDAK tampil di dinding renungan sampai admin/super_admin
// menyetujuinya.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCap, guarded } from '@/lib/auth-guard'

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

/** Setujui dan terbitkan artikel. */
export async function approveArticle(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireCap('approveArticles')
    const id = str(formData, 'id')
    if (!id) return { error: 'ID artikel tidak ditemukan.' }

    const supabase = createClient()
    const { error } = await supabase
      .from('articles')
      .update({
        status: 'published',
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: str(formData, 'review_notes') || null,
      })
      .eq('id', id)

    if (error) return { error: `Gagal menyetujui: ${error.message}` }

    // Beri tahu penulis.
    const { data: article } = await supabase
      .from('articles')
      .select('author_id, title')
      .eq('id', id)
      .single()

    const a = article as { author_id: string; title: string } | null
    if (a) {
      await supabase.from('notifications').insert({
        user_id: a.author_id,
        type: 'system',
        title: 'Artikel Disetujui',
        body: `Artikel "${a.title}" sudah terbit di dinding Renungan.`,
        link: `/renungan/${id}`,
      })
    }

    await supabase.rpc('log_audit', {
      p_action: 'approve',
      p_entity: 'articles',
      p_entity_id: id,
      p_detail: {} as never,
    })

    revalidatePath('/admin/articles')
    revalidatePath('/renungan')
    return { success: 'Artikel diterbitkan.' }
  })
}

/** Tolak artikel dengan catatan untuk penulis. */
export async function rejectArticle(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireCap('approveArticles')
    const id = str(formData, 'id')
    const notes = str(formData, 'review_notes')
    if (!id) return { error: 'ID artikel tidak ditemukan.' }
    if (!notes) return { error: 'Catatan alasan penolakan wajib diisi agar penulis tahu apa yang perlu diperbaiki.' }

    const supabase = createClient()
    const { error } = await supabase
      .from('articles')
      .update({
        status: 'rejected',
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
      })
      .eq('id', id)

    if (error) return { error: `Gagal menolak: ${error.message}` }

    const { data: article } = await supabase
      .from('articles')
      .select('author_id, title')
      .eq('id', id)
      .single()

    const a = article as { author_id: string; title: string } | null
    if (a) {
      await supabase.from('notifications').insert({
        user_id: a.author_id,
        type: 'system',
        title: 'Artikel Perlu Diperbaiki',
        body: `Artikel "${a.title}" belum dapat diterbitkan. Catatan: ${notes}`,
        link: `/renungan/${id}`,
      })
    }

    await supabase.rpc('log_audit', {
      p_action: 'reject',
      p_entity: 'articles',
      p_entity_id: id,
      p_detail: { notes } as never,
    })

    revalidatePath('/admin/articles')
    return { success: 'Artikel dikembalikan ke penulis dengan catatan.' }
  })
}

/** Tarik artikel yang sudah terbit (arsip). */
export async function archiveArticle(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireCap('approveArticles')
    const id = str(formData, 'id')
    if (!id) return { error: 'ID artikel tidak ditemukan.' }

    const supabase = createClient()
    const { error } = await supabase
      .from('articles')
      .update({
        status: 'archived',
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { error: `Gagal mengarsipkan: ${error.message}` }

    await supabase.rpc('log_audit', {
      p_action: 'unpublish',
      p_entity: 'articles',
      p_entity_id: id,
      p_detail: {} as never,
    })

    revalidatePath('/admin/articles')
    revalidatePath('/renungan')
    return { success: 'Artikel diarsipkan.' }
  })
}

// src/app/(app)/renungan/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth, guarded } from '@/lib/auth-guard'
import { isAdminOrAbove } from '@/lib/rbac'
import { validateAttachment } from '@/lib/attachment-policy'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { DraftAttachment } from '@/components/ui/attachment-input'

function generateSlug(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .slice(0, 80)
}

/**
 * Simpan lampiran draf ke tabel attachments (content_id diisi setelah insert).
 *
 * Validasi di sini adalah KONTROL KEAMANAN, bukan sekadar kerapian data:
 * DraftAttachment datang dari FormData yang bisa ditempa klien. Tanpa
 * pemeriksaan ini, siapa pun bisa menyisipkan `kind: 'embed'` dengan URL
 * sembarang dan URL itu nanti dirender sebagai <iframe src> di halaman
 * artikel — vektor phishing/XSS.
 */
async function persistAttachments(
  supabase: ReturnType<typeof createClient>,
  ownerId: string,
  contentId: string,
  items: DraftAttachment[]
) {
  if (!items || items.length === 0) return

  const valid = items.filter((a) => {
    const err = validateAttachment({
      kind: a.kind,
      url: a.url,
      title: a.title,
      mime_type: a.mime_type ?? null,
      size_bytes: a.size_bytes ?? null,
    })
    if (err) console.warn('[attachments] ditolak:', err, a.url?.slice(0, 60))
    return !err
  })

  if (valid.length === 0) return

  await supabase.from('attachments').insert(
    valid.map((a, i) => ({
      owner_id: ownerId,
      content_type: 'article',
      content_id: contentId,
      kind: a.kind,
      url: a.url,
      title: a.title,
      mime_type: a.mime_type ?? null,
      size_bytes: a.size_bytes ?? null,
      sort_order: i,
    }))
  )
}

export async function createArticle(formData: FormData) {
  return guarded(async () => {
    const ctx = await requireAuth()

    const title = String(formData.get('title') ?? '').trim()
    const content = String(formData.get('content') ?? '').trim()
    const excerpt = String(formData.get('excerpt') ?? '').trim() || null
    const categoryId = String(formData.get('category_id') ?? '') || null
    const coverUrl = String(formData.get('cover_url') ?? '') || null

    if (title.length < 5) return { error: 'Judul minimal 5 karakter.' }
    if (content.length < 50) return { error: 'Isi artikel minimal 50 karakter.' }

    let attachments: DraftAttachment[] = []
    const raw = formData.get('attachments')
    if (typeof raw === 'string' && raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) attachments = parsed
      } catch {
        /* lampiran rusak — abaikan, artikel tetap bisa disimpan */
      }
    }

    const supabase = createClient()
    const slug = `${generateSlug(title)}-${Math.random().toString(36).slice(2, 7)}`

    // Penulis non-admin tidak boleh menerbitkan sendiri: masuk antrean review.
    // Trigger di DB (force_article_review) juga menegakkan aturan ini, jadi
    // walaupun kolom ini diakali, statusnya tetap dipaksa pending_review.
    const canPublishDirectly = isAdminOrAbove(ctx.role)
    const status = canPublishDirectly ? 'published' : 'pending_review'

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title,
        content,
        excerpt,
        category_id: categoryId,
        author_id: ctx.userId,
        slug,
        cover_url: coverUrl,
        status,
        is_published: canPublishDirectly,
        published_at: canPublishDirectly ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error('[createArticle]', error)
      return { error: 'Gagal menyimpan artikel. Silakan coba lagi.' }
    }

    const article = data as { id: string }
    await persistAttachments(supabase, ctx.userId, article.id, attachments)

    await supabase.rpc('log_audit', {
      p_action: 'create',
      p_entity: 'articles',
      p_entity_id: article.id,
      p_detail: { status },
    })

    // Beri tahu admin kalau perlu ditinjau. RPC notify_admins (SECURITY
    // DEFINER) dipakai karena policy notif_insert menolak insert lintas
    // pengguna — kalau memakai insert biasa, pemberitahuan ini gagal senyap.
    if (!canPublishDirectly) {
      await supabase.rpc('notify_admins', {
        p_type: 'system',
        p_title: 'Artikel Menunggu Persetujuan',
        p_body: `${ctx.profile.full_name} mengirim artikel "${title}" untuk ditinjau.`,
        p_link: '/admin/articles',
      })
    }

    revalidatePath('/renungan')
    revalidatePath('/admin/articles')

    if (canPublishDirectly) {
      redirect(`/renungan/${article.id}`)
    }
    redirect('/renungan?submitted=1')
  })
}

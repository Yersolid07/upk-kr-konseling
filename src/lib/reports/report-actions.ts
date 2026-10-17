// src/lib/reports/report-actions.ts
// Tombol "Laporkan" untuk konten publik (M8).
//
// ALUR
//   1. Validasi input + pastikan kontennya benar-benar ada dan masih terlihat.
//   2. Tolak laporan terhadap konten milik sendiri — melaporkan diri sendiri
//      hanya mengotori antrean moderator.
//   3. Satu pelapor hanya boleh melapor satu kali per konten (unique index di
//      database juga menjaga ini, tetapi pesan errornya harus ramah).
//   4. Tandai prioritas tinggi bila teks memuat kata kunci krisis.
//   5. Setelah laporan masuk, periksa ambang auto-hide. Bila tercapai, konten
//      disembunyikan SEMENTARA menunggu tinjauan.
//
// Kenapa auto-hide, bukan langsung hapus: laporan bisa saja salah. Menyembunyikan
// bersifat reversibel dan tercatat; menghapus tidak.

'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings/get'
import { REPORT_REASON_KEYS } from './reasons'

const reportSchema = z.object({
  contentType: z.enum(['thread', 'comment', 'prayer', 'article', 'message']),
  contentId: z.string().uuid('Konten tidak dikenali.'),
  reason: z.enum(REPORT_REASON_KEYS as [string, ...string[]]),
  detail: z.string().trim().max(500).optional(),
})


/** Ambil ID penulis dan teks konten, sesuai jenisnya. */
async function loadTarget(
  contentType: string,
  contentId: string
): Promise<{ authorId: string | null; text: string } | null> {
  const supabase = createClient()

  switch (contentType) {
    case 'thread': {
      const { data } = await supabase
        .from('threads')
        .select('author_id, title, content')
        .eq('id', contentId)
        .maybeSingle()
      if (!data) return null
      return { authorId: data.author_id, text: `${data.title} ${data.content}` }
    }
    case 'comment': {
      const { data } = await supabase
        .from('comments')
        .select('author_id, content')
        .eq('id', contentId)
        .maybeSingle()
      if (!data) return null
      return { authorId: data.author_id, text: data.content }
    }
    case 'prayer': {
      const { data } = await supabase
        .from('prayer_requests')
        .select('author_id, content')
        .eq('id', contentId)
        .maybeSingle()
      if (!data) return null
      return { authorId: data.author_id, text: data.content }
    }
    case 'article': {
      const { data } = await supabase
        .from('articles')
        .select('author_id, title, content')
        .eq('id', contentId)
        .maybeSingle()
      if (!data) return null
      return { authorId: data.author_id, text: `${data.title} ${data.content}` }
    }
    case 'message': {
      const { data } = await supabase
        .from('cell_group_messages')
        .select('sender_id, content')
        .eq('id', contentId)
        .maybeSingle()
      if (!data) return null
      return { authorId: data.sender_id, text: data.content }
    }
    default:
      return null
  }
}

export type ReportResult = { ok: true; message: string } | { ok: false; error: string }

/**
 * Kirim laporan. Dipanggil dari komponen klien mana pun.
 *
 * Tidak memakai `cmsAction`: ini jalur ANGGOTA, bukan staf. Guard-nya login
 * biasa, dan RLS `content_reports` yang memastikan reporter_id = auth.uid().
 */
export async function submitReport(raw: unknown): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }
  }
  const { contentType, contentId, reason, detail } = parsed.data

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Masuk dulu untuk melaporkan konten.' }
  }

  // 1. Konten harus ada, dan bukan milik pelapor.
  const target = await loadTarget(contentType, contentId)
  if (!target) {
    return { ok: false, error: 'Konten tidak ditemukan — mungkin sudah dihapus.' }
  }
  if (target.authorId === user.id) {
    return { ok: false, error: 'Ini kontenmu sendiri.' }
  }

  // 2. Prioritas tinggi bila menyebut bahaya diri, atau memuat kata kunci krisis.
  let severity = 'normal'
  if (reason === 'bahaya-diri') {
    severity = 'high'
  } else {
    const keywords = String(await getSetting('crisis_keywords'))
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
    const haystack = target.text.toLowerCase()
    if (keywords.some((k) => haystack.includes(k))) severity = 'high'
  }

  // 3. Simpan laporan. Unique index menangkap laporan ganda.
  const { error: insertErr } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    content_type: contentType,
    content_id: contentId,
    reason,
    detail: detail || null,
    severity,
  } as never)

  if (insertErr) {
    if (insertErr.code === '23505') {
      return { ok: false, error: 'Kamu sudah melaporkan konten ini. Tim moderasi sedang meninjaunya.' }
    }
    return { ok: false, error: insertErr.message }
  }

  // 4. Kabari moderator — kegagalan di sini tidak membatalkan laporan.
  try {
    await supabase.rpc('notify_admins', {
      p_type: 'system',
      p_title:
        severity === 'high'
          ? 'Laporan prioritas tinggi masuk'
          : 'Laporan konten baru masuk',
      p_body:
        severity === 'high'
          ? 'Ada laporan yang menyebut bahaya pada diri sendiri. Mohon ditinjau segera.'
          : 'Ada laporan konten yang menunggu tinjauan.',
      p_link: '/admin/laporan-modul',
    })
  } catch (e) {
    console.error('[submitReport] notify_admins gagal', e)
  }

  // 5. Auto-hide bila ambang tercapai. RPC karena anggota tidak punya izin
  //    UPDATE pada tabel konten — dan memang tidak seharusnya punya.
  const threshold = Number(await getSetting('auto_hide_report_threshold'))
  if (threshold > 0) {
    const { error: hideErr } = await supabase.rpc('auto_hide_reported_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_threshold: threshold,
    })
    if (hideErr) console.error('[submitReport] auto-hide gagal', hideErr.message)
  }

  return {
    ok: true,
    message:
      severity === 'high'
        ? 'Laporan terkirim dan ditandai prioritas. Tim moderasi akan meninjaunya segera.'
        : 'Laporan terkirim. Terima kasih — tim moderasi akan meninjaunya.',
  }
}

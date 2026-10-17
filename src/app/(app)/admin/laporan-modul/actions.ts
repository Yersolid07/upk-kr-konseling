// src/app/(app)/admin/laporan-modul/actions.ts
// Penanganan laporan konten (M8).
//
// Satu laporan ditangani lewat SATU aksi yang mencatat keputusan, menerapkan
// tindakan ke konten, dan memberi tahu pelapor — semuanya sekaligus. Memisah
// ketiganya membuat laporan bisa "selesai" tanpa kontennya ditindak, atau
// konten disembunyikan tanpa ada yang tahu siapa memutuskan apa.
//
// TINGKAT KEPUTUSAN:
//   dismiss  — laporan tidak beralasan; konten dibiarkan
//   review   — sudah ditinjau, belum diputuskan (tetap di antrean)
//   hide     — konten disembunyikan + laporan selesai
//   delete   — konten ke tempat sampah + laporan selesai

'use server'

import { z } from 'zod'
import { cmsAction } from '@/lib/cms/action'
/** Tabel yang bisa menjadi sasaran laporan, dari content_type di database. */
const REPORT_TYPE_TO_TABLE = {
  thread: 'threads',
  comment: 'comments',
  prayer: 'prayer_requests',
  article: 'articles',
  message: 'cell_group_messages',
} as const

type ReportTable = (typeof REPORT_TYPE_TO_TABLE)[keyof typeof REPORT_TYPE_TO_TABLE]

const decisionSchema = z.object({
  reportId: z.string().uuid('ID laporan tidak valid.'),
  decision: z.enum(['dismiss', 'review', 'hide', 'delete']),
  note: z.string().trim().min(5, 'Catatan minimal 5 karakter.').max(500),
})

const resolveReportImpl = cmsAction({
  cap: 'manageReports',
  entity: 'content_reports',
  action: 'update',
  requireReason: true,
  schema: decisionSchema,
  load: async ({ reportId }, db) => {
    const { data, error } = await db
      .from('content_reports')
      .select('id, content_type, content_id, status, reporter_id, reason')
      .eq('id', reportId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Laporan tidak ditemukan.')
    const r = data as unknown as {
      id: string
      content_type: string
      content_id: string
      status: string
      reporter_id: string
      reason: string
    }
    if (r.status === 'resolved' || r.status === 'dismissed') {
      throw new Error('Laporan ini sudah ditutup.')
    }
    return r
  },
  run: async (ctx, { reportId, decision, note }, db, before) => {
    const report = before as {
      content_type: string
      content_id: string
      reporter_id: string
      reason: string
    }
    const table: ReportTable | undefined =
      REPORT_TYPE_TO_TABLE[report.content_type as keyof typeof REPORT_TYPE_TO_TABLE]

    // Terapkan tindakan ke konten lebih dulu. Kalau langkah ini gagal,
    // laporan TIDAK ditutup — antrean tetap jujur.
    if ((decision === 'hide' || decision === 'delete') && table) {
      if (decision === 'hide') {
        const { error } = await db
          .from(table)
          .update({
            moderation_status: 'hidden',
            hidden_by: ctx.userId,
            hidden_reason: note,
            hidden_at: new Date().toISOString(),
          } as never)
          .eq('id', report.content_id)
        if (error) throw new Error(`Gagal menyembunyikan konten: ${error.message}`)
      } else {
        const now = new Date().toISOString()
        const { error } = await db
          .from(table)
          .update({
            deleted_at: now,
            deleted_by: ctx.userId,
            delete_reason: note,
            moderation_status: 'hidden',
          } as never)
          .eq('id', report.content_id)
        if (error) throw new Error(`Gagal memindahkan konten ke tempat sampah: ${error.message}`)
      }
    }

    const status =
      decision === 'dismiss' ? 'dismissed' : decision === 'review' ? 'reviewed' : 'resolved'

    const { error } = await db
      .from('content_reports')
      .update({
        status,
        reviewed_by: ctx.userId,
        reviewed_at: new Date().toISOString(),
        resolution: note,
        action_taken: decision,
        notified_reporter_at: new Date().toISOString(),
      } as never)
      .eq('id', reportId)
    if (error) throw new Error(error.message)

    // Beri tahu pelapor hasilnya — janji dasar sebuah tombol "Laporkan".
    // Kegagalan notifikasi tidak membatalkan keputusan yang sudah tersimpan.
    try {
      await db.rpc('notify_user', {
        p_user_id: report.reporter_id,
        p_type: 'system',
        p_title: 'Laporan kamu telah ditinjau',
        p_body:
          decision === 'dismiss'
            ? 'Setelah ditinjau, konten yang kamu laporkan tidak melanggar aturan komunitas.'
            : decision === 'review'
              ? 'Laporan kamu sedang ditinjau lebih lanjut oleh tim moderasi.'
              : 'Terima kasih — laporan kamu ditindaklanjuti.',
        p_link: null,
      })
    } catch (e) {
      console.error('[resolveReport] notifikasi pelapor gagal', e)
    }

    return { id: reportId, after: { status, action_taken: decision }, data: { status, decision } }
  },
  revalidate: ['/admin/laporan-modul', '/admin/forum', '/forum', '/prayer'],
})

// ── Pembungkus Server Action ──
export async function resolveReport(input: unknown) {
  return resolveReportImpl(input)
}


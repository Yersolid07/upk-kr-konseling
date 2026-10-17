// src/app/(app)/admin/prayer/prayer-table.tsx
// Tabel moderasi permohonan doa.
//
// Tindakan di sini sama dengan forum, ditambah "Tandai terjawab" yang berguna
// supaya dinding doa tidak penuh permohonan lama.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { EyeOff, Eye, Trash2, RotateCcw, Flame, CheckCircle2, Heart } from 'lucide-react'
import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/data-table'
import { DetailDrawer, DetailRow, StatusBadge } from '@/components/admin/detail-drawer'
import { ConfirmDialog, type ConfirmLevel } from '@/components/admin/confirm-dialog'
import { formatDateTime } from '@/lib/utils'
import { hideContent, unhideContent, trashContent, restoreContent, purgeContent } from '@/lib/cms/content-actions'
import { markPrayerAnswered } from './actions'
import { reviewPrayer } from './review-actions'
import { Check, X } from 'lucide-react'

export interface PrayerRow {
  id: string
  content: string
  authorLabel: string
  createdAt: string
  prayCount: number
  isAnswered: boolean
  status: string
  hiddenReason: string | null
  inTrash: boolean
}

const SCOPES = [
  { key: 'active', label: 'Aktif' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'answered', label: 'Sudah didoakan' },
  { key: 'hidden', label: 'Disembunyikan' },
  { key: 'trash', label: 'Tempat Sampah' },
] as const

interface PendingAction {
  kind: 'hide' | 'unhide' | 'trash' | 'restore' | 'purge'
  row: PrayerRow
  title: string
  description: string
  level: ConfirmLevel
  confirmLabel: string
  confirmWord?: string
}

export function PrayerTable({
  rows, total, page, pageSize, sort, dir, q, scope, canModerate = true,
}: {
  rows: PrayerRow[]
  total: number
  page: number
  pageSize: number
  sort: string
  dir: 'asc' | 'desc'
  q: string
  scope: string
  canModerate?: boolean
}) {
  const router = useRouter()
  const [openRow, setOpenRow] = useState<PrayerRow | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<PrayerRow | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const columns: Column<PrayerRow>[] = [
    {
      key: 'content',
      header: 'Permohonan',
      render: (r) => (
        <p className="max-w-[420px] text-sm text-[var(--text)] line-clamp-2 whitespace-pre-wrap">
          {r.content}
        </p>
      ),
    },
    {
      key: 'author',
      header: 'Pemohon',
      render: (r) => <span className="text-xs whitespace-nowrap">{r.authorLabel}</span>,
    },
    {
      key: 'pray_count',
      header: 'Didoakan',
      sortable: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <Heart size={12} /> {r.prayCount}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Dibuat',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={r.inTrash ? 'deleted' : r.status} />
          {r.isAnswered && (
            <span className="text-[10px] font-semibold text-emerald-700">Sudah didoakan</span>
          )}
        </div>
      ),
    },
  ]

  function ask(kind: PendingAction['kind'], row: PrayerRow) {
    const base = { kind, row }
    if (kind === 'hide')
      return setPending({
        ...base,
        title: 'Sembunyikan permohonan ini?',
        description: 'Tidak terlihat anggota, tetapi isinya tetap tersimpan dan bisa ditampilkan kembali.',
        level: 'reason',
        confirmLabel: 'Sembunyikan',
      })
    if (kind === 'unhide')
      return setPending({
        ...base,
        title: 'Tampilkan kembali?',
        description: 'Permohonan akan terlihat lagi oleh seluruh anggota.',
        level: 'normal',
        confirmLabel: 'Tampilkan',
      })
    if (kind === 'trash')
      return setPending({
        ...base,
        title: 'Pindahkan ke tempat sampah?',
        description: 'Permohonan disembunyikan dan masuk tempat sampah. Masih bisa dipulihkan.',
        level: 'reason',
        confirmLabel: 'Pindahkan',
      })
    if (kind === 'restore')
      return setPending({
        ...base,
        title: 'Pulihkan permohonan ini?',
        description: 'Permohonan kembali tampil seperti sebelumnya.',
        level: 'normal',
        confirmLabel: 'Pulihkan',
      })
    return setPending({
      ...base,
      title: 'Hapus PERMANEN permohonan ini?',
      description:
        'Isi permohonan dan seluruh dukungan doa akan dihapus dari database. TIDAK dapat dibatalkan.',
      level: 'critical',
      confirmLabel: 'Hapus permanen',
      confirmWord: 'HAPUS',
    })
  }

  async function run(data: { reason: string }): Promise<{ ok: boolean; error?: string }> {
    if (!pending) return { ok: false, error: 'Tidak ada tindakan.' }
    const { kind, row } = pending
    const payload = { table: 'prayer_requests' as const, id: row.id, reason: data.reason }

    const res =
      kind === 'hide'
        ? await hideContent(payload)
        : kind === 'unhide'
          ? await unhideContent({ table: 'prayer_requests', id: row.id })
          : kind === 'trash'
            ? await trashContent(payload)
            : kind === 'restore'
              ? await restoreContent({ table: 'prayer_requests', id: row.id })
              : await purgeContent(payload)

    if (res && typeof res === 'object' && 'error' in res && res.error) {
      return { ok: false, error: String(res.error) }
    }
    toast.success('Tindakan tersimpan.')
    setOpenRow(null)
    router.refresh()
    return { ok: true }
  }

  /**
   * Setujui atau tolak permohonan yang menunggu tinjauan.
   *
   * Penolakan butuh alasan tertulis, dan alasannya wajib sampai ke penulis.
   * `window.prompt` tidak dipakai: ia diblokir di banyak WebView, dan dialog
   * yang hilang membuat moderator tidak bisa menolak sama sekali.
   */
  async function decide(row: PrayerRow, decision: 'approve' | 'reject') {
    if (decision === 'reject') {
      setRejectTarget(row)
      setRejectNote('')
      return
    }
    setBusy(true)
    const res = await reviewPrayer({ id: row.id, decision, note: undefined })
    setBusy(false)
    if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
      toast.error(String((res as { error: string }).error))
      return
    }
    toast.success('Permohonan disetujui dan tampil.')
    setOpenRow(null)
    router.refresh()
  }

  /** Kirim penolakan setelah alasan diisi di dialog. */
  async function confirmReject() {
    if (!rejectTarget) return
    const trimmed = rejectNote.trim()
    if (trimmed.length < 5) {
      toast.error('Alasan minimal 5 karakter.')
      return
    }
    setBusy(true)
    const res = await reviewPrayer({ id: rejectTarget.id, decision: 'reject', note: trimmed })
    setBusy(false)
    if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
      toast.error(String((res as { error: string }).error))
      return
    }
    toast.success('Permohonan ditolak, penulis diberi tahu alasannya.')
    setRejectTarget(null)
    setRejectNote('')
    setOpenRow(null)
    router.refresh()
  }

  async function toggleAnswered(row: PrayerRow) {
    setBusy(true)
    const res = await markPrayerAnswered({ id: row.id, answered: !row.isAnswered })
    setBusy(false)
    if (res && typeof res === 'object' && 'error' in res && res.error) {
      toast.error(String(res.error))
      return
    }
    toast.success(row.isAnswered ? 'Tanda terjawab dilepas.' : 'Ditandai sudah didoakan.')
    setOpenRow(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={s.key === 'active' ? '/admin/prayer' : `/admin/prayer?scope=${s.key}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              scope === s.key || (!scope && s.key === 'active')
                ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
                : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)] hover:border-[var(--terra)]'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        basePath="/admin/prayer"
        extraParams={scope ? { scope } : {}}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpenRow(r)}
        emptyText="Tidak ada permohonan doa pada lingkup ini."
      />

      <DetailDrawer
        open={Boolean(openRow)}
        onClose={() => setOpenRow(null)}
        title="Permohonan Doa"
        subtitle={openRow ? `Oleh ${openRow.authorLabel}` : undefined}
        footer={
          openRow && (canModerate ? (
            <>
              {openRow.status === 'pending' && (
                <>
                  <button
                    disabled={busy}
                    onClick={() => decide(openRow, 'approve')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={13} /> Setujui & tampilkan
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide(openRow, 'reject')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <X size={13} /> Tolak
                  </button>
                </>
              )}
              <button
                disabled={busy}
                onClick={() => toggleAnswered(openRow)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <CheckCircle2 size={13} />
                {openRow.isAnswered ? 'Lepas tanda terjawab' : 'Tandai sudah didoakan'}
              </button>
              {openRow.inTrash ? (
                <>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
                    onClick={() => ask('restore', openRow)}
                  >
                    <RotateCcw size={13} /> Pulihkan
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    onClick={() => ask('purge', openRow)}
                  >
                    <Flame size={13} /> Hapus permanen
                  </button>
                </>
              ) : (
                <>
                  {openRow.status === 'hidden' ? (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      onClick={() => ask('unhide', openRow)}
                    >
                      <Eye size={13} /> Tampilkan
                    </button>
                  ) : (
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
                      onClick={() => ask('hide', openRow)}
                    >
                      <EyeOff size={13} /> Sembunyikan
                    </button>
                  )}
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                    onClick={() => ask('trash', openRow)}
                  >
                    <Trash2 size={13} /> Tempat sampah
                  </button>
                </>
              )}
            </>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)]">
              Tindakan moderasi nonaktif sampai migrasi database dijalankan.
            </span>
          ))
        }
      >
        {openRow && (
          <>
            <DetailRow label="Status">
              <StatusBadge status={openRow.inTrash ? 'deleted' : openRow.status} />
            </DetailRow>
            <DetailRow label="Pemohon">{openRow.authorLabel}</DetailRow>
            <DetailRow label="Dibuat">{formatDateTime(openRow.createdAt)}</DetailRow>
            <DetailRow label="Didoakan">{openRow.prayCount} kali</DetailRow>
            {openRow.hiddenReason && (
              <DetailRow label="Alasan">
                <span className="text-xs">{openRow.hiddenReason}</span>
              </DetailRow>
            )}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5">Isi permohonan</p>
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-[var(--cream)] border border-[var(--cream-dark)] p-3">
                {openRow.content}
              </p>
            </div>
          </>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title={pending?.title ?? ''}
        description={pending?.description}
        level={pending?.level ?? 'reason'}
        confirmLabel={pending?.confirmLabel}
        confirmWord={pending?.confirmWord}
        onConfirm={run}
      />

      {rejectTarget && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => !busy && setRejectTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
              <h2 className="font-bold text-[var(--brown-dark)] text-sm">Tolak permohonan doa</h2>
              <button
                onClick={() => !busy && setRejectTarget(null)}
                className="text-[var(--text-muted)] hover:text-[var(--brown)]"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Alasan akan dikirim ke penulis. Tulis dengan jelas dan tanpa menghakimi — penulis
                sedang dalam keadaan rentan.
              </p>

              <p className="rounded-lg bg-[var(--cream)]/60 border border-[var(--cream-dark)] px-3 py-2 text-xs text-[var(--text-2)] line-clamp-3">
                {rejectTarget.content}
              </p>

              <div className="form-group">
                <label className="form-label">Alasan penolakan (wajib, min. 5 karakter)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  maxLength={500}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Contoh: Permohonan memuat data pribadi orang lain (nomor telepon)."
                  style={{ resize: 'vertical' }}
                  autoFocus
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{rejectNote.length}/500</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={busy}
                className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmReject}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <X size={13} /> Tolak permohonan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

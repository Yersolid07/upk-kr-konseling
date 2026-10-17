// src/app/(app)/admin/forum/forum-table.tsx
// Tabel moderasi forum + panel detail + dialog konfirmasi.
//
// Tindakan tersedia berbeda menurut status baris:
//   aktif       → Sembunyikan, Tandai, Pindahkan ke tempat sampah
//   disembunyikan → Tampilkan kembali, Tempat sampah
//   ditandai    → sama seperti aktif
//   tempat sampah → Pulihkan, Hapus permanen (hanya super_admin)
//
// Tombol yang tidak relevan tidak ditampilkan — bukan ditampilkan lalu gagal.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Pin, PinOff, Lock, LockOpen, Flag, EyeOff, Eye, Trash2, RotateCcw, Flame,
  MessageSquare, ExternalLink, FolderInput,
} from 'lucide-react'
import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/data-table'
import { DetailDrawer, DetailRow, StatusBadge } from '@/components/admin/detail-drawer'
import { ConfirmDialog, type ConfirmLevel } from '@/components/admin/confirm-dialog'
import { formatDateTime } from '@/lib/utils'
import {
  hideContent, unhideContent, trashContent, restoreContent, purgeContent, flagContent,
} from '@/lib/cms/content-actions'
import { toggleThreadFlag } from './thread-edit-actions'

export interface ForumRow {
  id: string
  title: string
  excerpt: string
  authorLabel: string
  categoryName: string | null
  createdAt: string
  commentCount: number
  viewCount: number
  isPinned: boolean
  isLocked: boolean
  isFlagged: boolean
  status: string
  hiddenReason: string | null
  inTrash: boolean
}

const SCOPES = [
  { key: 'active', label: 'Aktif' },
  { key: 'flagged', label: 'Ditandai' },
  { key: 'hidden', label: 'Disembunyikan' },
  { key: 'trash', label: 'Tempat Sampah' },
] as const

/** Aksi yang sedang menunggu konfirmasi. */
interface PendingAction {
  kind:
    | 'hide'
    | 'unhide'
    | 'trash'
    | 'restore'
    | 'purge'
    | 'flag'
    | 'pin'
    | 'unpin'
    | 'lock'
    | 'unlock'
  row: ForumRow
  title: string
  description: string
  level: ConfirmLevel
  confirmLabel: string
  confirmWord?: string
}

export function ForumTable({
  rows, total, page, pageSize, sort, dir, q, scope, canModerate = true,
}: {
  rows: ForumRow[]
  total: number
  page: number
  pageSize: number
  sort: string
  dir: 'asc' | 'desc'
  q: string
  scope: string
  /** false bila migrasi Fase 2 belum dijalankan — tindakan disembunyikan. */
  canModerate?: boolean
}) {
  const router = useRouter()
  const [openRow, setOpenRow] = useState<ForumRow | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  const columns: Column<ForumRow>[] = [
    {
      key: 'title',
      header: 'Diskusi',
      sortable: true,
      render: (r) => (
        <div className="min-w-0 max-w-[380px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-[var(--brown-dark)] break-words">{r.title}</span>
            {r.isPinned && <Pin size={12} className="text-[var(--terra)] shrink-0" />}
            {r.isLocked && <Lock size={12} className="text-[var(--text-muted)] shrink-0" />}
            {r.isFlagged && <Flag size={12} className="text-amber-600 shrink-0" />}
          </div>
          <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">{r.excerpt}</p>
        </div>
      ),
    },
    {
      key: 'author',
      header: 'Penulis',
      render: (r) => <span className="text-xs">{r.authorLabel}</span>,
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (r) =>
        r.categoryName ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--cream-dark)] text-[var(--text-2)]">
            {r.categoryName}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        ),
    },
    {
      key: 'comment_count',
      header: 'Komentar',
      sortable: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <MessageSquare size={12} /> {r.commentCount}
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
          {r.hiddenReason && (
            <span className="text-[10px] text-[var(--text-muted)] line-clamp-2 max-w-[160px]">
              {r.hiddenReason}
            </span>
          )}
        </div>
      ),
    },
  ]

  /** Susun definisi konfirmasi untuk sebuah tindakan. */
  function ask(kind: PendingAction['kind'], row: ForumRow) {
    const base = { kind, row }
    switch (kind) {
      case 'hide':
        return setPending({
          ...base,
          title: 'Sembunyikan diskusi ini?',
          description:
            'Diskusi tidak akan terlihat oleh anggota, tetapi isinya tetap tersimpan dan bisa ditampilkan kembali.',
          level: 'reason',
          confirmLabel: 'Sembunyikan',
        })
      case 'unhide':
        return setPending({
          ...base,
          title: 'Tampilkan kembali diskusi ini?',
          description: 'Diskusi akan terlihat lagi oleh seluruh anggota.',
          level: 'normal',
          confirmLabel: 'Tampilkan',
        })
      case 'flag':
        return setPending({
          ...base,
          title: 'Tandai diskusi ini?',
          description:
            'Tanda membantu moderator lain menemukan diskusi yang perlu ditinjau. Konten tetap terlihat.',
          level: 'reason',
          confirmLabel: 'Tandai',
        })
      case 'trash':
        return setPending({
          ...base,
          title: 'Pindahkan ke tempat sampah?',
          description:
            'Diskusi disembunyikan dari anggota dan masuk tempat sampah. Masih bisa dipulihkan kapan saja.',
          level: 'reason',
          confirmLabel: 'Pindahkan',
        })
      case 'restore':
        return setPending({
          ...base,
          title: 'Pulihkan diskusi ini?',
          description: 'Diskusi akan kembali tampil seperti sebelumnya.',
          level: 'normal',
          confirmLabel: 'Pulihkan',
        })
      case 'pin':
        return setPending({
          ...base,
          title: 'Sematkan diskusi ini?',
          description: 'Diskusi tersemat tampil paling atas di daftar forum.',
          level: 'normal',
          confirmLabel: 'Sematkan',
        })
      case 'unpin':
        return setPending({
          ...base,
          title: 'Lepas sematan?',
          description: 'Diskusi kembali mengikuti urutan waktu biasa.',
          level: 'normal',
          confirmLabel: 'Lepas',
        })
      case 'lock':
        return setPending({
          ...base,
          title: 'Kunci diskusi ini?',
          description:
            'Anggota tidak bisa menambah komentar baru. Komentar yang sudah ada tetap terlihat.',
          level: 'normal',
          confirmLabel: 'Kunci',
        })
      case 'unlock':
        return setPending({
          ...base,
          title: 'Buka kunci diskusi?',
          description: 'Anggota bisa berkomentar lagi.',
          level: 'normal',
          confirmLabel: 'Buka kunci',
        })
      case 'purge':
        return setPending({
          ...base,
          title: 'Hapus PERMANEN diskusi ini?',
          description:
            'Diskusi dan seluruh komentarnya akan dihapus dari database. Tindakan ini TIDAK dapat dibatalkan dan tidak bisa dipulihkan.',
          level: 'critical',
          confirmLabel: 'Hapus permanen',
          confirmWord: 'HAPUS',
        })
    }
  }

  /** Jalankan aksi yang sudah dikonfirmasi. */
  async function run(data: { reason: string }): Promise<{ ok: boolean; error?: string }> {
    if (!pending) return { ok: false, error: 'Tidak ada tindakan.' }
    const { kind, row } = pending
    const payload = { table: 'threads' as const, id: row.id, reason: data.reason }

    const res =
      kind === 'pin' || kind === 'unpin'
        ? await toggleThreadFlag({ id: row.id, field: 'is_pinned', value: kind === 'pin' })
        : kind === 'lock' || kind === 'unlock'
          ? await toggleThreadFlag({ id: row.id, field: 'is_locked', value: kind === 'lock' })
          : kind === 'hide'
        ? await hideContent(payload)
        : kind === 'unhide'
          ? await unhideContent({ table: 'threads', id: row.id })
          : kind === 'trash'
            ? await trashContent(payload)
            : kind === 'restore'
              ? await restoreContent({ table: 'threads', id: row.id })
              : kind === 'purge'
                ? await purgeContent(payload)
                : await flagContent(payload)

    if (res && typeof res === 'object' && 'error' in res && res.error) {
      return { ok: false, error: String(res.error) }
    }
    toast.success('Tindakan tersimpan.')
    setOpenRow(null)
    router.refresh()
    return { ok: true }
  }

  return (
    <>
      {/* Pemilih lingkup */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={s.key === 'active' ? '/admin/forum' : `/admin/forum?scope=${s.key}`}
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
        basePath="/admin/forum"
        extraParams={scope ? { scope } : {}}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpenRow(r)}
        emptyText="Tidak ada diskusi pada lingkup ini."
      />

      {/* Panel detail */}
      <DetailDrawer
        open={Boolean(openRow)}
        onClose={() => setOpenRow(null)}
        title={openRow?.title ?? ''}
        subtitle={openRow ? `Oleh ${openRow.authorLabel}` : undefined}
        footer={
          openRow &&
          (canModerate ? (
            <RowActions row={openRow} onAsk={(k) => ask(k, openRow)} />
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
            <DetailRow label="Kategori">{openRow.categoryName ?? '—'}</DetailRow>
            <DetailRow label="Dibuat">{formatDateTime(openRow.createdAt)}</DetailRow>
            <DetailRow label="Komentar">{openRow.commentCount}</DetailRow>
            <DetailRow label="Dilihat">{openRow.viewCount} kali</DetailRow>
            {openRow.hiddenReason && (
              <DetailRow label="Alasan">
                <span className="text-xs">{openRow.hiddenReason}</span>
              </DetailRow>
            )}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1.5">Isi</p>
              <p className="text-sm whitespace-pre-wrap rounded-lg bg-[var(--cream)] border border-[var(--cream-dark)] p-3">
                {openRow.excerpt}
                {openRow.excerpt.length >= 140 && '…'}
              </p>
            </div>
            <Link
              href={`/forum/${openRow.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--terra)] hover:underline"
            >
              <ExternalLink size={13} /> Buka di forum
            </Link>
          </>
        )}
      </DetailDrawer>

      {/* Konfirmasi */}
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
    </>
  )
}

/** Tombol tindakan yang tersedia untuk satu baris. */
function RowActions({
  row,
  onAsk,
}: {
  row: ForumRow
  onAsk: (kind: PendingAction['kind']) => void
}) {
  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors'

  if (row.inTrash) {
    return (
      <>
        <button
          className={`${btn} border-[var(--cream-dark)] text-[var(--text-2)] hover:border-[var(--terra)]`}
          onClick={() => onAsk('restore')}
        >
          <RotateCcw size={13} /> Pulihkan
        </button>
        <button
          className={`${btn} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
          onClick={() => onAsk('purge')}
        >
          <Flame size={13} /> Hapus permanen
        </button>
      </>
    )
  }

  return (
    <>
      {row.status === 'hidden' ? (
        <button
          className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          onClick={() => onAsk('unhide')}
        >
          <Eye size={13} /> Tampilkan kembali
        </button>
      ) : (
        <button
          className={`${btn} border-[var(--cream-dark)] text-[var(--text-2)] hover:border-[var(--terra)]`}
          onClick={() => onAsk('hide')}
        >
          <EyeOff size={13} /> Sembunyikan
        </button>
      )}
      {!row.isFlagged && (
        <button
          className={`${btn} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
          onClick={() => onAsk('flag')}
        >
          <Flag size={13} /> Tandai
        </button>
      )}
      <button
        className={`${btn} border-[var(--cream-dark)] text-[var(--text-2)] hover:border-[var(--terra)]`}
        onClick={() => onAsk(row.isPinned ? 'unpin' : 'pin')}
      >
        {row.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
        {row.isPinned ? 'Lepas sematan' : 'Sematkan'}
      </button>
      <button
        className={`${btn} border-[var(--cream-dark)] text-[var(--text-2)] hover:border-[var(--terra)]`}
        onClick={() => onAsk(row.isLocked ? 'unlock' : 'lock')}
      >
        {row.isLocked ? <LockOpen size={13} /> : <Lock size={13} />}
        {row.isLocked ? 'Buka kunci' : 'Kunci'}
      </button>
      <button
        className={`${btn} border-red-200 text-red-700 hover:bg-red-50`}
        onClick={() => onAsk('trash')}
      >
        <Trash2 size={13} /> Tempat sampah
      </button>
    </>
  )
}

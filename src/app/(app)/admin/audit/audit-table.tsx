// src/app/(app)/admin/audit/audit-table.tsx
// Tabel jejak audit dengan diff before/after yang bisa dibaca manusia.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ScrollText, ArrowRight } from 'lucide-react'
import { DataTable, type Column } from '@/components/admin/data-table'
import { DetailDrawer, DetailRow } from '@/components/admin/detail-drawer'
import { formatDateTime } from '@/lib/utils'
import { ROLE_LABEL } from '@/lib/rbac'
import type { UserRole } from '@/types/database'

export interface AuditRow {
  id: string
  actorName: string
  actorRole: UserRole | null
  action: string
  entity: string
  entityId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reason: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

/** Warna per jenis aksi — supaya pola penyalahgunaan terlihat sekilas. */
const ACTION_STYLE: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update: 'bg-blue-50 text-blue-700 border-blue-200',
  delete: 'bg-red-50 text-red-700 border-red-200',
  hide: 'bg-amber-50 text-amber-700 border-amber-200',
  unhide: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  restore: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  purge: 'bg-red-100 text-red-800 border-red-300',
  role_change: 'bg-purple-50 text-purple-700 border-purple-200',
  settings_change: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  reveal_identity: 'bg-orange-50 text-orange-800 border-orange-300',
  ban: 'bg-red-50 text-red-700 border-red-200',
}

const ACTION_LABEL: Record<string, string> = {
  create: 'Buat',
  update: 'Ubah',
  delete: 'Hapus',
  hide: 'Sembunyikan',
  unhide: 'Tampilkan',
  restore: 'Pulihkan',
  purge: 'Hapus permanen',
  role_change: 'Ubah peran',
  settings_change: 'Ubah pengaturan',
  reveal_identity: 'Buka identitas',
  ban: 'Nonaktifkan',
  unban: 'Aktifkan',
  approve: 'Setujui',
  reject: 'Tolak',
  publish: 'Terbitkan',
  unpublish: 'Tarik',
  bulk: 'Massal',
  broadcast: 'Siaran',
  export: 'Ekspor',
  login: 'Masuk',
}

const ACTIONS = ['all', 'hide', 'restore', 'purge', 'role_change', 'settings_change', 'reveal_identity', 'ban'] as const

export function AuditTable({
  rows, total, page, pageSize, sort, dir, q, scope, filter,
}: {
  rows: AuditRow[]
  total: number
  page: number
  pageSize: number
  sort: string
  dir: 'asc' | 'desc'
  q: string
  scope: string
  filter: string
}) {
  const [open, setOpen] = useState<AuditRow | null>(null)

  const columns: Column<AuditRow>[] = [
    {
      key: 'created_at',
      header: 'Waktu',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Pelaku',
      render: (r) => (
        <div className="min-w-0">
          <span className="text-sm font-semibold text-[var(--brown-dark)]">{r.actorName}</span>
          {r.actorRole && (
            <span className="block text-[10px] text-[var(--text-muted)]">
              {ROLE_LABEL[r.actorRole]}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Tindakan',
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${
            ACTION_STYLE[r.action] ?? 'bg-stone-100 text-stone-600 border-stone-300'
          }`}
        >
          {ACTION_LABEL[r.action] ?? r.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Objek',
      render: (r) => (
        <span className="text-xs font-mono text-[var(--text-2)]">
          {r.entity}
          {r.entityId ? `#${r.entityId.slice(0, 8)}` : ''}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Alasan',
      render: (r) => (
        <span className="text-xs text-[var(--text-muted)] line-clamp-2 max-w-[240px]">
          {r.reason ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <>
      <header className="mb-3">
        <h1 className="text-xl font-bold text-[var(--brown-dark)]">Jejak Audit</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Catatan permanen setiap tindakan administratif. Baris di sini tidak bisa
          diubah atau dihapus, termasuk oleh super admin.
        </p>
      </header>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {ACTIONS.map((a) => (
          <Link
            key={a}
            href={a === 'all' ? '/admin/audit' : `/admin/audit?scope=${a}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              scope === a || (!scope && a === 'all')
                ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
                : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)] hover:border-[var(--terra)]'
            }`}
          >
            {a === 'all' ? 'Semua' : (ACTION_LABEL[a] ?? a)}
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
        basePath="/admin/audit"
        extraParams={{ ...(scope ? { scope } : {}), ...(filter && filter !== 'all' ? { filter } : {}) }}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpen(r)}
        emptyText="Belum ada catatan audit pada filter ini."
      />

      <DetailDrawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? (ACTION_LABEL[open.action] ?? open.action) : ''}
        subtitle={open ? `${open.entity}${open.entityId ? ` · ${open.entityId}` : ''}` : undefined}
      >
        {open && (
          <>
            <DetailRow label="Waktu">{formatDateTime(open.createdAt)}</DetailRow>
            <DetailRow label="Pelaku">
              {open.actorName}
              {open.actorRole ? ` (${ROLE_LABEL[open.actorRole]})` : ''}
            </DetailRow>
            <DetailRow label="Alasan">{open.reason ?? '—'}</DetailRow>
            <DetailRow label="IP">
              <span className="font-mono text-xs">{open.ip ?? '—'}</span>
            </DetailRow>
            <DetailRow label="Peramban">
              <span className="text-xs break-all">{open.userAgent ?? '—'}</span>
            </DetailRow>

            <SnapshotDiff before={open.before} after={open.after} />
          </>
        )}
      </DetailDrawer>
    </>
  )
}

/**
 * Tampilkan perubahan per kolom: nilai sebelum → sesudah.
 * Hanya kolom yang benar-benar berubah yang ditampilkan — diff penuh membuat
 * perubahan penting tenggelam di antara kolom yang tidak berubah.
 */
function SnapshotDiff({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  if (!before && !after) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic">
        Tidak ada snapshot tersimpan untuk tindakan ini.
      </p>
    )
  }

  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  )
  const changed = keys.filter(
    (k) => JSON.stringify((before ?? {})[k]) !== JSON.stringify((after ?? {})[k])
  )

  const show = (v: unknown) =>
    v === undefined || v === null
      ? '—'
      : typeof v === 'object'
        ? JSON.stringify(v).slice(0, 160)
        : String(v).slice(0, 160)

  return (
    <div>
      <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
        <ScrollText size={12} /> Perubahan
      </p>
      {changed.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic">Tidak ada kolom yang berubah.</p>
      ) : (
        <div className="rounded-lg border border-[var(--cream-dark)] overflow-hidden">
          {changed.map((k, i) => (
            <div
              key={k}
              className={`px-3 py-2 text-xs ${i > 0 ? 'border-t border-[var(--cream)]' : ''}`}
            >
              <span className="font-mono font-semibold text-[var(--brown-dark)]">{k}</span>
              <div className="flex items-start gap-1.5 mt-1 flex-wrap">
                <span className="text-red-700 bg-red-50 rounded px-1.5 py-0.5 break-all">
                  {show((before ?? {})[k])}
                </span>
                <ArrowRight size={11} className="mt-1 shrink-0 text-[var(--text-muted)]" />
                <span className="text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 break-all">
                  {show((after ?? {})[k])}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

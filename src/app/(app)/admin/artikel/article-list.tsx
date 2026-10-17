// src/app/(app)/admin/artikel/article-list.tsx
// Daftar artikel staf: cari, saring status, dan pintasan sunting/riwayat.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Pencil, Star, History, ExternalLink, Eye } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export interface ArticleRow {
  id: string
  title: string
  slug: string
  status: string
  isFeatured: boolean
  publishedAt: string | null
  updatedAt: string
  readCount: number
  authorName: string
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draf', cls: 'bg-[var(--cream-dark)] text-[var(--text-2)]' },
  pending_review: { label: 'Menunggu', cls: 'bg-[var(--gold)]/15 text-[var(--brown-dark)]' },
  published: { label: 'Terbit', cls: 'bg-[var(--sage)]/15 text-[var(--sage)]' },
  rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700' },
  archived: { label: 'Arsip', cls: 'bg-[var(--cream-dark)] text-[var(--text-muted)]' },
}

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'published', label: 'Terbit' },
  { key: 'pending_review', label: 'Menunggu' },
  { key: 'draft', label: 'Draf' },
  { key: 'archived', label: 'Arsip' },
] as const

export function ArticleList({
  articles,
  canRestore,
}: {
  articles: ArticleRow[]
  canRestore: boolean
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const shown = articles.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false
    if (q.trim()) {
      const hay = `${a.title} ${a.authorName} ${a.slug}`.toLowerCase()
      if (!hay.includes(q.trim().toLowerCase())) return false
    }
    return true
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, penulis, atau slug…"
            className="form-input pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                filter === f.key
                  ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
                  : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)] hover:border-[var(--terra)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card-premium px-6 py-12 text-center text-sm text-[var(--text-muted)]">
          Tidak ada artikel yang cocok dengan pencarian ini.
        </div>
      ) : (
        <div className="card-premium overflow-hidden divide-y divide-[var(--cream)]">
          {shown.map((a) => {
            const meta = STATUS_META[a.status] ?? STATUS_META.draft
            return (
              <div key={a.id} className="px-4 py-3 flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--brown-dark)] break-words">
                      {a.title}
                    </span>
                    {a.isFeatured && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-[var(--gold)]">
                        <Star size={10} /> unggulan
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)] flex-wrap">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <span>{a.authorName}</span>
                    <span>•</span>
                    <span className="font-mono">/{a.slug}</span>
                    {a.status === 'published' && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Eye size={10} /> {a.readCount}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>diubah {formatDateTime(a.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {a.status === 'published' && (
                    <Link
                      href={`/renungan/${a.id}`}
                      target="_blank"
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--cream-dark)]"
                      aria-label="Lihat di situs"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  )}
                  {canRestore && (
                    <Link
                      href={`/admin/artikel/${a.id}/riwayat`}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--cream-dark)]"
                      aria-label="Riwayat revisi"
                    >
                      <History size={13} />
                    </Link>
                  )}
                  <Link
                    href={`/admin/artikel/${a.id}`}
                    className="p-1.5 rounded-md text-[var(--brown)] hover:bg-[var(--cream-dark)]"
                    aria-label="Sunting artikel"
                  >
                    <Pencil size={13} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
        Menampilkan {shown.length} dari {articles.length} artikel.
      </p>
    </>
  )
}

// src/components/admin/data-table.tsx
// Tabel data untuk konsol CMS: pencarian, urutan kolom, paginasi — semuanya
// lewat URL sehingga bisa di-bookmark dan tidak kehilangan state saat refresh.
//
// Komponen ini presentasional: tidak mengambil data sendiri. Server Component
// yang menyiapkan baris, kolom, dan parameter daftar.

'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  /** Kolom yang boleh dijadikan dasar urutan. Bila kosong, header tidak bisa diklik. */
  sortable?: boolean
  className?: string
  render: (row: T) => React.ReactNode
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  total: number
  page: number
  pageSize: number
  sort: string
  dir: 'asc' | 'desc'
  q: string
  /** Basis URL halaman ini, mis. '/admin/forum'. */
  basePath: string
  /** Filter tambahan yang harus dipertahankan saat navigasi. */
  extraParams?: Record<string, string>
  rowKey: (row: T) => string
  emptyText?: string
  /** Dipanggil saat baris diklik — biasanya membuka drawer detail. */
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  rows,
  columns,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  basePath,
  extraParams = {},
  rowKey,
  emptyText = 'Tidak ada data.',
  onRowClick,
}: Props<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [term, setTerm] = useState(q)

  const base = basePath || pathname

  const navigate = useCallback(
    (overrides: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(overrides)) {
        if (v === null || v === '') sp.delete(k)
        else sp.set(k, v)
      }
      // Setiap perubahan filter mengembalikan ke halaman pertama — kalau tidak,
      // pencarian baru bisa mendarat di halaman yang kosong.
      if (!('page' in overrides)) sp.delete('page')
      for (const [k, v] of Object.entries(extraParams)) sp.set(k, v)
      const qs = sp.toString()
      startTransition(() => router.push(qs ? `${base}?${qs}` : base))
    },
    [searchParams, router, base, extraParams]
  )

  function toggleSort(key: string) {
    if (sort === key) navigate({ sort: key, dir: dir === 'asc' ? 'desc' : 'asc' })
    else navigate({ sort: key, dir: 'desc' })
  }

  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-3">
      {/* Pencarian */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            navigate({ q: term })
          }}
          className="relative flex-1 min-w-[200px]"
        >
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            className="form-input pl-9 pr-9"
            placeholder="Cari…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm('')
                navigate({ q: null })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brown)]"
              aria-label="Bersihkan pencarian"
            >
              <X size={14} />
            </button>
          )}
        </form>

        {pending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Loader2 size={13} className="animate-spin" /> Memuat…
          </span>
        )}
      </div>

      {/* Tabel */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      'text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b-2 border-[var(--cream-dark)] whitespace-nowrap',
                      c.sortable && 'cursor-pointer select-none hover:text-[var(--brown)]',
                      c.className
                    )}
                    onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {c.sortable && sort === c.key && (
                        dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-[var(--text-muted)] italic"
                  >
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      'border-b border-[var(--cream)] transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-[var(--cream)]/60'
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-3 text-sm align-top', c.className)}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
          <span className="text-xs text-[var(--text-muted)]">
            {total === 0 ? 'Tidak ada baris' : `${from}–${to} dari ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="btn-icon p-1.5 rounded-lg border border-[var(--cream-dark)] disabled:opacity-40"
              disabled={page <= 1 || pending}
              onClick={() => navigate({ page: String(page - 1) })}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs px-2 text-[var(--brown)] font-semibold whitespace-nowrap">
              {page} / {lastPage}
            </span>
            <button
              className="btn-icon p-1.5 rounded-lg border border-[var(--cream-dark)] disabled:opacity-40"
              disabled={page >= lastPage || pending}
              onClick={() => navigate({ page: String(page + 1) })}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

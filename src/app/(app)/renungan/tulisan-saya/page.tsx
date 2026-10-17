// src/app/(app)/renungan/tulisan-saya/page.tsx
// "Tulisan saya" — halaman penulis (M5).
//
// Setiap anggota bisa melihat artikelnya sendiri dalam semua status: draf yang
// belum selesai, yang menunggu tinjauan, yang sudah terbit, dan yang ditolak
// beserta alasannya. Tanpa halaman ini, artikel yang ditolak menghilang tanpa
// penjelasan dan penulis tidak tahu harus memperbaiki apa.
//
// ATURAN STATUS:
//   draft          — hanya penulis & staf
//   pending_review — menunggu admin
//   published      — tampil publik
//   rejected       — tidak tampil, alasan dari admin terlihat di sini
//   archived       — disembunyikan tanpa dihapus

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-guard'
import { redirect } from 'next/navigation'
import { FileText, Plus, ExternalLink, Clock, CheckCircle2, XCircle, Archive } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_META: Record<
  string,
  { label: string; icon: typeof Clock; cls: string; help: string }
> = {
  draft: {
    label: 'Draf',
    icon: FileText,
    cls: 'bg-[var(--cream-dark)] text-[var(--text-2)]',
    help: 'Belum dikirim. Hanya kamu yang bisa melihat.',
  },
  pending_review: {
    label: 'Menunggu tinjauan',
    icon: Clock,
    cls: 'bg-[var(--gold)]/15 text-[var(--brown-dark)]',
    help: 'Sedang ditinjau admin. Kamu akan mendapat notifikasi hasilnya.',
  },
  published: {
    label: 'Terbit',
    icon: CheckCircle2,
    cls: 'bg-[var(--sage)]/15 text-[var(--sage)]',
    help: 'Tampil di dinding Renungan.',
  },
  rejected: {
    label: 'Ditolak',
    icon: XCircle,
    cls: 'bg-red-50 text-red-700',
    help: 'Belum bisa diterbitkan. Lihat catatan admin di bawah.',
  },
  archived: {
    label: 'Diarsipkan',
    icon: Archive,
    cls: 'bg-[var(--cream-dark)] text-[var(--text-muted)]',
    help: 'Disembunyikan dari publik, tidak dihapus.',
  },
}

export default async function MyArticlesPage() {
  const ctx = await requireAuth()
  const supabase = createClient()

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, status, excerpt, created_at, updated_at, published_at, read_count, review_notes')
    .eq('author_id', ctx.userId)
    .order('updated_at', { ascending: false })

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <p className="text-sm text-[var(--text-muted)]">
          Gagal memuat tulisan: {error.message}
        </p>
      </div>
    )
  }

  const articles = (data ?? []) as unknown as Record<string, unknown>[]

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">
            Tulisan saya
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Semua artikel yang kamu tulis, beserta statusnya.
          </p>
        </div>
        <Link
          href="/renungan/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Tulis baru
        </Link>
      </header>

      {articles.length === 0 ? (
        <div className="card-premium px-6 py-14 text-center">
          <FileText size={26} className="mx-auto text-[var(--text-muted)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Kamu belum menulis artikel. Mulai dari satu pengalaman yang mungkin menguatkan
            orang lain.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {articles.map((a) => {
            const meta = STATUS_META[a.status as string] ?? STATUS_META.draft
            const Icon = meta.icon
            const notes = a.review_notes as string | null
            return (
              <div key={a.id as string} className="card-premium p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-sm text-[var(--brown-dark)] break-words">
                        {a.title as string}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}
                      >
                        <Icon size={10} /> {meta.label}
                      </span>
                    </div>
                    {a.excerpt && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                        {a.excerpt as string}
                      </p>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                      diubah {formatDateTime(a.updated_at as string)}
                      {a.status === 'published' && ` · ${a.read_count ?? 0} kali dibaca`}
                    </p>
                  </div>
                  {a.status === 'published' && (
                    <Link
                      href={`/renungan/${a.id as string}`}
                      className="shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--cream-dark)]"
                      aria-label="Lihat artikel"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>

                {/* Penjelasan status — inti halaman ini */}
                <p className="text-[11px] text-[var(--text-muted)] mt-2">{meta.help}</p>

                {notes && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                    <strong>Catatan admin:</strong> {notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

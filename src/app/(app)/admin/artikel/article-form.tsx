// src/app/(app)/admin/artikel/article-form.tsx
// Editor artikel.
//
// Pratinjau markdown sengaja TIDAK memakai dangerouslySetInnerHTML. Isi artikel
// ditulis staf, tetapi akun staf bisa saja diambil alih; renderer aman berarti
// satu kelas kerentanan yang tidak ada sejak awal.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Loader2, Save, ArrowLeft, Star, CalendarClock, History } from 'lucide-react'
import { saveArticle } from './actions'

export interface ArticleFormData {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  categoryId: string | null
  coverUrl: string
  tags: string
  status: string
  isFeatured: boolean
  scheduledAt: string
}

const STATUSES = [
  { key: 'draft', label: 'Draf', help: 'Hanya terlihat oleh staf.' },
  { key: 'pending_review', label: 'Menunggu tinjauan', help: 'Masuk antrean persetujuan.' },
  { key: 'published', label: 'Terbit', help: 'Tampil di dinding Renungan.' },
  { key: 'archived', label: 'Arsip', help: 'Disembunyikan tanpa dihapus.' },
] as const

export function ArticleForm({
  initial,
  categories,
  isNew,
}: {
  initial: ArticleFormData
  categories: { id: string; name: string }[]
  isNew: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<ArticleFormData>(initial)

  function set<K extends keyof ArticleFormData>(key: K, value: ArticleFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  /** Judul -> slug otomatis, selama slug belum pernah disentuh manual. */
  function onTitle(title: string) {
    const auto = !form.id && (form.slug === slugify(form.title) || form.slug === '')
    setForm((f) => ({
      ...f,
      title,
      slug: auto ? slugify(title) : f.slug,
    }))
  }

  function submit() {
    startTransition(async () => {
      const res = await saveArticle({
        id: form.id,
        title: form.title,
        slug: form.slug || undefined,
        excerpt: form.excerpt || undefined,
        content: form.content,
        categoryId: form.categoryId || null,
        coverUrl: form.coverUrl || null,
        tags: form.tags || undefined,
        status: form.status,
        isFeatured: form.isFeatured,
        scheduledAt: form.scheduledAt || null,
      })
      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error(String((res as { error: string }).error))
        return
      }
      toast.success(isNew ? 'Artikel dibuat.' : 'Artikel disimpan.')
      router.push('/admin/artikel')
      router.refresh()
    })
  }

  const words = form.content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/artikel"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--terra)]"
        >
          <ArrowLeft size={13} /> Artikel
        </Link>
        {form.id && (
          <Link
            href={`/admin/artikel/${form.id}/riwayat`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--terra)]"
          >
            <History size={13} /> Riwayat
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Kolom utama */}
        <div className="space-y-3">
          <div className="form-group">
            <label className="form-label">Judul</label>
            <input
              className="form-input text-base font-semibold"
              value={form.title}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="Judul yang jelas dan spesifik"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Slug URL</label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">/renungan/</span>
              <input
                className="form-input font-mono text-xs"
                value={form.slug}
                onChange={(e) => set('slug', slugify(e.target.value))}
                placeholder="judul-artikel"
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Mengubah slug setelah terbit memutus tautan lama yang sudah dibagikan.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Ringkasan</label>
            <textarea
              className="form-input"
              rows={2}
              maxLength={300}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              placeholder="Satu atau dua kalimat yang tampil di kartu artikel."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Isi (Markdown)</label>
            <textarea
              className="form-input font-mono text-[13px] leading-relaxed"
              rows={22}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder={'## Subjudul\n\nTulis paragraf di sini.\n\n> Kutipan ayat atau renungan.'}
              style={{ resize: 'vertical' }}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {words} kata · {form.content.length} karakter
            </p>
          </div>
        </div>

        {/* Kolom samping */}
        <aside className="space-y-3">
          <div className="card-premium p-4 space-y-3">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                {STATUSES.find((s) => s.key === form.status)?.help}
              </p>
            </div>

            {form.status === 'published' && (
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <CalendarClock size={11} /> Jadwal terbit
                </label>
                <input
                  type="datetime-local"
                  className="form-input text-xs"
                  value={form.scheduledAt}
                  onChange={(e) => set('scheduledAt', e.target.value)}
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Kosongkan untuk terbit sekarang.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => set('isFeatured', e.target.checked)}
                className="accent-[var(--terra)]"
              />
              <Star size={12} className="text-[var(--gold)]" /> Tandai unggulan
            </label>
          </div>

          <div className="card-premium p-4 space-y-3">
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select
                className="form-input"
                value={form.categoryId ?? ''}
                onChange={(e) => set('categoryId', e.target.value || null)}
              >
                <option value="">— Tanpa kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tag</label>
              <input
                className="form-input text-xs"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="iman, keluarga, doa"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Dipisah koma, maks. 10.</p>
            </div>

            <div className="form-group">
              <label className="form-label">URL sampul</label>
              <input
                className="form-input text-xs"
                value={form.coverUrl}
                onChange={(e) => set('coverUrl', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={pending || form.title.trim().length < 5 || form.content.trim().length < 50}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2.5 text-xs font-semibold text-[var(--cream)] disabled:opacity-40"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isNew ? 'Buat artikel' : 'Simpan perubahan'}
          </button>

          {form.status === 'published' && !isNew && (
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Menyimpan akan menerbitkan perubahan segera. Versi sebelumnya tetap tersimpan
              di riwayat dan bisa dikembalikan.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

/** Slug yang aman: huruf kecil, angka, tanda hubung. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

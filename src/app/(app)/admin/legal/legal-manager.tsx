// src/app/(app)/admin/legal/legal-manager.tsx
// Editor dokumen legal.
//
// Isi dokumen ditulis sebagai Markdown sederhana dan dirender oleh
// src/lib/markdown.tsx di sisi publik — bukan HTML mentah, jadi tidak ada
// jalur XSS dari panel admin ke halaman publik.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileText, Plus, Loader2, X, Eye, EyeOff, History } from 'lucide-react'
import type { LegalDocument } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { saveLegalDoc } from '../_shared/cms-actions'

export function LegalManager({
  docs,
  missing,
}: {
  docs: LegalDocument[]
  missing: { slug: string; title: string }[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<LegalDocument | { slug: string; title: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await saveLegalDoc(formData)
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        toast.error(String(res.error))
        return
      }
      toast.success(
        res && typeof res === 'object' && 'success' in res
          ? String((res as { success: string }).success)
          : 'Dokumen disimpan.'
      )
      setEditing(null)
      router.refresh()
    })
  }

  const isNew = editing && !('content' in editing)

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="card-premium p-4">
          <p className="text-xs font-semibold text-[var(--text-2)] mb-2">
            Dokumen yang belum ada:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <button
                key={m.slug}
                onClick={() => setEditing(m)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--terra)] px-2.5 py-1 text-xs font-semibold text-[var(--terra)] hover:bg-[var(--cream)]"
              >
                <Plus size={12} /> {m.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {docs.map((d) => (
          <button
            key={d.slug}
            onClick={() => setEditing(d)}
            className="card-premium p-4 text-left hover:border-[var(--terra)] transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-[var(--cream-dark)] text-[var(--brown)] flex items-center justify-center">
                <FileText size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-[var(--brown-dark)]">{d.title}</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">/{d.slug}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-muted)] flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <History size={10} /> versi {d.version}
                  </span>
                  <span>·</span>
                  <span>{formatDate(d.updated_at)}</span>
                  <span>·</span>
                  <span className={d.is_published ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                    {d.is_published ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Eye size={10} /> terbit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5">
                        <EyeOff size={10} /> draf
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => !pending && setEditing(null)}
          />
          <form
            action={submit}
            className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
              <h2 className="font-bold text-[var(--brown-dark)]">
                {isNew ? 'Buat dokumen' : 'Ubah dokumen'}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-[var(--text-muted)] hover:text-[var(--brown)]"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Slug URL</label>
                  <input
                    name="slug"
                    className="form-input font-mono"
                    required
                    readOnly={!isNew}
                    defaultValue={editing.slug}
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Dibuka di /legal/{editing.slug}
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Judul</label>
                  <input
                    name="title"
                    className="form-input"
                    required
                    defaultValue={editing.title}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ringkasan</label>
                <input
                  name="summary"
                  className="form-input"
                  defaultValue={'summary' in editing ? (editing.summary ?? '') : ''}
                  placeholder="Satu kalimat tentang isi dokumen ini"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Tanggal berlaku</label>
                  <input
                    name="effective_date"
                    type="date"
                    className="form-input"
                    defaultValue={
                      'effective_date' in editing && editing.effective_date
                        ? editing.effective_date
                        : new Date().toISOString().slice(0, 10)
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-sm self-end pb-2">
                  <input
                    type="checkbox"
                    name="is_published"
                    defaultChecked={'is_published' in editing ? editing.is_published : true}
                    className="rounded border-[var(--cream-dark)]"
                  />
                  Terbitkan (bisa dibaca publik)
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Isi (Markdown)</label>
                <textarea
                  name="content"
                  className="form-input font-mono text-xs"
                  rows={16}
                  required
                  style={{ resize: 'vertical' }}
                  defaultValue={'content' in editing ? editing.content : ''}
                  placeholder={'## Judul bagian\n\nTeks paragraf…\n\n- butir pertama\n- butir kedua'}
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Markdown didukung: judul (##), tebal (**), daftar (-), tautan [teks](url).
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
              >
                {pending && <Loader2 size={13} className="animate-spin" />}
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

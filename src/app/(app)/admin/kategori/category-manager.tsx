// src/app/(app)/admin/kategori/category-manager.tsx
// Daftar + editor kategori.
//
// Pengurutan memakai tombol naik/turun, bukan drag-and-drop: drag sulit
// dipakai di ponsel dan tidak bisa dioperasikan dengan keyboard. Tombol
// berfungsi di semua perangkat dan hasilnya sama.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Archive, ArchiveRestore, Trash2, Loader2, X,
  ArrowUp, ArrowDown, MessageSquare, HandHeart, Newspaper,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { saveCategory, archiveCategory, deleteCategory } from './actions'

export interface CategoryRow {
  id: string
  name: string
  nameEn: string | null
  slug: string
  icon: string
  color: string
  sortOrder: number
  description: string | null
  isArchived: boolean
  usage: { threads: number; prayers: number; articles: number }
  totalUsage: number
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<CategoryRow | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CategoryRow | null>(null)
  const [pending, startTransition] = useTransition()

  const active = categories.filter((c) => !c.isArchived)
  const archived = categories.filter((c) => c.isArchived)

  function submit(formData: FormData) {
    const isNew = editing === 'new'
    const payload: Record<string, unknown> = {
      name: String(formData.get('name') ?? ''),
      nameEn: String(formData.get('nameEn') ?? '') || undefined,
      slug: String(formData.get('slug') ?? ''),
      icon: String(formData.get('icon') ?? '💬') || '💬',
      color: String(formData.get('color') ?? '#C4895A'),
      description: String(formData.get('description') ?? '') || undefined,
      sortOrder: Number(formData.get('sortOrder') ?? 0),
    }
    if (!isNew && editing) payload.id = editing.id

    startTransition(async () => {
      const res = await saveCategory(payload)
      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error(String((res as { error: string }).error))
        return
      }
      toast.success(isNew ? 'Kategori ditambahkan.' : 'Kategori diperbarui.')
      setEditing(null)
      router.refresh()
    })
  }

  function toggleArchive(c: CategoryRow) {
    startTransition(async () => {
      const res = await archiveCategory({ id: c.id, archived: !c.isArchived })
      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error(String((res as { error: string }).error))
        return
      }
      toast.success(c.isArchived ? 'Kategori diaktifkan lagi.' : 'Kategori diarsipkan.')
      router.refresh()
    })
  }

  function move(c: CategoryRow, delta: number) {
    const ordered = [...active].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = ordered.findIndex((x) => x.id === c.id)
    const swap = ordered[idx + delta]
    if (!swap) return
    startTransition(async () => {
      // Tukar posisi: dua panggilan berurutan, bukan satu loop.
      await saveCategory({ ...toPayload(c), sortOrder: swap.sortOrder })
      await saveCategory({ ...toPayload(swap), sortOrder: c.sortOrder })
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing('new')}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
      >
        <Plus size={14} /> Kategori baru
      </button>

      <div className="card-premium overflow-hidden divide-y divide-[var(--cream)]">
        {active.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
            Belum ada kategori aktif.
          </p>
        )}
        {[...active]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c, i, arr) => (
            <div key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <span
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base"
                style={{ backgroundColor: c.color + '22', color: c.color }}
              >
                {c.icon}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[var(--brown-dark)]">{c.name}</span>
                  {c.nameEn && (
                    <span className="text-[11px] text-[var(--text-muted)]">/ {c.nameEn}</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-[var(--text-muted)] flex-wrap">
                  <span className="font-mono">/{c.slug}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageSquare size={10} /> {c.usage.threads}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <HandHeart size={10} /> {c.usage.prayers}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Newspaper size={10} /> {c.usage.articles}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={i === 0 || pending}
                  onClick={() => move(c, -1)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--cream-dark)] disabled:opacity-30"
                  aria-label="Naikkan urutan"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  disabled={i === arr.length - 1 || pending}
                  onClick={() => move(c, 1)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--cream-dark)] disabled:opacity-30"
                  aria-label="Turunkan urutan"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  onClick={() => setEditing(c)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--cream-dark)]"
                  aria-label={`Ubah ${c.name}`}
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => toggleArchive(c)}
                  className="p-1.5 rounded-md text-amber-700 hover:bg-amber-50"
                  aria-label={`Arsipkan ${c.name}`}
                >
                  <Archive size={13} />
                </button>
                <button
                  onClick={() => setPendingDelete(c)}
                  className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                  aria-label={`Hapus ${c.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
      </div>

      {archived.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Diarsipkan ({archived.length})
          </h2>
          <div className="card-premium overflow-hidden divide-y divide-[var(--cream)] opacity-70">
            {archived.map((c) => (
              <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-[var(--cream-dark)] flex items-center justify-center text-sm">
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1 text-sm text-[var(--text-2)]">
                  {c.name}
                  <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                    {c.totalUsage} konten
                  </span>
                </span>
                <button
                  onClick={() => toggleArchive(c)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--cream-dark)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)]"
                >
                  <ArchiveRestore size={11} /> Aktifkan
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Editor */}
      {editing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => !pending && setEditing(null)}
          />
          <form
            action={submit}
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
              <h2 className="font-bold text-[var(--brown-dark)]">
                {editing === 'new' ? 'Kategori baru' : `Ubah ${editing.name}`}
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

            <div className="p-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Nama (Indonesia)</label>
                  <input
                    name="name"
                    className="form-input"
                    required
                    defaultValue={editing !== 'new' ? editing.name : ''}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama (Inggris)</label>
                  <input
                    name="nameEn"
                    className="form-input"
                    defaultValue={editing !== 'new' ? (editing.nameEn ?? '') : ''}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Slug URL</label>
                <input
                  name="slug"
                  className="form-input font-mono"
                  required
                  defaultValue={editing !== 'new' ? editing.slug : ''}
                  placeholder="iman-rohani"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Huruf kecil, angka, tanda hubung. Dipakai di /forum?kategori=…
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="form-group">
                  <label className="form-label">Ikon</label>
                  <input
                    name="icon"
                    className="form-input text-center"
                    defaultValue={editing !== 'new' ? editing.icon : '💬'}
                    maxLength={4}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Warna</label>
                  <input
                    name="color"
                    type="color"
                    className="form-input h-[42px] p-1"
                    defaultValue={editing !== 'new' ? editing.color : '#C4895A'}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Urutan</label>
                  <input
                    name="sortOrder"
                    type="number"
                    className="form-input"
                    defaultValue={editing !== 'new' ? editing.sortOrder : 0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <input
                  name="description"
                  className="form-input"
                  defaultValue={editing !== 'new' ? (editing.description ?? '') : ''}
                  placeholder="Ditampilkan sebagai keterangan di pemilih kategori"
                />
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

      {/* Hapus */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Hapus kategori "${pendingDelete?.name ?? ''}"?`}
        description={
          pendingDelete && pendingDelete.totalUsage > 0
            ? `Kategori ini masih dipakai ${pendingDelete.totalUsage} konten. Penghapusan akan DITOLAK database — pindahkan kontennya atau arsipkan kategorinya.`
            : 'Kategori tidak dipakai konten mana pun. Penghapusan bersifat permanen.'
        }
        level={pendingDelete && pendingDelete.totalUsage > 0 ? 'normal' : 'reason'}
        confirmLabel="Hapus"
        onConfirm={async ({ reason }) => {
          if (!pendingDelete) return { ok: false, error: 'Tidak ada kategori.' }
          const res = await deleteCategory({
            id: pendingDelete.id,
            reason: reason || 'Kategori tidak dipakai, dihapus dari konsol.',
          })
          if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
            return { ok: false, error: String((res as { error: string }).error) }
          }
          toast.success('Kategori dihapus.')
          router.refresh()
          return { ok: true }
        }}
      />
    </div>
  )
}

/** Bentuk payload yang diterima saveCategory, dari baris tabel. */
function toPayload(c: CategoryRow) {
  return {
    id: c.id,
    name: c.name,
    nameEn: c.nameEn ?? undefined,
    slug: c.slug,
    icon: c.icon,
    color: c.color,
    description: c.description ?? undefined,
    sortOrder: c.sortOrder,
  }
}

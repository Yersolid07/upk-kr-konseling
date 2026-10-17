// src/app/(app)/admin/hotline/hotline-manager.tsx
// Daftar + editor nomor hotline.
//
// Formulir memakai Server Action yang sudah ada (saveHotline/deleteHotline di
// admin/cms/actions.ts) lewat `useTransition`, supaya hasilnya bisa ditampilkan
// sebagai toast dan daftar langsung disegarkan.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Phone, MessageCircle, Link2, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import type { HotlineContact } from '@/types/database'
import { saveHotline, deleteHotline } from '../_shared/cms-actions'

const TYPE_ICON = {
  phone: Phone,
  whatsapp: MessageCircle,
  url: Link2,
} as const

const TYPE_LABEL = {
  phone: 'Telepon',
  whatsapp: 'WhatsApp',
  url: 'Tautan',
} as const

export function HotlineManager({ contacts }: { contacts: HotlineContact[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<HotlineContact | 'new' | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    startTransition(async () => {
      const res = await saveHotline(formData)
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        toast.error(String(res.error))
        return
      }
      toast.success(editing === 'new' ? 'Nomor ditambahkan.' : 'Nomor diperbarui.')
      setEditing(null)
      router.refresh()
    })
  }

  function remove(c: HotlineContact) {
    if (!window.confirm(`Hapus nomor "${c.name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    const fd = new FormData()
    fd.set('id', c.id)
    startTransition(async () => {
      const res = await deleteHotline(fd)
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        toast.error(String(res.error))
        return
      }
      toast.success('Nomor dihapus.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing('new')}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
      >
        <Plus size={14} /> Tambah nomor
      </button>

      {contacts.length === 0 ? (
        <div className="card-premium px-6 py-12 text-center text-sm text-[var(--text-muted)]">
          Belum ada nomor hotline. Tambahkan setidaknya satu.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => {
            const Icon = TYPE_ICON[c.type] ?? Phone
            return (
              <div
                key={c.id}
                className={`card-premium p-4 ${!c.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-[var(--cream-dark)] text-[var(--brown)] flex items-center justify-center">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-[var(--brown-dark)]">{c.name}</h3>
                      {!c.is_active && (
                        <span className="text-[10px] font-bold uppercase text-red-600">
                          nonaktif
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-sm text-[var(--text)] mt-0.5">
                      {c.display ?? c.number}
                    </p>
                    {c.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">{c.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-muted)]">
                      <span className="rounded bg-[var(--cream)] px-1.5 py-0.5">
                        {TYPE_LABEL[c.type] ?? c.type}
                      </span>
                      <span>urutan {c.sort_order}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(c)}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--cream-dark)]"
                      aria-label={`Ubah ${c.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                      aria-label={`Hapus ${c.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
                {editing === 'new' ? 'Tambah nomor hotline' : 'Ubah nomor hotline'}
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
              {editing !== 'new' && <input type="hidden" name="id" value={editing.id} />}

              <div className="form-group">
                <label className="form-label">Nama layanan</label>
                <input
                  name="name"
                  className="form-input"
                  required
                  defaultValue={editing !== 'new' ? editing.name : ''}
                  placeholder="mis. Healing119.id (Kemenkes)"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Nomor</label>
                  <input
                    name="number"
                    className="form-input font-mono"
                    required
                    defaultValue={editing !== 'new' ? editing.number : ''}
                    placeholder="119"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tampilan</label>
                  <input
                    name="display"
                    className="form-input font-mono"
                    defaultValue={editing !== 'new' ? (editing.display ?? '') : ''}
                    placeholder="119 ext. 8"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="form-group">
                  <label className="form-label">Jenis</label>
                  <select
                    name="type"
                    className="form-input"
                    defaultValue={editing !== 'new' ? editing.type : 'phone'}
                  >
                    <option value="phone">Telepon</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="url">Tautan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Urutan tampil</label>
                  <input
                    name="sort_order"
                    type="number"
                    className="form-input"
                    defaultValue={editing !== 'new' ? editing.sort_order : 0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Keterangan singkat</label>
                <input
                  name="description"
                  className="form-input"
                  defaultValue={editing !== 'new' ? (editing.description ?? '') : ''}
                  placeholder="Layanan konseling 24 jam"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan internal</label>
                <input
                  name="note"
                  className="form-input"
                  defaultValue={editing !== 'new' ? (editing.note ?? '') : ''}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing !== 'new' ? editing.is_active : true}
                  className="rounded border-[var(--cream-dark)]"
                />
                Tampilkan di halaman darurat
              </label>
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

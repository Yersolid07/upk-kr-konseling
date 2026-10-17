// src/app/(app)/admin/kata-terlarang/banned-word-manager.tsx
// Kelola daftar kata: tambah, aktif/nonaktif, hapus.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Loader2, Trash2, Power, ShieldAlert, Ban, HeartPulse } from 'lucide-react'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { addBannedWord, toggleBannedWord, removeBannedWord } from './actions'

export interface BannedRow {
  id: string
  word: string
  category: string
  isActive: boolean
}

const CATEGORIES = [
  {
    key: 'spam',
    label: 'Spam',
    icon: Ban,
    help: 'Iklan, tautan mencurigakan, promosi.',
    cls: 'bg-[var(--cream-dark)] text-[var(--text-2)]',
  },
  {
    key: 'kasar',
    label: 'Kasar',
    icon: ShieldAlert,
    help: 'Makian, hinaan, ujaran kebencian.',
    cls: 'bg-amber-50 text-amber-800',
  },
  {
    key: 'krisis',
    label: 'Krisis',
    icon: HeartPulse,
    help: 'TIDAK diblokir — menaikkan prioritas antrean laporan.',
    cls: 'bg-red-50 text-red-700',
  },
] as const

export function BannedWordManager({ words }: { words: BannedRow[] }) {
  const router = useRouter()
  const [word, setWord] = useState('')
  const [category, setCategory] = useState<string>('spam')
  const [pendingDelete, setPendingDelete] = useState<BannedRow | null>(null)
  const [busy, startTransition] = useTransition()

  const grouped = new Map<string, BannedRow[]>()
  for (const w of words) {
    const list = grouped.get(w.category) ?? []
    list.push(w)
    grouped.set(w.category, list)
  }

  function add() {
    if (word.trim().length < 2) {
      toast.error('Kata minimal 2 karakter.')
      return
    }
    startTransition(async () => {
      const res = await addBannedWord({ word: word.trim(), category })
      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error(String((res as { error: string }).error))
        return
      }
      toast.success('Kata ditambahkan.')
      setWord('')
      router.refresh()
    })
  }

  function toggle(w: BannedRow) {
    startTransition(async () => {
      const res = await toggleBannedWord({ id: w.id, active: !w.isActive })
      if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error(String((res as { error: string }).error))
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Tambah */}
      <div className="card-premium p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Kata atau frasa…"
            className="form-input flex-1"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-input sm:w-40"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50 shrink-0"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Tambah
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          {CATEGORIES.find((c) => c.key === category)?.help}
        </p>
      </div>

      {/* Daftar per kategori */}
      {words.length === 0 ? (
        <div className="card-premium px-6 py-12 text-center text-sm text-[var(--text-muted)]">
          Daftar masih kosong. Konten tidak disaring sampai kamu menambahkan kata.
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const list = grouped.get(cat.key) ?? []
          if (list.length === 0) return null
          const Icon = cat.icon
          return (
            <section key={cat.key}>
              <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                <Icon size={12} /> {cat.label} ({list.length})
              </h2>
              <div className="card-premium overflow-hidden divide-y divide-[var(--cream)]">
                {list.map((w) => (
                  <div key={w.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${cat.cls}`}
                    >
                      {cat.label}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-sm break-words ${
                        w.isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)] line-through'
                      }`}
                    >
                      {w.word}
                    </span>
                    <button
                      onClick={() => toggle(w)}
                      disabled={busy}
                      className={`p-1.5 rounded-md disabled:opacity-40 ${
                        w.isActive
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-[var(--text-muted)] hover:bg-[var(--cream-dark)]'
                      }`}
                      aria-label={w.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      title={w.isActive ? 'Aktif — klik untuk menonaktifkan' : 'Nonaktif'}
                    >
                      <Power size={13} />
                    </button>
                    <button
                      onClick={() => setPendingDelete(w)}
                      className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                      aria-label="Hapus kata"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )
        })
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={`Hapus "${pendingDelete?.word ?? ''}" dari daftar?`}
        description="Konten yang memuat kata ini tidak akan disaring lagi. Konten yang sudah ditolak sebelumnya tidak berubah."
        level="reason"
        confirmLabel="Hapus"
        onConfirm={async ({ reason }) => {
          if (!pendingDelete) return { ok: false, error: 'Tidak ada kata dipilih.' }
          const res = await removeBannedWord({
            id: pendingDelete.id,
            reason: reason || 'Dihapus dari daftar kata terlarang.',
          })
          if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
            return { ok: false, error: String((res as { error: string }).error) }
          }
          toast.success('Kata dihapus.')
          router.refresh()
          return { ok: true }
        }}
      />
    </div>
  )
}

// src/app/(app)/admin/media/media-console.tsx
// Konsol media (M12).

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  HardDrive, AlertTriangle, Trash2, Loader2, CheckCircle2, Users, FileWarning,
} from 'lucide-react'
import { purgeOrphan } from './actions'
import type { OrphanRow } from './page'

type UsageRow = {
  userId: string
  name: string
  fileCount: number
  totalBytes: number
  overQuota: boolean
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function MediaConsole({
  rows,
  totalBytes,
  totalFiles,
  quotaBytes,
  orphans,
}: {
  rows: UsageRow[]
  totalBytes: number
  totalFiles: number
  quotaBytes: number
  orphans: OrphanRow[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  const [purging, setPurging] = useState<string | null>(null)
  const [tab, setTab] = useState<'usage' | 'orphans'>('usage')

  const overQuota = rows.filter((r) => r.overQuota)

  async function purge(id: string) {
    setPurging(id)
    const res = await purgeOrphan(id)
    setPurging(null)
    if (res.error) return toast.error(res.error)
    toast.success(res.message ?? 'Berkas dihapus.')
    refresh()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">Media</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Pemakaian penyimpanan per pengguna dan berkas yang tidak lagi terpakai.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total terpakai" value={fmtBytes(totalBytes)} />
        <Stat label="Jumlah berkas" value={String(totalFiles)} />
        <Stat label="Pengguna unggah" value={String(rows.length)} />
        <Stat
          label="Melebihi kuota"
          value={String(overQuota.length)}
          tone={overQuota.length > 0 ? 'warn' : undefined}
        />
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => setTab('usage')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            tab === 'usage'
              ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
              : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
          }`}
        >
          <Users size={12} /> Pemakaian
        </button>
        <button
          onClick={() => setTab('orphans')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            tab === 'orphans'
              ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
              : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
          }`}
        >
          <FileWarning size={12} /> Yatim ({orphans.length})
        </button>
      </div>

      {tab === 'usage' && (
        <>
          {overQuota.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle size={13} /> {overQuota.length} pengguna melebihi kuota {fmtBytes(quotaBytes)}
              </p>
              <p className="mt-1 text-[11px] text-amber-900">
                Kuota berlaku pada unggahan berikutnya. Berkas lama tidak dihapus otomatis.
              </p>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="card-premium px-6 py-12 text-center">
              <HardDrive size={24} className="mx-auto text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">Belum ada berkas yang diunggah.</p>
            </div>
          ) : (
            <div className="card-premium overflow-hidden">
              <div className="divide-y divide-[var(--cream)]">
                {rows.map((r) => {
                  const pct = Math.min(100, Math.round((r.totalBytes / quotaBytes) * 100))
                  return (
                    <div key={r.userId} className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--brown-dark)]">{r.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {r.fileCount} berkas · {fmtBytes(r.totalBytes)}
                          {r.overQuota && (
                            <span className="ml-1.5 font-bold text-amber-700">melebihi kuota</span>
                          )}
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--cream-dark)]">
                        <div
                          className={`h-full rounded-full ${r.overQuota ? 'bg-amber-500' : 'bg-[var(--sage)]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'orphans' && (
        <>
          {orphans.length === 0 ? (
            <div className="card-premium px-6 py-12 text-center">
              <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Tidak ada berkas yatim. Semua berkas punya baris yang menunjuk kepadanya.
              </p>
            </div>
          ) : (
            <div className="card-premium divide-y divide-[var(--cream)]">
              {orphans.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--brown-dark)] truncate">
                      {o.title || '(tanpa nama)'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {o.mime_type || 'jenis tidak dikenal'} · {fmtBytes(o.size_bytes ?? 0)}
                    </p>
                  </div>
                  <button
                    onClick={() => purge(o.id)}
                    disabled={purging === o.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                  >
                    {purging === o.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        tone === 'warn'
          ? 'border-amber-200 bg-amber-50'
          : 'border-[var(--cream-dark)] bg-[var(--surface)]'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="text-base font-bold text-[var(--brown-dark)] leading-tight">{value}</p>
    </div>
  )
}

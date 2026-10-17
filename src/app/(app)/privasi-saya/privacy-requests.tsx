// src/app/(app)/privasi-saya/privacy-requests.tsx
'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Download, Trash2, Loader2, Clock, CheckCircle2, XCircle, Info } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { requestMyData } from './actions'

type Req = {
  id: string
  kind: string
  status: string
  note: string | null
  handled_at: string | null
  created_at: string
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  rejected: 'Ditolak',
}

export function PrivacyRequests({
  initial,
  tableMissing,
  errorMessage,
}: {
  initial: Req[]
  tableMissing: boolean
  errorMessage: string | null
}) {
  const [rows, setRows] = useState<Req[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const active = rows.filter((r) => r.status === 'pending' || r.status === 'processing')

  async function ask(kind: 'export' | 'delete') {
    setBusy(kind)
    const res = await requestMyData({ kind, note: note.trim() || undefined })
    setBusy(null)
    if ('error' in res) return toast.error(res.error)
    toast.success(res.message)
    // Tambahkan baris sementara supaya pengguna langsung melihat jejaknya.
    setRows([
      {
        id: 'pending-' + Date.now(),
        kind,
        status: 'pending',
        note: note.trim() || null,
        handled_at: null,
        created_at: new Date().toISOString(),
      },
      ...rows,
    ])
    setNote('')
  }

  if (tableMissing) {
    return (
      <div className="card-premium p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--brown-dark)]">
          <Info size={14} /> Fitur belum aktif
        </p>
        <p className="mt-1.5 text-xs text-[var(--text-muted)] leading-relaxed">
          Permintaan data belum bisa dikirim. Hubungi pengurus lewat halaman kontak; hak Anda tetap
          berlaku.
        </p>
        {errorMessage && (
          <p className="mt-2 text-[10px] font-mono text-[var(--text-muted)] break-all">{errorMessage}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card-premium p-5 space-y-3">
        <p className="text-sm font-semibold text-[var(--brown-dark)]">Ajukan permintaan</p>

        {active.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            Anda masih punya {active.length} permintaan yang sedang diproses.
          </p>
        )}

        <div className="form-group">
          <label className="form-label">Catatan (opsional)</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            className="form-input"
            style={{ resize: 'vertical' }}
            placeholder="Contoh: butuh salinan untuk keperluan pindah kerja."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => ask('export')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3.5 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
          >
            {busy === 'export' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Minta salinan data
          </button>
          <button
            onClick={() => ask('delete')}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            {busy === 'delete' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Minta hapus akun
          </button>
        </div>

        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          Penghapusan akun bersifat permanen dan tidak bisa dibatalkan. Riwayat yang wajib disimpan
          untuk keperluan audit akan dianonimkan, bukan dihapus.
        </p>
      </div>

      {rows.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Riwayat permintaan
          </p>
          <div className="card-premium divide-y divide-[var(--cream)]">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brown-dark)]">
                    {r.kind === 'export' ? <Download size={11} /> : <Trash2 size={11} />}
                    {r.kind === 'export' ? 'Salinan data' : 'Hapus akun'}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[r.status] ?? ''}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Clock size={9} /> {formatDateTime(r.created_at)}
                  </span>
                </div>
                {r.note && (
                  <p className="mt-1.5 text-[11px] text-[var(--text)] leading-relaxed">{r.note}</p>
                )}
                {r.status === 'completed' && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-700">
                    <CheckCircle2 size={9} /> selesai {r.handled_at ? formatDateTime(r.handled_at) : ''}
                  </p>
                )}
                {r.status === 'rejected' && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-700">
                    <XCircle size={9} /> ditolak {r.handled_at ? formatDateTime(r.handled_at) : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

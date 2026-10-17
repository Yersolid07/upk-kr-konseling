// src/app/(app)/admin/konseling/konseling-console.tsx
// Daftar sesi konseling + alih konselor + break-glass.
//
// BREAK-GLASS DIRANCANG SULIT, BUKAN MUDAH
// Tombol "Buka isi" sengaja tidak berada di baris tabel. Ia baru muncul setelah
// admin membuka detail sesi, dan menuntut alasan minimal 10 karakter. Bukan
// untuk menghalangi — tapi supaya pembukaan isi percakapan orang adalah
// keputusan sadar, bukan klik tak sengaja di antara puluhan baris.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ShieldAlert, UserCog, X, Loader2, Lock, MessageSquare,
  ChevronDown, ChevronUp, AlertTriangle, Search,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { reassignSession, breakGlassRead } from './actions'

type SessionRow = {
  id: string; member_id: string; konselor_id: string | null
  status: string; topic: string | null; is_anonymous: boolean
  started_at: string | null; ended_at: string | null
  created_at: string; updated_at: string
}
type KonselorRow = { id: string; full_name: string; role: string; specialization: string[] | null }

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-[var(--cream-dark)] text-[var(--text-2)]',
  cancelled: 'bg-red-100 text-red-800',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  active: 'Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export function KonselingConsole({
  sessions,
  konselor,
  canReassign,
  canBreakGlass,
}: {
  sessions: SessionRow[]
  konselor: KonselorRow[]
  canReassign: boolean
  canBreakGlass: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [reassigning, setReassigning] = useState<SessionRow | null>(null)
  const [breaking, setBreaking] = useState<SessionRow | null>(null)

  const byId = new Map(konselor.map((k) => [k.id, k]))

  const filtered = sessions.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      s.id.toLowerCase().includes(q) ||
      (s.topic ?? '').toLowerCase().includes(q) ||
      (byId.get(s.konselor_id ?? '')?.full_name ?? '').toLowerCase().includes(q)
    )
  })

  const counts = {
    pending: sessions.filter((s) => s.status === 'pending').length,
    active: sessions.filter((s) => s.status === 'active').length,
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">
          Sesi Konseling
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Metadata sesi terlihat untuk admin. Isi percakapan hanya bisa dibuka super admin, dengan alasan
          tercatat.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="Menunggu konselor" value={counts.pending} tone="amber" />
        <Stat label="Sedang berlangsung" value={counts.active} tone="emerald" />
        <Stat label="Total tampil" value={filtered.length} tone="neutral" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari topik, konselor, atau ID sesi…"
            className="form-input pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'pending', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                filter === f
                  ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
                  : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
              }`}
            >
              {f === 'all' ? 'Semua' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-premium px-6 py-12 text-center">
          <MessageSquare size={24} className="mx-auto text-[var(--text-muted)]" />
          <p className="mt-2 text-sm text-[var(--text-muted)]">Tidak ada sesi yang cocok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const expanded = open === s.id
            const k = byId.get(s.konselor_id ?? '')
            return (
              <div key={s.id} className="card-premium overflow-hidden">
                <button
                  onClick={() => setOpen(expanded ? null : s.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--brown-dark)]">
                        {s.topic || 'Tanpa topik'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[s.status] ?? ''}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                      {s.is_anonymous && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-2)]">
                          <Lock size={9} /> anonim
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      {k ? k.full_name : s.konselor_id ? 'Konselor tidak aktif' : 'Belum ada konselor'}
                      {' · '}dibuat {formatDateTime(s.created_at)}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronUp size={14} className="mt-1 shrink-0 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown size={14} className="mt-1 shrink-0 text-[var(--text-muted)]" />
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-[var(--cream)] px-4 py-3 space-y-3">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div>
                        <dt className="text-[var(--text-muted)]">ID sesi</dt>
                        <dd className="font-mono text-[10px] text-[var(--text)] break-all">{s.id}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">ID anggota</dt>
                        <dd className="font-mono text-[10px] text-[var(--text)] break-all">{s.member_id}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Mulai</dt>
                        <dd className="text-[var(--text)]">
                          {s.started_at ? formatDateTime(s.started_at) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Selesai</dt>
                        <dd className="text-[var(--text)]">
                          {s.ended_at ? formatDateTime(s.ended_at) : '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      {canReassign && (
                        <button
                          onClick={() => setReassigning(s)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
                        >
                          <UserCog size={12} /> Alihkan konselor
                        </button>
                      )}
                      {canBreakGlass && (
                        <button
                          onClick={() => setBreaking(s)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                        >
                          <ShieldAlert size={12} /> Buka isi percakapan
                        </button>
                      )}
                      {!canReassign && !canBreakGlass && (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Isi percakapan tidak dapat dibuka dari peran ini.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {reassigning && (
        <ReassignDialog
          row={reassigning}
          konselor={konselor}
          onClose={() => setReassigning(null)}
          onDone={() => {
            setReassigning(null)
            refresh()
          }}
        />
      )}

      {breaking && (
        <BreakGlassDialog
          row={breaking}
          onClose={() => setBreaking(null)}
        />
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'emerald' | 'neutral' }) {
  const cls =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-[var(--cream-dark)] bg-[var(--surface)]'
  return (
    <div className={`rounded-xl border px-3 py-2 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--brown-dark)] leading-tight">{value}</p>
    </div>
  )
}

function ReassignDialog({
  row,
  konselor,
  onClose,
  onDone,
}: {
  row: SessionRow
  konselor: KonselorRow[]
  onClose: () => void
  onDone: () => void
}) {
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const options = konselor.filter((k) => k.id !== row.konselor_id)

  async function submit() {
    if (!target) return toast.error('Pilih konselor tujuan.')
    if (reason.trim().length < 5) return toast.error('Alasan minimal 5 karakter.')
    setBusy(true)
    const res = await reassignSession({ sessionId: row.id, newKonselor: target, reason: reason.trim() })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success('Sesi dialihkan. Konselor baru sudah diberi tahu.')
    onDone()
  }

  return (
    <Sheet title="Alihkan sesi" onClose={onClose} busy={busy}>
      <div className="space-y-3">
        <div className="rounded-lg border border-[var(--cream-dark)] bg-[var(--cream)]/50 px-3 py-2">
          <p className="text-xs font-semibold text-[var(--brown-dark)]">{row.topic || 'Tanpa topik'}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Konselor saat ini: {konselor.find((k) => k.id === row.konselor_id)?.full_name ?? 'belum ada'}
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Konselor tujuan</label>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="form-input">
            <option value="">— Pilih konselor —</option>
            {options.map((k) => (
              <option key={k.id} value={k.id}>
                {k.full_name}
                {k.specialization?.length ? ` · ${k.specialization.join(', ')}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Alasan pengalihan (min. 5 karakter)</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            className="form-input"
            style={{ resize: 'vertical' }}
            placeholder="Contoh: konselor sebelumnya sedang cuti."
          />
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Konselor baru menerima notifikasi. Konselor lama tidak lagi melihat sesi ini.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Alihkan
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function BreakGlassDialog({ row, onClose }: { row: SessionRow; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<
    { id: string; sender_id: string; content: string; created_at: string }[] | null
  >(null)

  async function submit() {
    if (reason.trim().length < 10) return toast.error('Alasan minimal 10 karakter.')
    setBusy(true)
    const res = await breakGlassRead({ sessionId: row.id, reason: reason.trim() })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    setMessages(res.messages)
    toast.success('Sesi dibuka. Tindakan ini tercatat dan super admin lain diberi tahu.')
  }

  return (
    <Sheet title="Buka isi percakapan" onClose={onClose} busy={busy}>
      {messages === null ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-red-900">
              <AlertTriangle size={13} /> Tindakan ini tercatat
            </p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-red-900 leading-relaxed list-disc pl-4">
              <li>Waktu, alasan, dan identitas Anda disimpan di <code>break_glass_reads</code>.</li>
              <li>Super admin lain menerima notifikasi saat ini terjadi.</li>
              <li>Gunakan hanya bila ada alasan keselamatan yang jelas.</li>
            </ul>
          </div>

          <div className="form-group">
            <label className="form-label">Alasan (min. 10 karakter)</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="form-input"
              style={{ resize: 'vertical' }}
              placeholder="Contoh: anggota mengirim pesan yang mengindikasikan bahaya diri."
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              Buka sesi
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-[var(--text-muted)]">
            {messages.length} pesan. Jendela baca 30 menit; tutup halaman ini setelah selesai.
          </p>
          <div className="max-h-[50vh] overflow-y-auto space-y-2 rounded-lg border border-[var(--cream-dark)] bg-[var(--cream)]/30 p-3">
            {messages.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Belum ada pesan.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-white px-3 py-2 border border-[var(--cream)]">
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">
                    {m.sender_id === row.member_id ? 'anggota' : 'konselor'} · {formatDateTime(m.created_at)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text)] whitespace-pre-wrap">{m.content}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function Sheet({
  title,
  onClose,
  busy,
  children,
}: {
  title: string
  onClose: () => void
  busy: boolean
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
            <h2 className="font-bold text-[var(--brown-dark)] text-sm">{title}</h2>
            <button onClick={onClose} aria-label="Tutup">
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

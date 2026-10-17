// src/app/(app)/admin/siaran/broadcast-console.tsx
// Konsol siaran (M9).
//
// TIGA HAL YANG DIBUAT JELAS SEBELUM MENGIRIM
//   1. Berapa orang yang akan menerima — dihitung lebih dulu, bukan setelahnya.
//   2. Apakah ini bisa dibatalkan — siaran yang sudah terkirim TIDAK bisa.
//   3. Apakah ada siaran lain yang baru dikirim — pembatasan laju satu menit.
//
// Tanpa ketiganya, tombol "Kirim" terlalu mudah ditekan dan terlalu mahal
// akibatnya: notifikasi tidak bisa ditarik kembali dari ponsel orang.

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Send, Plus, Pencil, Trash2, X, Loader2, Users, Clock, CheckCircle2,
  AlertTriangle, FileText, Megaphone, Copy,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import {
  saveBroadcast, sendBroadcast, deleteBroadcast, saveTemplate, deleteTemplate,
  countRecipients,
} from './actions'

type BroadcastRow = {
  id: string; title: string; body: string; link: string | null
  audience: string; audience_value: string | null; status: string
  scheduled_at: string | null; sent_at: string | null
  recipient_count: number; read_count: number; created_at: string
}
type TemplateRow = { id: string; name: string; title: string; body: string; link: string | null }
type GroupRow = { id: string; name: string }

const AUDIENCE_LABEL: Record<string, string> = {
  all: 'Semua anggota',
  role: 'Per peran',
  angkatan: 'Per angkatan',
  cell_group: 'Per KK/KTB',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--cream-dark)] text-[var(--text-2)]',
  scheduled: 'bg-blue-100 text-blue-800',
  sending: 'bg-amber-100 text-amber-800',
  sent: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draf',
  scheduled: 'Terjadwal',
  sending: 'Mengirim',
  sent: 'Terkirim',
  failed: 'Gagal',
}

export function BroadcastConsole({
  broadcasts,
  templates,
  groups,
  angkatan,
}: {
  broadcasts: BroadcastRow[]
  templates: TemplateRow[]
  groups: GroupRow[]
  angkatan: string[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  const [tab, setTab] = useState<'list' | 'templates'>('list')
  const [editing, setEditing] = useState<BroadcastRow | 'new' | null>(null)
  const [sending, setSending] = useState<BroadcastRow | null>(null)
  const [deleting, setDeleting] = useState<BroadcastRow | null>(null)
  const [tplEditing, setTplEditing] = useState<TemplateRow | 'new' | null>(null)

  const drafts = broadcasts.filter((b) => b.status === 'draft' || b.status === 'scheduled')
  const sent = broadcasts.filter((b) => b.status === 'sent')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">
            Siaran
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Pengumuman ke notifikasi anggota. Sekali kirim, tidak bisa ditarik kembali.
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Siaran baru
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTab('list')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            tab === 'list'
              ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
              : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
          }`}
        >
          <Megaphone size={12} /> Siaran
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            tab === 'templates'
              ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
              : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
          }`}
        >
          <FileText size={12} /> Templat ({templates.length})
        </button>
      </div>

      {tab === 'list' && (
        <>
          {drafts.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Belum terkirim
              </p>
              <div className="space-y-2">
                {drafts.map((b) => (
                  <BroadcastCard
                    key={b.id}
                    row={b}
                    onEdit={() => setEditing(b)}
                    onSend={() => setSending(b)}
                    onDelete={() => setDeleting(b)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Riwayat pengiriman
            </p>
            {sent.length === 0 ? (
              <div className="card-premium px-6 py-12 text-center">
                <Megaphone size={24} className="mx-auto text-[var(--text-muted)]" />
                <p className="mt-2 text-sm text-[var(--text-muted)]">Belum ada siaran terkirim.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sent.map((b) => (
                  <BroadcastCard key={b.id} row={b} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'templates' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setTplEditing('new')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)]"
            >
              <Plus size={14} /> Templat baru
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="card-premium px-6 py-12 text-center">
              <FileText size={24} className="mx-auto text-[var(--text-muted)]" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Belum ada templat. Templat menghemat waktu untuk pengumuman rutin.
              </p>
            </div>
          ) : (
            <div className="card-premium divide-y divide-[var(--cream)]">
              {templates.map((t) => (
                <div key={t.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[var(--brown-dark)]">{t.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                      <strong>{t.title}</strong> — {t.body}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setEditing('new')
                        setTplEditing(t)
                      }}
                      className="rounded-lg border border-[var(--cream-dark)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-2)]"
                    >
                      Pakai
                    </button>
                    <button
                      onClick={() => setTplEditing(t)}
                      className="rounded-lg border border-[var(--cream-dark)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-2)]"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <BroadcastDialog
          row={editing === 'new' ? null : editing}
          template={tplEditing && tplEditing !== 'new' ? tplEditing : null}
          groups={groups}
          angkatan={angkatan}
          onClose={() => {
            setEditing(null)
            setTplEditing(null)
          }}
          onSaved={() => {
            setEditing(null)
            setTplEditing(null)
            refresh()
          }}
        />
      )}

      {tplEditing && tplEditing !== 'new' && !editing && (
        <TemplateDialog
          row={tplEditing}
          onClose={() => setTplEditing(null)}
          onSaved={() => {
            setTplEditing(null)
            refresh()
          }}
          onDelete={async (reason) => {
            const res = await deleteTemplate({ id: tplEditing.id, reason })
            if ('error' in res) return toast.error(res.error)
            toast.success('Templat dihapus.')
            setTplEditing(null)
            refresh()
          }}
        />
      )}

      {tplEditing === 'new' && (
        <TemplateDialog
          row={null}
          onClose={() => setTplEditing(null)}
          onSaved={() => {
            setTplEditing(null)
            refresh()
          }}
          onDelete={null}
        />
      )}

      {sending && (
        <SendDialog
          row={sending}
          onClose={() => setSending(null)}
          onSent={() => {
            setSending(null)
            refresh()
          }}
        />
      )}

      {deleting && (
        <ReasonDialog
          title="Hapus siaran"
          hint="Siaran yang belum terkirim akan hilang. Tidak ada yang menerima notifikasi."
          onClose={() => setDeleting(null)}
          onConfirm={async (reason) => {
            const res = await deleteBroadcast({ id: deleting.id, reason })
            if ('error' in res) return toast.error(res.error)
            toast.success('Siaran dihapus.')
            setDeleting(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function BroadcastCard({
  row,
  onEdit,
  onSend,
  onDelete,
}: {
  row: BroadcastRow
  onEdit?: () => void
  onSend?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="card-premium p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[var(--brown-dark)]">{row.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[row.status] ?? ''}`}>
              {STATUS_LABEL[row.status] ?? row.status}
            </span>
          </div>
          <p className="text-xs text-[var(--text)] mt-1 line-clamp-2">{row.body}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Users size={10} /> {AUDIENCE_LABEL[row.audience] ?? row.audience}
              {row.audience_value ? `: ${row.audience_value}` : ''}
            </span>
            {row.status === 'sent' ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 size={10} /> {row.recipient_count} terkirim
                </span>
                {row.sent_at && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} /> {formatDateTime(row.sent_at)}
                  </span>
                )}
              </>
            ) : row.scheduled_at ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={10} /> dijadwalkan {formatDateTime(row.scheduled_at)}
              </span>
            ) : null}
          </div>
        </div>

        {onSend && (
          <div className="flex gap-1.5">
            <button
              onClick={onEdit}
              className="rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)]"
            >
              Ubah
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700"
              aria-label="Hapus siaran"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={onSend}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--cream)]"
            >
              <Send size={12} /> Kirim
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function BroadcastDialog({
  row,
  template,
  groups,
  angkatan,
  onClose,
  onSaved,
}: {
  row: BroadcastRow | null
  template: TemplateRow | null
  groups: GroupRow[]
  angkatan: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [audience, setAudience] = useState(row?.audience ?? 'all')
  const [audienceValue, setAudienceValue] = useState(row?.audience_value ?? '')
  const [preview, setPreview] = useState<number | null>(null)

  // Hitung penerima setiap kali sasaran berubah. Ditunda sebentar supaya
  // mengetik tidak memicu kueri pada setiap ketukan.
  useEffect(() => {
    if (audience !== 'all' && !audienceValue) {
      setPreview(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const res = await countRecipients(audience, audienceValue || null)
      if (!cancelled) setPreview(res.ok ? res.count : null)
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [audience, audienceValue])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await saveBroadcast({
      id: row?.id,
      title: String(fd.get('title') ?? ''),
      body: String(fd.get('body') ?? ''),
      link: String(fd.get('link') ?? ''),
      audience,
      audienceValue,
      scheduledAt: String(fd.get('scheduledAt') ?? ''),
    })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(row ? 'Siaran disimpan.' : 'Siaran dibuat. Kirim bila sudah siap.')
    onSaved()
  }

  return (
    <Sheet title={row ? `Ubah siaran` : 'Siaran baru'} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        <div className="form-group">
          <label className="form-label">Judul notifikasi</label>
          <input
            name="title"
            required
            defaultValue={row?.title ?? template?.title ?? ''}
            className="form-input"
            maxLength={150}
            placeholder="Ibadah gabungan Minggu ini"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Isi</label>
          <textarea
            name="body"
            required
            rows={4}
            defaultValue={row?.body ?? template?.body ?? ''}
            className="form-input"
            maxLength={2000}
            style={{ resize: 'vertical' }}
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Tampil di halaman notifikasi anggota. Ringkas lebih baik — ini bukan email.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Tautan (opsional)</label>
          <input
            name="link"
            defaultValue={row?.link ?? template?.link ?? ''}
            className="form-input font-mono text-xs"
            placeholder="/forum atau https://..."
            maxLength={300}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">Sasaran</label>
            <select
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value)
                setAudienceValue('')
              }}
              className="form-input"
            >
              <option value="all">Semua anggota</option>
              <option value="role">Per peran</option>
              <option value="angkatan">Per angkatan</option>
              <option value="cell_group">Per KK/KTB</option>
            </select>
          </div>

          {audience !== 'all' && (
            <div className="form-group">
              <label className="form-label">
                {audience === 'role' ? 'Peran' : audience === 'angkatan' ? 'Angkatan' : 'Grup'}
              </label>
              <select
                value={audienceValue}
                onChange={(e) => setAudienceValue(e.target.value)}
                className="form-input"
                required
              >
                <option value="">— Pilih —</option>
                {audience === 'role' &&
                  ['member', 'konselor', 'moderator', 'admin'].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                {audience === 'angkatan' &&
                  angkatan.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                {audience === 'cell_group' &&
                  groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {preview !== null && (
          <div className="rounded-lg border border-[var(--cream-dark)] bg-[var(--cream)]/50 px-3 py-2">
            <p className="text-xs font-semibold text-[var(--brown-dark)]">
              Akan sampai ke {preview} orang
            </p>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Jadwalkan (opsional)</label>
          <input
            name="scheduledAt"
            type="datetime-local"
            defaultValue={row?.scheduled_at ? row.scheduled_at.slice(0, 16) : ''}
            className="form-input"
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Kosongkan untuk menyimpan sebagai draf dan mengirim manual.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            {row ? 'Simpan' : 'Buat siaran'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function SendDialog({
  row,
  onClose,
  onSent,
}: {
  row: BroadcastRow
  onClose: () => void
  onSent: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    countRecipients(row.audience, row.audience_value).then((r) => {
      if (!cancelled) setCount(r.ok ? r.count : null)
    })
    return () => {
      cancelled = true
    }
  }, [row.audience, row.audience_value])

  async function run() {
    setBusy(true)
    const res = await sendBroadcast({ id: row.id })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(`Siaran terkirim ke ${res.data.recipients} orang.`)
    onSent()
  }

  return (
    <Sheet title="Kirim siaran" onClose={onClose} busy={busy}>
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle size={13} /> Tidak bisa dibatalkan
          </p>
          <p className="mt-1 text-[11px] text-amber-900 leading-relaxed">
            Notifikasi langsung masuk ke perangkat anggota. Menghapus siaran setelah terkirim tidak
            menariknya kembali.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--cream-dark)] bg-[var(--cream)]/50 p-3">
          <p className="text-sm font-semibold text-[var(--brown-dark)]">{row.title}</p>
          <p className="mt-1 text-xs text-[var(--text)] whitespace-pre-wrap">{row.body}</p>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          Sasaran: <strong>{AUDIENCE_LABEL[row.audience] ?? row.audience}</strong>
          {row.audience_value ? ` (${row.audience_value})` : ''}
          {count !== null ? ` · ${count} orang` : ''}
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
            onClick={run}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            <Send size={13} /> Kirim sekarang
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function TemplateDialog({
  row,
  onClose,
  onSaved,
  onDelete,
}: {
  row: TemplateRow | null
  onClose: () => void
  onSaved: () => void
  onDelete: ((reason: string) => Promise<unknown>) | null
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await saveTemplate({
      id: row?.id,
      name: String(fd.get('name') ?? ''),
      title: String(fd.get('title') ?? ''),
      body: String(fd.get('body') ?? ''),
      link: String(fd.get('link') ?? ''),
    })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(row ? 'Templat disimpan.' : 'Templat dibuat.')
    onSaved()
  }

  return (
    <Sheet title={row ? 'Ubah templat' : 'Templat baru'} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-3">
        <div className="form-group">
          <label className="form-label">Nama templat</label>
          <input name="name" required defaultValue={row?.name ?? ''} className="form-input" maxLength={80} placeholder="Pengingat ibadah" />
        </div>
        <div className="form-group">
          <label className="form-label">Judul</label>
          <input name="title" required defaultValue={row?.title ?? ''} className="form-input" maxLength={150} />
        </div>
        <div className="form-group">
          <label className="form-label">Isi</label>
          <textarea
            name="body"
            required
            rows={4}
            defaultValue={row?.body ?? ''}
            className="form-input"
            maxLength={2000}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tautan (opsional)</label>
          <input name="link" defaultValue={row?.link ?? ''} className="form-input font-mono text-xs" maxLength={300} />
        </div>

        {showDelete && onDelete && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-[11px] text-red-800">Alasan hapus (min. 5 karakter):</p>
            <textarea
              rows={2}
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              style={{ resize: 'vertical' }}
            />
            <button
              type="button"
              onClick={() => {
                if (note.trim().length < 5) return toast.error('Alasan minimal 5 karakter.')
                onDelete(note.trim())
              }}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white"
            >
              Hapus templat
            </button>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2">
          {onDelete ? (
            <button
              type="button"
              onClick={() => setShowDelete(!showDelete)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            >
              <Trash2 size={12} className="inline mr-1" /> Hapus
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)] disabled:opacity-50"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              {row ? 'Simpan' : 'Buat templat'}
            </button>
          </div>
        </div>
      </form>
    </Sheet>
  )
}

function ReasonDialog({
  title,
  hint,
  onClose,
  onConfirm,
}: {
  title: string
  hint: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<unknown>
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Sheet title={title} onClose={onClose} busy={busy}>
      <div className="space-y-3">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{hint}</p>
        <div className="form-group">
          <label className="form-label">Alasan (wajib, min. 5 karakter)</label>
          <textarea
            className="form-input"
            rows={3}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ resize: 'vertical' }}
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
            onClick={async () => {
              if (note.trim().length < 5) return toast.error('Alasan minimal 5 karakter.')
              setBusy(true)
              await onConfirm(note.trim())
              setBusy(false)
            }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
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

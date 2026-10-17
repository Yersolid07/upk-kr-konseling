// src/app/(app)/admin/kk-ktb/group-manager.tsx
// Konsol KK & KTB (M6).
//
// Tata letak mengutamakan tindakan, bukan tampilan data: tiap kartu grup
// menampilkan kode undangan (bisa disalin), jumlah anggota terhadap batas, dan
// tombol yang relevan. Daftar anggota dibuka di panel, bukan selalu terbuka,
// supaya 20 grup tidak menjadi halaman sepanjang tiga layar.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Users, Copy, Check, RotateCcw, Plus, Archive, ArchiveRestore, Trash2,
  UserMinus, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, X, Loader2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  saveGroup, archiveGroup, deleteGroup, rotateInviteCode, changeMember,
} from './actions'

export interface GroupMember {
  userId: string
  name: string
  isLeader: boolean
  joinedAt: string
}

export interface GroupRow {
  id: string
  name: string
  description: string | null
  leaderId: string | null
  leaderName: string | null
  inviteCode: string | null
  inviteCodeRequired: boolean
  maxMembers: number
  isActive: boolean
  isArchived: boolean
  memberCount: number
  members: GroupMember[]
}

export interface LeaderOption {
  id: string
  name: string
  role: string
}

type Mode = { kind: 'new' } | { kind: 'edit'; group: GroupRow } | null

export function GroupManager({
  groups,
  leaders,
  canDelete,
}: {
  groups: GroupRow[]
  leaders: LeaderOption[]
  canDelete: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Dialog konfirmasi bertingkat. Tindakan berbeda butuh tingkat ketegasan
  // berbeda: mengarsipkan masih bisa dibatalkan, menghapus tidak.
  const [confirm, setConfirm] = useState<
    | { kind: 'archive'; group: GroupRow; archive: boolean }
    | { kind: 'delete'; group: GroupRow }
    | { kind: 'rotate'; group: GroupRow }
    | null
  >(null)
  const [note, setNote] = useState('')

  const active = groups.filter((g) => !g.isArchived)
  const archived = groups.filter((g) => g.isArchived)

  // Hal yang perlu perhatian — ditampilkan di atas daftar.
  const attention = active.filter(
    (g) => !g.leaderId || (g.maxMembers > 0 && g.memberCount >= g.maxMembers)
  )

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      toast.error('Tidak bisa menyalin. Salin manual: ' + code)
    }
  }

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function doRotate(g: GroupRow) {
    setBusy(g.id)
    const res = await rotateInviteCode({ id: g.id, reason: 'Kode undangan diputar ulang' })
    setBusy(null)
    setConfirm(null)
    if ('error' in res) return toast.error(res.error)
    toast.success('Kode undangan baru dibuat. Kode lama tidak berlaku lagi.')
    refresh()
  }

  async function doArchive(g: GroupRow, archive: boolean) {
    if (note.trim().length < 5) return toast.error('Alasan minimal 5 karakter.')
    setBusy(g.id)
    const res = await archiveGroup({ id: g.id, archive, reason: note.trim() })
    setBusy(null)
    setConfirm(null)
    setNote('')
    if ('error' in res) return toast.error(res.error)
    toast.success(archive ? 'Grup diarsipkan.' : 'Grup diaktifkan kembali.')
    refresh()
  }

  async function doDelete(g: GroupRow) {
    if (note.trim().length < 10) return toast.error('Alasan minimal 10 karakter.')
    setBusy(g.id)
    const res = await deleteGroup({ id: g.id, reason: note.trim() })
    setBusy(null)
    setConfirm(null)
    setNote('')
    if ('error' in res) return toast.error(res.error)
    toast.success('Grup dihapus permanen.')
    refresh()
  }

  async function removeMember(g: GroupRow, m: GroupMember) {
    if (!window.confirm(`Keluarkan ${m.name} dari ${g.name}?`)) return
    setBusy(g.id)
    const res = await changeMember({ groupId: g.id, userId: m.userId, action: 'remove' })
    setBusy(null)
    if ('error' in res) return toast.error(res.error)
    toast.success(`${m.name} dikeluarkan.`)
    refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">
            KK &amp; KTB
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {active.length} grup aktif · {archived.length} diarsipkan
          </p>
        </div>
        <button
          onClick={() => setMode({ kind: 'new' })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-[var(--cream)]"
        >
          <Plus size={14} /> Grup baru
        </button>
      </div>

      {attention.length > 0 && (
        <div className="card-premium border-amber-200 bg-amber-50/60 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle size={13} /> Perlu perhatian
          </p>
          <ul className="mt-2 space-y-1">
            {attention.map((g) => (
              <li key={g.id} className="text-xs text-amber-900">
                <strong>{g.name}</strong> —{' '}
                {!g.leaderId
                  ? 'belum punya pemimpin'
                  : `sudah penuh (${g.memberCount}/${g.maxMembers} anggota)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {active.length === 0 && archived.length === 0 && (
        <div className="card-premium px-6 py-14 text-center">
          <Users size={26} className="mx-auto text-[var(--text-muted)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">Belum ada grup.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {active.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            busy={busy === g.id}
            expanded={expanded === g.id}
            copied={copied === g.inviteCode}
            canDelete={canDelete}
            onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
            onCopy={() => g.inviteCode && copyCode(g.inviteCode)}
            onEdit={() => setMode({ kind: 'edit', group: g })}
            onRotate={() => {
              setNote('')
              setConfirm({ kind: 'rotate', group: g })
            }}
            onArchive={() => {
              setNote('')
              setConfirm({ kind: 'archive', group: g, archive: true })
            }}
            onRemoveMember={(m) => removeMember(g, m)}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Diarsipkan
          </p>
          <div className="space-y-2.5">
            {archived.map((g) => (
              <div key={g.id} className="card-premium p-4 opacity-80">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[var(--brown-dark)]">{g.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {g.memberCount} anggota · {g.leaderName ?? 'tanpa pemimpin'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNote('')
                      setConfirm({ kind: 'archive', group: g, archive: false })
                    }}
                    disabled={busy === g.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
                  >
                    <ArchiveRestore size={12} /> Aktifkan
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => {
                        setNote('')
                        setConfirm({ kind: 'delete', group: g })
                      }}
                      disabled={busy === g.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode && (
        <GroupForm
          mode={mode}
          leaders={leaders}
          onClose={() => setMode(null)}
          onSaved={() => {
            setMode(null)
            refresh()
          }}
        />
      )}

      {confirm && (
        <ConfirmSheet
          confirm={confirm}
          note={note}
          setNote={setNote}
          busy={busy !== null}
          onClose={() => setConfirm(null)}
          onArchive={doArchive}
          onDelete={doDelete}
          onRotate={doRotate}
        />
      )}
    </div>
  )
}

function GroupCard({
  group: g,
  busy,
  expanded,
  copied,
  canDelete,
  onToggle,
  onCopy,
  onEdit,
  onRotate,
  onArchive,
  onRemoveMember,
}: {
  group: GroupRow
  busy: boolean
  expanded: boolean
  copied: boolean
  canDelete: boolean
  onToggle: () => void
  onCopy: () => void
  onEdit: () => void
  onRotate: () => void
  onArchive: () => void
  onRemoveMember: (m: GroupMember) => void
}) {
  const full = g.maxMembers > 0 && g.memberCount >= g.maxMembers

  return (
    <div className="card-premium overflow-hidden">
      <div className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-[var(--brown-dark)]">{g.name}</span>
              {!g.leaderId && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  tanpa pemimpin
                </span>
              )}
              {full && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                  penuh
                </span>
              )}
              {!g.isActive && (
                <span className="rounded-full bg-[var(--cream-dark)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-2)]">
                  nonaktif
                </span>
              )}
            </div>

            {g.description && (
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{g.description}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={11} /> {g.leaderName ?? 'Belum ada pemimpin'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={11} /> {g.memberCount}
                {g.maxMembers > 0 ? ` / ${g.maxMembers}` : ''} anggota
              </span>
              {g.inviteCode && (
                <span className="inline-flex items-center gap-1">
                  kode:
                  <code className="rounded bg-[var(--cream)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--brown-dark)]">
                    {g.inviteCode}
                  </code>
                  <button
                    onClick={onCopy}
                    className="text-[var(--terra)] hover:text-[var(--brown)]"
                    aria-label="Salin kode undangan"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                  {g.inviteCodeRequired && (
                    <span className="text-[10px] font-semibold text-[var(--sage)]">wajib</span>
                  )}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--cream-dark)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-2)]"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Tutup' : 'Anggota'}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 rounded-lg border border-[var(--cream)] bg-[var(--cream)]/40 p-3">
            {g.members.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Belum ada anggota.</p>
            ) : (
              <ul className="space-y-1">
                {g.members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-[var(--text)]">
                      {m.name}
                      {m.isLeader && (
                        <span className="ml-1.5 rounded bg-[var(--brown-dark)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--cream)]">
                          pemimpin
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {formatDate(m.joinedAt)}
                    </span>
                    {!m.isLeader && (
                      <button
                        onClick={() => onRemoveMember(m)}
                        className="text-red-600 hover:text-red-700"
                        aria-label={`Keluarkan ${m.name}`}
                      >
                        <UserMinus size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-t border-[var(--cream)] bg-[var(--cream)]/40">
        <button
          onClick={onEdit}
          disabled={busy}
          className="rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
        >
          Ubah
        </button>
        <button
          onClick={onRotate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
        >
          <RotateCcw size={12} /> Putar kode
        </button>
        <button
          onClick={onArchive}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
        >
          <Archive size={12} /> Arsipkan
        </button>
      </div>
    </div>
  )
}

function GroupForm({
  mode,
  leaders,
  onClose,
  onSaved,
}: {
  mode: Mode
  leaders: LeaderOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = mode?.kind === 'new'
  const g = mode?.kind === 'edit' ? mode.group : null
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const res = await saveGroup({
      id: g?.id,
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? ''),
      leaderId: String(fd.get('leaderId') ?? '') || null,
      maxMembers: Number(fd.get('maxMembers') ?? 0),
      inviteCodeRequired: fd.get('inviteCodeRequired') === 'on',
      isActive: fd.get('isActive') === 'on',
    })
    setBusy(false)
    if ('error' in res) return toast.error(res.error)
    toast.success(isNew ? 'Grup dibuat.' : 'Perubahan disimpan.')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[140] overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
            <h2 className="font-bold text-[var(--brown-dark)] text-sm">
              {isNew ? 'Grup baru' : `Ubah ${g?.name}`}
            </h2>
            <button type="button" onClick={onClose} aria-label="Tutup">
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <div className="form-group">
              <label className="form-label">Nama grup</label>
              <input name="name" required defaultValue={g?.name ?? ''} className="form-input" maxLength={80} />
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={g?.description ?? ''}
                className="form-input"
                maxLength={500}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pemimpin</label>
              <select name="leaderId" defaultValue={g?.leaderId ?? ''} className="form-input">
                <option value="">— Belum ada —</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.role})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Pemimpin adalah pembina grup, biasanya konselor.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Batas anggota</label>
              <input
                name="maxMembers"
                type="number"
                min={0}
                max={500}
                defaultValue={g?.maxMembers ?? 0}
                className="form-input"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                0 berarti tanpa batas. Kelompok kecil yang saling mengenal bekerja lebih baik
                dengan batas.
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-[var(--text-2)]">
              <input
                type="checkbox"
                name="inviteCodeRequired"
                defaultChecked={g ? g.inviteCodeRequired : true}
                className="mt-0.5"
              />
              <span>
                Wajib kode undangan untuk bergabung
                <span className="block text-[10px] text-[var(--text-muted)]">
                  Bila dimatikan, siapa pun yang tahu grup ini bisa langsung masuk.
                </span>
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs text-[var(--text-2)]">
              <input type="checkbox" name="isActive" defaultChecked={g ? g.isActive : true} />
              Grup aktif
            </label>
          </div>

          <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
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
              {isNew ? 'Buat grup' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmSheet({
  confirm,
  note,
  setNote,
  busy,
  onClose,
  onArchive,
  onDelete,
  onRotate,
}: {
  confirm:
    | { kind: 'archive'; group: GroupRow; archive: boolean }
    | { kind: 'delete'; group: GroupRow }
    | { kind: 'rotate'; group: GroupRow }
  note: string
  setNote: (v: string) => void
  busy: boolean
  onClose: () => void
  onArchive: (g: GroupRow, archive: boolean) => void
  onDelete: (g: GroupRow) => void
  onRotate: (g: GroupRow) => void
}) {
  const title =
    confirm.kind === 'rotate'
      ? 'Putar ulang kode undangan'
      : confirm.kind === 'delete'
        ? 'Hapus grup permanen'
        : confirm.archive
          ? 'Arsipkan grup'
          : 'Aktifkan kembali grup'

  const hint =
    confirm.kind === 'rotate'
      ? 'Kode lama langsung tidak berlaku. Anggota yang sudah bergabung tetap menjadi anggota; tautan undangan yang beredar berhenti bekerja.'
      : confirm.kind === 'delete'
        ? 'Seluruh pesan grup ikut terhapus dan tidak bisa dikembalikan. Ini tidak bisa dibatalkan.'
        : confirm.archive
          ? 'Grup disembunyikan dan tidak bisa menerima anggota baru. Riwayat tetap utuh dan bisa diaktifkan kembali.'
          : 'Grup tampil kembali dan bisa menerima anggota.'

  const needReason = confirm.kind !== 'rotate'
  const minLen = confirm.kind === 'delete' ? 10 : 5

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto">
      <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
            <h2 className="font-bold text-[var(--brown-dark)] text-sm">{title}</h2>
            <button onClick={onClose} aria-label="Tutup">
              <X size={16} className="text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{hint}</p>
            <p className="rounded-lg bg-[var(--cream)]/60 border border-[var(--cream-dark)] px-3 py-2 text-xs font-semibold text-[var(--brown-dark)]">
              {confirm.group.name}
            </p>

            {needReason && (
              <div className="form-group">
                <label className="form-label">
                  Alasan (wajib, min. {minLen} karakter)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  maxLength={300}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: grup tidak lagi aktif sejak semester lalu."
                  style={{ resize: 'vertical' }}
                  autoFocus
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{note.length}/300</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--cream-dark)] bg-[var(--cream)]/40">
            <button
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (confirm.kind === 'rotate') onRotate(confirm.group)
                else if (confirm.kind === 'delete') onDelete(confirm.group)
                else onArchive(confirm.group, confirm.archive)
              }}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                confirm.kind === 'delete' ? 'bg-red-600' : 'bg-[var(--brown-dark)]'
              }`}
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              {title}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

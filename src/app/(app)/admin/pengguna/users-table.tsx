// src/app/(app)/admin/pengguna/users-table.tsx
// Tabel pengguna + panel ubah peran / status.
//
// Peran yang bisa diberikan dibatasi oleh peran PENGGUNA yang sedang masuk:
// moderator hanya bisa melihat, admin bisa memberi sampai moderator/konselor,
// dan hanya super_admin yang bisa memberi super_admin. Batas ini juga
// ditegakkan ulang di Server Action dan di trigger database.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShieldCheck, ShieldOff, UserCog, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/data-table'
import { DetailDrawer, DetailRow } from '@/components/admin/detail-drawer'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { formatDateTime } from '@/lib/utils'
import { ROLE_LABEL, ROLE_RANK, type Capability } from '@/lib/rbac'
import type { UserRole } from '@/types/database'
import { changeUserRoleAction, setUserActiveAction } from './actions'

export interface UserRow {
  id: string
  fullName: string
  role: UserRole
  angkatan: string | null
  jurusan: string | null
  isActive: boolean
  isVerified: boolean
  createdAt: string
  isSelf: boolean
}

const SCOPES = [
  { key: 'all', label: 'Semua' },
  { key: 'staff', label: 'Staf' },
  { key: 'konselor', label: 'Konselor' },
  { key: 'inactive', label: 'Nonaktif' },
] as const

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  moderator: 'bg-teal-50 text-teal-700 border-teal-200',
  konselor: 'bg-amber-50 text-amber-700 border-amber-200',
  member: 'bg-stone-100 text-stone-600 border-stone-300',
}

export function UsersTable({
  rows, total, page, pageSize, sort, dir, q, scope, viewerRole, canManageRoles, canBan,
}: {
  rows: UserRow[]
  total: number
  page: number
  pageSize: number
  sort: string
  dir: 'asc' | 'desc'
  q: string
  scope: string
  viewerRole: UserRole
  canManageRoles: boolean
  canBan: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState<UserRow | null>(null)
  const [pending, setPending] = useState<{
    kind: 'role' | 'active'
    row: UserRow
    isActive?: boolean
  } | null>(null)
  // Peran tujuan dipilih di panel detail SEBELUM dialog konfirmasi dibuka,
  // supaya alasan yang diketik benar-benar untuk peran yang dimaksud.
  const [chosenRole, setChosenRole] = useState<UserRole | null>(null)

  const columns: Column<UserRow>[] = [
    {
      key: 'full_name',
      header: 'Nama',
      sortable: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="font-semibold text-[var(--brown-dark)]">{r.fullName}</span>
          {r.isSelf && (
            <span className="ml-2 text-[10px] font-bold uppercase text-[var(--terra)]">kamu</span>
          )}
          {!r.isActive && (
            <span className="ml-2 text-[10px] font-bold uppercase text-red-600">nonaktif</span>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Peran',
      sortable: true,
      render: (r) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${ROLE_BADGE[r.role]}`}
        >
          {ROLE_LABEL[r.role]}
        </span>
      ),
    },
    {
      key: 'angkatan',
      header: 'Angkatan',
      render: (r) => <span className="text-xs">{r.angkatan ?? '—'}</span>,
    },
    {
      key: 'jurusan',
      header: 'Jurusan',
      render: (r) => <span className="text-xs">{r.jurusan ?? '—'}</span>,
    },
    {
      key: 'verified',
      header: 'Verifikasi',
      render: (r) =>
        r.isVerified ? (
          <CheckCircle2 size={14} className="text-emerald-600" />
        ) : (
          <XCircle size={14} className="text-[var(--text-muted)]" />
        ),
    },
    {
      key: 'created_at',
      header: 'Bergabung',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
  ]

  // Peran yang boleh diberikan oleh pengguna ini.
  const assignable = (Object.keys(ROLE_RANK) as UserRole[]).filter(
    (r) => ROLE_RANK[r] <= ROLE_RANK[viewerRole] && (r !== 'super_admin' || viewerRole === 'super_admin')
  )

  async function submitRole(role: UserRole, reason: string) {
    if (!pending?.row) return { ok: false, error: 'Tidak ada pengguna.' }
    const res = await changeUserRoleAction({ userId: pending.row.id, role, reason })
    if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
      return { ok: false, error: String((res as { error: string }).error) }
    }
    toast.success(`Peran diubah menjadi ${ROLE_LABEL[role]}.`)
    setOpen(null)
    router.refresh()
    return { ok: true }
  }

  async function submitActive(isActive: boolean, reason: string) {
    if (!pending?.row) return { ok: false, error: 'Tidak ada pengguna.' }
    const res = await setUserActiveAction({ userId: pending.row.id, isActive, reason })
    if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
      return { ok: false, error: String((res as { error: string }).error) }
    }
    toast.success(isActive ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.')
    setOpen(null)
    router.refresh()
    return { ok: true }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={s.key === 'all' ? '/admin/pengguna' : `/admin/pengguna?scope=${s.key}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              scope === s.key || (!scope && s.key === 'all')
                ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
                : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)] hover:border-[var(--terra)]'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        basePath="/admin/pengguna"
        extraParams={scope ? { scope } : {}}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpen(r)}
        emptyText="Tidak ada pengguna yang cocok."
      />

      <DetailDrawer
        open={Boolean(open)}
        onClose={() => {
          setOpen(null)
          setChosenRole(null)
        }}
        title={open?.fullName ?? ''}
        subtitle={open ? ROLE_LABEL[open.role] : undefined}
        footer={
          open && (
            <>
              {canManageRoles && !open.isSelf && (
                <button
                  onClick={() => {
                    setChosenRole(open.role)
                    setPending({ kind: 'role', row: open })
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] hover:border-[var(--terra)]"
                >
                  <UserCog size={13} /> Ubah peran
                </button>
              )}
              {canBan && !open.isSelf && (
                <button
                  onClick={() => setPending({ kind: 'active', row: open, isActive: !open.isActive })}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    open.isActive
                      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {open.isActive ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                  {open.isActive ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                </button>
              )}
            </>
          )
        }
      >
        {open && (
          <>
            <DetailRow label="Peran">{ROLE_LABEL[open.role]}</DetailRow>
            <DetailRow label="Status">
              {open.isActive ? 'Aktif' : <span className="text-red-600">Nonaktif</span>}
            </DetailRow>
            <DetailRow label="Verifikasi">
              {open.isVerified ? 'Terverifikasi' : 'Belum terverifikasi'}
            </DetailRow>
            <DetailRow label="Angkatan">{open.angkatan ?? '—'}</DetailRow>
            <DetailRow label="Jurusan">{open.jurusan ?? '—'}</DetailRow>
            <DetailRow label="Bergabung">{formatDateTime(open.createdAt)}</DetailRow>
            {canManageRoles && !open.isSelf && (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1.5">
                  Peran tujuan (pilih sebelum menekan “Ubah peran”)
                </p>
                <RolePicker
                  value={chosenRole ?? open.role}
                  options={assignable}
                  onChange={setChosenRole}
                />
              </div>
            )}
            {open.isSelf && (
              <p className="text-[11px] text-[var(--text-muted)]">
                Ini akunmu sendiri — peran dan status tidak bisa diubah dari sini.
              </p>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Dialog ubah peran */}
      <ConfirmDialog
        open={pending?.kind === 'role'}
        onClose={() => setPending(null)}
        title={`Ubah peran ${pending?.row.fullName ?? ''}`}
        description="Peran menentukan seluruh akses di situs. Perubahan tercatat permanen di jejak audit."
        level="reason"
        confirmLabel="Simpan peran"
        onConfirm={async ({ reason }) => {
          if (!pending?.row) return { ok: false, error: 'Tidak ada pengguna.' }
          return submitRole(chosenRole ?? pending.row.role, reason)
        }}
      />

      {/* Dialog aktif/nonaktif */}
      <ConfirmDialog
        open={pending?.kind === 'active'}
        onClose={() => setPending(null)}
        title={pending?.isActive ? 'Aktifkan akun ini?' : 'Nonaktifkan akun ini?'}
        description={
          pending?.isActive
            ? 'Akun bisa masuk dan memakai seluruh fitur lagi.'
            : 'Akun tidak bisa masuk. Isi kontennya tetap tersimpan.'
        }
        level="reason"
        confirmLabel={pending?.isActive ? 'Aktifkan' : 'Nonaktifkan'}
        onConfirm={async ({ reason }) => submitActive(Boolean(pending?.isActive), reason)}
      />
    </>
  )
}

/** Pemilih peran — dipakai di panel detail sebelum konfirmasi. */
export function RolePicker({
  value,
  options,
  onChange,
}: {
  value: UserRole
  options: UserRole[]
  onChange: (r: UserRole) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
            value === r
              ? 'bg-[var(--brown-dark)] text-[var(--cream)] border-[var(--brown-dark)]'
              : 'bg-[var(--surface)] text-[var(--text-2)] border-[var(--cream-dark)]'
          }`}
        >
          {ROLE_LABEL[r]}
        </button>
      ))}
    </div>
  )
}

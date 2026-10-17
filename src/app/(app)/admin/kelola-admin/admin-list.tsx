// src/app/(app)/admin/kelola-admin/admin-list.tsx
// Daftar akun berperan tinggi + penurunan peran.
//
// Menurunkan peran admin menjadi anggota adalah tindakan yang lebih sering
// diperlukan daripada menaikkan; karena itu tombolnya ada di sini, bukan
// hanya di /admin/pengguna.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShieldCheck, ShieldOff, Crown } from 'lucide-react'
import type { Profile, UserRole } from '@/types/database'
import { ROLE_LABEL, ROLE_RANK } from '@/lib/rbac'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { formatDateTime } from '@/lib/utils'
import { changeUserRoleAction } from '../pengguna/actions'

const BADGE: Record<string, string> = {
  super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  moderator: 'bg-teal-50 text-teal-700 border-teal-200',
}

export function AdminList({
  admins,
  viewerId,
  viewerRole,
  canManageRoles,
}: {
  admins: Profile[]
  viewerId: string
  viewerRole: UserRole
  canManageRoles: boolean
}) {
  const router = useRouter()
  const [target, setTarget] = useState<{ profile: Profile; next: UserRole } | null>(null)

  function ask(profile: Profile, next: UserRole) {
    setTarget({ profile, next })
  }

  async function submit(reason: string) {
    if (!target) return { ok: false, error: 'Tidak ada target.' }
    const res = await changeUserRoleAction({
      userId: target.profile.id,
      role: target.next,
      reason,
    })
    if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
      return { ok: false, error: String((res as { error: string }).error) }
    }
    toast.success(`${target.profile.full_name} sekarang ${ROLE_LABEL[target.next]}.`)
    router.refresh()
    return { ok: true }
  }

  /** Pilihan penurunan yang masuk akal untuk sebuah akun. */
  function options(p: Profile): UserRole[] {
    const out: UserRole[] = []
    if (p.role !== 'member') out.push('member')
    if (p.role !== 'konselor') out.push('konselor')
    if (p.role !== 'moderator') out.push('moderator')
    if (p.role !== 'admin' && ROLE_RANK[viewerRole] >= ROLE_RANK.admin) out.push('admin')
    return out.filter((r) => r !== p.role && ROLE_RANK[r] <= ROLE_RANK[viewerRole])
  }

  return (
    <>
      <div className="card-premium overflow-hidden divide-y divide-[var(--cream)]">
        {admins.map((a) => {
          const isSelf = a.id === viewerId
          return (
            <div key={a.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-[var(--cream-dark)] text-[var(--brown)] flex items-center justify-center">
                {a.role === 'super_admin' ? <Crown size={16} /> : <ShieldCheck size={16} />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[var(--brown-dark)]">
                    {a.full_name}
                  </span>
                  {isSelf && (
                    <span className="text-[10px] font-bold uppercase text-[var(--terra)]">kamu</span>
                  )}
                  {!a.is_active && (
                    <span className="text-[10px] font-bold uppercase text-red-600">nonaktif</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase ${BADGE[a.role] ?? ''}`}
                  >
                    {ROLE_LABEL[a.role]}
                  </span>
                  <span>sejak {formatDateTime(a.created_at)}</span>
                </div>
              </div>

              {canManageRoles && !isSelf && (
                <div className="flex flex-wrap gap-1.5">
                  {options(a).map((r) => (
                    <button
                      key={r}
                      onClick={() => ask(a, r)}
                      className="rounded-lg border border-[var(--cream-dark)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-2)] hover:border-[var(--terra)] hover:text-[var(--brown)]"
                    >
                      {ROLE_RANK[r] < ROLE_RANK[a.role] ? (
                        <span className="inline-flex items-center gap-1">
                          <ShieldOff size={11} /> {ROLE_LABEL[r]}
                        </span>
                      ) : (
                        ROLE_LABEL[r]
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={`Ubah peran ${target?.profile.full_name ?? ''}?`}
        description={
          target
            ? `Dari ${ROLE_LABEL[target.profile.role]} menjadi ${ROLE_LABEL[target.next]}. Akses admin bisa dicabut seketika.`
            : undefined
        }
        level="reason"
        confirmLabel="Ubah peran"
        onConfirm={async ({ reason }) => submit(reason)}
      />
    </>
  )
}

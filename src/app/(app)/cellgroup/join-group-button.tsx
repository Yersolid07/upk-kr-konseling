// src/app/(app)/cellgroup/join-group-button.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Check, KeyRound, X, Loader2, Lock } from 'lucide-react'
import { joinCellGroup } from './actions'
import toast from 'react-hot-toast'

/**
 * Tombol gabung. Bila grup mewajibkan kode undangan, tombol membuka dialog
 * kecil lebih dulu — bukan mengirim permintaan lalu gagal dengan pesan galat.
 */
export function JoinGroupButton({
  groupId,
  requiresCode = false,
  isFull = false,
}: {
  groupId: string
  requiresCode?: boolean
  isFull?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [asking, setAsking] = useState(false)
  const [code, setCode] = useState('')

  function submit(inviteCode?: string) {
    startTransition(async () => {
      const res = await joinCellGroup(groupId, inviteCode)
      if (res?.error) {
        toast.error(res.error)
        return
      }
      setDone(true)
      setAsking(false)
      toast.success(res.alreadyMember ? 'Anda sudah anggota grup ini.' : 'Berhasil bergabung!')
      router.refresh()
    })
  }

  if (isFull) {
    return (
      <span className="px-5 py-2 rounded-xl bg-[var(--cream-dark)] text-[var(--text-muted)] text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
        <Lock size={14} /> Penuh
      </span>
    )
  }

  if (done) {
    return (
      <span className="px-5 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
        <Check size={14} /> Bergabung
      </span>
    )
  }

  return (
    <>
      <button
        onClick={() => (requiresCode ? setAsking(true) : submit())}
        disabled={pending}
        className="px-5 py-2 rounded-xl bg-[var(--brown-dark)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--brown)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
        {requiresCode ? 'Gabung dengan kode' : 'Gabung'}
      </button>

      {asking && (
        <div className="fixed inset-0 z-[140] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => !pending && setAsking(false)}
          />
          <div className="relative flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-[var(--cream-dark)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-dark)]">
                <h2 className="flex items-center gap-1.5 font-bold text-[var(--brown-dark)] text-sm">
                  <KeyRound size={14} /> Kode undangan
                </h2>
                <button onClick={() => setAsking(false)} aria-label="Tutup">
                  <X size={16} className="text-[var(--text-muted)]" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Grup ini memakai kode undangan. Minta kode kepada pemimpin KK/KTB.
                </p>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="form-input font-mono tracking-wider"
                  placeholder="mis. 4f2a9c1b"
                  autoFocus
                  maxLength={32}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.trim()) submit(code.trim())
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setAsking(false)}
                    disabled={pending}
                    className="rounded-lg border border-[var(--cream-dark)] px-4 py-2 text-xs font-semibold text-[var(--text-2)] disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => code.trim() && submit(code.trim())}
                    disabled={pending || !code.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown-dark)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {pending && <Loader2 size={13} className="animate-spin" />}
                    Gabung
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// src/app/(app)/pengaturan/sign-out-everywhere.tsx
'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, LogOut, Smartphone } from 'lucide-react'
import { signOutEverywhere } from './actions'

export function SignOutEverywhere() {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    const res = await signOutEverywhere()
    setBusy(false)
    if (res?.error) return toast.error(res.error)
    toast.success('Semua perangkat lain dikeluarkan. Sesi ini tetap aktif.')
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="w-9 h-9 rounded-xl bg-[var(--cream)] text-[var(--brown)] flex items-center justify-center shrink-0">
        <Smartphone size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--brown-dark)]">Keluar dari perangkat lain</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Berguna bila Anda pernah masuk di perangkat bersama.
        </p>
      </div>
      <button
        onClick={run}
        disabled={busy}
        className="px-3 py-2 rounded-xl border border-[var(--cream-dark)] text-[var(--brown)] text-[11px] font-bold hover:bg-[var(--cream)] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
        {busy ? 'Proses' : 'Keluar'}
      </button>
    </div>
  )
}

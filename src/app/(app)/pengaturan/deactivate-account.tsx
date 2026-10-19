// src/app/(app)/pengaturan/deactivate-account.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2, AlertTriangle } from 'lucide-react'
import { deactivateMyAccount } from './actions'

/**
 * Penonaktifan akun meminta pengguna mengetik ulang kata sandi konfirmasi.
 *
 * Bukan formalitas: tanpa langkah ini, siapa pun yang menemukan perangkat
 * dalam keadaan tidak terkunci bisa menonaktifkan akun pemiliknya.
 */
export function DeactivateAccount() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (word.trim().toUpperCase() !== 'NONAKTIFKAN') {
      return toast.error('Ketik NONAKTIFKAN untuk melanjutkan.')
    }
    setBusy(true)
    const res = await deactivateMyAccount()
    if (res?.error) {
      setBusy(false)
      return toast.error(res.error)
    }
    toast.success('Akun dinonaktifkan.')
    router.push('/auth/login')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 px-4 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50 transition-colors"
      >
        Nonaktifkan akun saya
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 leading-relaxed">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>
          Anda akan langsung keluar dan tidak bisa masuk lagi. Ketik
          <strong className="mx-1">NONAKTIFKAN</strong>
          untuk memastikan.
        </span>
      </div>
      <input
        className="form-input"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="NONAKTIFKAN"
        aria-label="Ketik NONAKTIFKAN untuk konfirmasi"
      />
      <div className="flex gap-2">
        <button
          onClick={run}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          {busy ? 'Memproses...' : 'Ya, nonaktifkan'}
        </button>
        <button
          onClick={() => { setOpen(false); setWord('') }}
          className="px-4 py-2 rounded-xl border border-[var(--cream-dark)] text-[var(--brown)] text-xs font-bold hover:bg-[var(--cream)] transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  )
}

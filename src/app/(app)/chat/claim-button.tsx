// src/app/(app)/chat/claim-button.tsx
'use client'

import { useState, useTransition } from 'react'
import { claimChatSession } from './actions'
import { Loader2, HandHeart } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Tombol "Ambil sesi" untuk konselor.
 *
 * Izin diperiksa di fungsi SQL `claim_chat_session`, bukan di sini — komponen
 * ini hanya menyembunyikan tombol dari yang bukan konselor. Kalau seseorang
 * memanggil server action langsung, database tetap menolak.
 */
export function ClaimButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleClick = async () => {
    setLoading(true)
    const result = await claimChatSession(sessionId)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
      startTransition(() => window.location.reload())
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || pending}
      className="px-4 py-2 bg-[var(--sage)] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <HandHeart size={14} />}
      {loading ? 'Mengambil...' : 'Ambil sesi'}
    </button>
  )
}

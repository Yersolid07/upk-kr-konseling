// src/app/(app)/cellgroup/[id]/leave-group-button.tsx
'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { leaveCellGroup } from '../actions'
import toast from 'react-hot-toast'

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function handleLeave() {
    startTransition(async () => {
      const res = await leaveCellGroup(groupId)
      if (res?.error) {
        toast.error(res.error)
        setConfirming(false)
      }
      // On success the server action redirects to /cellgroup.
    })
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-5 py-2.5 rounded-xl bg-white border border-[var(--cream-dark)] text-[var(--text-muted)] text-xs font-black uppercase tracking-widest hover:border-red-300 hover:text-red-500 transition-all flex items-center gap-2"
      >
        <LogOut size={14} /> Keluar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLeave}
        disabled={pending}
        className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
      >
        {pending ? '...' : 'Yakin keluar'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-4 py-2.5 rounded-xl bg-white border border-[var(--cream-dark)] text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest"
      >
        Batal
      </button>
    </div>
  )
}

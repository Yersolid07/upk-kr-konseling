// src/app/(app)/cellgroup/join-group-button.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Check } from 'lucide-react'
import { joinCellGroup } from './actions'
import toast from 'react-hot-toast'

export function JoinGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleJoin() {
    startTransition(async () => {
      const res = await joinCellGroup(groupId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setDone(true)
        toast.success('Berhasil bergabung!')
        router.refresh()
      }
    })
  }

  if (done) {
    return (
      <span className="px-5 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
        <Check size={14} /> Bergabung
      </span>
    )
  }

  return (
    <button
      onClick={handleJoin}
      disabled={pending}
      className="px-5 py-2 rounded-xl bg-[var(--brown-dark)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--brown)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
    >
      <UserPlus size={16} /> {pending ? '...' : 'Gabung'}
    </button>
  )
}

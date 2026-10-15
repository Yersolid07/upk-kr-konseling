// src/app/chat/chat-buttons.tsx
'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { createChatSession } from './actions'
import { Loader2 } from 'lucide-react'

export function StartChatButton() {
  const [loading, setLoading] = useState(false)

  const handleStartChat = async () => {
    setLoading(true)
    const result = await createChatSession()
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
    // On success the server action calls redirect(), so Next.js navigates and
    // this component unmounts — no local state reset needed.
  }

  return (
    <button
      onClick={handleStartChat}
      disabled={loading}
      className="px-4 py-2 bg-[var(--sage)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-2"
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {loading ? 'Menghubungkan...' : 'Hubungi'}
    </button>
  )
}

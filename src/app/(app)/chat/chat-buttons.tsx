// src/app/chat/chat-buttons.tsx
'use client'

import { useState } from 'react'
import { createChatSession } from './actions'
import { User, MessageCircle } from 'lucide-react'

export function StartChatButton() {
  const [loading, setLoading] = useState(false)

  const handleStartChat = async () => {
    setLoading(true)
    const result = await createChatSession()
    if (result?.error) {
      alert(result.error)
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleStartChat}
      disabled={loading}
      className="px-4 py-2 bg-[var(--sage)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
    >
      {loading ? 'Menghubungkan...' : 'Hubungi'}
    </button>
  )
}

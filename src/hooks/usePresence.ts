// src/hooks/usePresence.ts
// Tracks and broadcasts online status via Supabase Presence + profiles.is_online.
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePresence(userId: string) {
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineIds, setOnlineIds] = useState<string[]>([])

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    // Mark user online in DB (used by SOS routing to prefer online counselors).
    ;(supabase.from('profiles') as any)
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {})

    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const ids = Object.keys(state)
        setOnlineIds(ids)
        setOnlineCount(ids.length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() })
        }
      })

    const setOnline = (online: boolean) => {
      ;(supabase.from('profiles') as any)
        .update({ is_online: online, last_seen: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {})
    }

    const markOffline = () => {
      setOnline(false)
      channel.untrack()
    }

    const onVisibility = () => {
      if (document.hidden) markOffline()
      else setOnline(true)
    }

    window.addEventListener('beforeunload', markOffline)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      markOffline()
      channel.unsubscribe()
      window.removeEventListener('beforeunload', markOffline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [userId])

  return { onlineCount, onlineIds }
}

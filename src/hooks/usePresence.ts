// src/hooks/usePresence.ts
// Tracks and broadcasts online status via Supabase Presence
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePresence(userId: string) {
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    // Mark user as online in DB
    (supabase.from('profiles') as any)
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', userId)

    // Supabase Presence channel for realtime online tracking
    const channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineIds = Object.keys(state)
        // Could dispatch to a store if needed
        console.log('Online users:', onlineIds.length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    // Mark offline on unmount / tab close
    const markOffline = () => {
      (supabase.from('profiles') as any)
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', userId)
      channel.untrack()
    }

    window.addEventListener('beforeunload', markOffline)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) markOffline()
      else (supabase.from('profiles') as any).update({ is_online: true }).eq('id', userId)
    })

    return () => {
      markOffline()
      channel.unsubscribe()
      window.removeEventListener('beforeunload', markOffline)
    }
  }, [userId])
}

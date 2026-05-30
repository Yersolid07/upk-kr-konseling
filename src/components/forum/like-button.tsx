'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { toggleLike } from '@/app/(app)/forum/actions'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface LikeButtonProps {
  threadId: string
  initialLikes: number
  initialHasLiked: boolean
}

export function LikeButton({ threadId, initialLikes, initialHasLiked }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to real-time likes for this thread
    const channel = supabase.channel(`public:reactions:threadId=${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reactions', filter: `content_id=eq.${threadId}` },
        (payload) => {
           // We only want to increase likes if it's someone else's like
           // But since we can't easily get the current user ID here synchronously without async call,
           // and optimistic updates already handled local state, we should be careful about double counting.
           // However, if we do a simple sync, it's safer to just increment.
           // A safer approach: re-fetch count when a new insert happens.
           fetchLikeCount()
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reactions', filter: `content_id=eq.${threadId}` },
        (payload) => {
           fetchLikeCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, supabase])

  const fetchLikeCount = async () => {
    const { count } = await supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', 'thread')
      .eq('content_id', threadId)
    if (count !== null) setLikes(count)
  }

  const handleLike = async () => {
    if (loading) return

    // Optimistic update
    setHasLiked(!hasLiked)
    setLikes(prev => hasLiked ? prev - 1 : prev + 1)
    setLoading(true)

    const res = await toggleLike(threadId)
    if (res.error) {
      // Revert if error
      setHasLiked(hasLiked)
      setLikes(initialLikes)
      alert(res.error)
    }
    // No need to sync explicitly, realtime will trigger `fetchLikeCount`

    setLoading(false)
  }

  return (
    <button 
      onClick={handleLike}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 font-bold text-sm hover:scale-105 transition-transform",
        hasLiked ? "text-[var(--terra)]" : "text-[var(--text-muted)] hover:text-[var(--terra)]"
      )}
    >
      <Heart size={20} className={cn(hasLiked && "fill-current")} /> {likes} Dukungan
    </button>
  )
}

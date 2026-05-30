'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getRelativeTime } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'

interface RealtimeCommentsProps {
  initialComments: any[]
  threadId: string
}

export function RealtimeComments({ initialComments, threadId }: RealtimeCommentsProps) {
  const [comments, setComments] = useState(initialComments)
  const supabase = createClient()

  // Sync if server revalidates
  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  useEffect(() => {
    const channel = supabase.channel(`public:comments:threadId=${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          // Fetch the new comment with author profile
          const { data: newComment } = await supabase
            .from('comments')
            .select('*, author:profiles(id, full_name, anon_token, avatar_url, role)')
            .eq('id', payload.new.id)
            .single()
            
          if (newComment) {
            setComments(prev => {
              // Avoid duplicates if optimistic UI already added it
              if ((prev as any[]).some(c => c.id === (newComment as any).id)) return prev
              return [...prev, newComment]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, supabase])

  if (!comments || comments.length === 0) {
    return (
      <div className="card-premium p-12 text-center text-[var(--text-muted)] italic">
         Belum ada komentar. Jadilah yang pertama memberikan tanggapan!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment: any) => {
        const commenterName = comment.is_anonymous
          ? `Anonim#${comment.author?.anon_token?.slice(0,4).toUpperCase()}`
          : comment.author?.full_name

        return (
          <div key={comment.id} className="card-premium p-6 flex items-start gap-4 hover-lift animate-in fade-in slide-in-from-bottom-2">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--cream-dark)] to-[var(--cream)] flex items-center justify-center text-[var(--brown-dark)] font-bold shrink-0 shadow-sm border border-white">
                {commenterName?.charAt(0) || '?'}
             </div>
             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                   <span className="font-bold text-sm text-[var(--brown-dark)]">{commenterName}</span>
                   {comment.author?.role === 'konselor' && (
                     <span className="px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] text-[9px] font-black uppercase tracking-widest">
                        Konselor
                     </span>
                   )}
                   <span className="text-[10px] text-[var(--text-muted)] opacity-50">•</span>
                   <span className="text-[10px] text-[var(--text-muted)] font-medium">
                     {getRelativeTime(comment.created_at)}
                   </span>
                </div>
                <p className="text-sm text-[var(--text)] leading-relaxed">{comment.content}</p>
             </div>
          </div>
        )
      })}
    </div>
  )
}

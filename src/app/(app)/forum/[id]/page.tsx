// src/app/forum/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  MessageSquare, 
  ArrowLeft, 
  Clock, 
  User, 
  Share2, 
  Flag,
  ChevronRight,
  TrendingUp,
  Heart
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

import { CommentForm } from './comment-form'
import { LikeButton } from '@/components/forum/like-button'
import { RealtimeComments } from '@/components/forum/realtime-comments'

export const dynamic = 'force-dynamic'

export default async function ThreadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Fetch thread with author and category
  const { data: thread } = await supabase
    .from('threads')
    .select(`
      *,
      author:profiles(id, full_name, anon_token, avatar_url, role),
      category:thread_categories(*)
    `)
    .eq('id', params.id)
    .single()

  if (!thread) notFound()

  // Increment view count (simple implementation)
  const threadData = thread as any
  try {
    await (supabase as any).rpc('increment_thread_views', { thread_id: params.id })
  } catch (e) {
    // Fallback if RPC fails
    await (supabase.from('threads') as any).update({ view_count: (threadData.view_count ?? 0) + 1 }).eq('id', params.id)
  }

  // Fetch comments
  const { data: comments } = await supabase
    .from('comments')
    .select(`
      *,
      author:profiles(id, full_name, anon_token, avatar_url, role)
    `)
    .eq('thread_id', params.id)
    .order('created_at', { ascending: true })

  // Fetch likes
  const { count: likeCount } = await supabase
    .from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('content_type', 'thread')
    .eq('content_id', params.id)

  const { data: { user } } = await supabase.auth.getUser()
  
  let hasLiked = false
  if (user) {
    const { data: existingLike } = await supabase
      .from('reactions')
      .select('id')
      .eq('content_type', 'thread')
      .eq('content_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existingLike) hasLiked = true
  }

  const displayName = threadData.is_anonymous
    ? `Anonim#${(threadData.author as any)?.anon_token?.slice(0,4).toUpperCase()}`
    : (threadData.author as any)?.full_name

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between">
         <Link href="/forum" className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group">
            <div className="w-8 h-8 rounded-full bg-white border border-[var(--cream-dark)] flex items-center justify-center group-hover:bg-[var(--terra)] group-hover:text-white transition-all">
               <ArrowLeft size={16} />
            </div>
            Kembali ke Forum
         </Link>
         <div className="flex items-center gap-2">
            <button className="btn-icon text-[var(--text-muted)]"><Share2 size={18} /></button>
            <button className="btn-icon text-[var(--danger)]"><Flag size={18} /></button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
           {/* Thread Content */}
           <article className="card-premium overflow-hidden">
              <div className="p-8 md:p-10 space-y-6">
                 {/* Metadata */}
                 <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg",
                      threadData.is_anonymous ? "bg-slate-400" : "bg-gradient-to-br from-[var(--terra)] to-[var(--brown)]"
                    )}>
                      {threadData.is_anonymous ? "🔒" : (threadData.author as any)?.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-[var(--brown-dark)]">{displayName}</span>
                          {(threadData.author as any)?.role === 'konselor' && (
                             <span className="px-2 py-0.5 rounded-full bg-[var(--sage)]/10 text-[var(--sage)] text-[9px] font-black uppercase">Konselor</span>
                          )}
                       </div>
                       <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-medium">
                          <span className="flex items-center gap-1"><Clock size={12} /> {getRelativeTime(threadData.created_at)}</span>
                          <span>•</span>
                          <span 
                            className="font-bold"
                            style={{ color: (threadData.category as any)?.color }}
                          >
                            {(threadData.category as any)?.name}
                          </span>
                       </div>
                    </div>
                 </div>

                 <h1 className="font-[var(--font-playfair)] text-3xl md:text-4xl font-black text-[var(--brown-dark)] leading-tight">
                    {threadData.title}
                 </h1>

                 <div className="prose prose-stone max-w-none text-[var(--text)] text-lg leading-relaxed whitespace-pre-wrap">
                    {threadData.content}
                 </div>

                 {/* Interaction Bar */}
                 <div className="pt-8 border-t border-[var(--cream-dark)] flex items-center gap-6">
                    <LikeButton 
                       threadId={params.id}
                       initialLikes={likeCount}
                       initialHasLiked={hasLiked}
                    />
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-bold text-sm">
                       <MessageSquare size={20} /> {comments?.length ?? 0} Komentar
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-[var(--text-muted)] font-bold text-sm">
                       <TrendingUp size={20} /> {threadData.view_count} Views
                    </div>
                 </div>
              </div>
           </article>

           {/* Comments Section */}
           <section className="space-y-6">
              <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)] px-2">
                 Komentar ({comments?.length ?? 0})
              </h2>

              {/* Comment Input */}
              <CommentForm threadId={params.id} isAnonymousDefault={threadData.is_anonymous} />

              <RealtimeComments initialComments={comments || []} threadId={params.id} />
           </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-8">
           <section className="card-premium p-6 bg-[var(--brown-dark)] text-white">
              <h3 className="font-[var(--font-playfair)] text-xl font-bold mb-4">Butuh Konseling Pribadi?</h3>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                 Jika topik ini berat bagi Anda, konselor kami siap membantu secara privat dan rahasia.
              </p>
              <Link href="/chat" className="block w-full py-3 bg-[var(--terra)] text-center text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--terra-light)] transition-all">
                 Mulai Chat Private
              </Link>
           </section>

           <section className="card-premium p-6 space-y-4">
              <h3 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} /> Topik Serupa
              </h3>
              <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                    <Link key={i} href="#" className="block group">
                       <h4 className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--terra)] transition-colors line-clamp-2">
                          Bagaimana cara tetap fokus berdoa di tengah tugas kuliah?
                       </h4>
                       <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)] font-medium">
                          <span>34 Komentar</span>
                          <span>•</span>
                          <span>2 Jam yang lalu</span>
                       </div>
                    </Link>
                 ))}
              </div>
           </section>
        </aside>
      </div>
    </div>
  )
}

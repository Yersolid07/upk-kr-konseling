// src/app/forum/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/profile/Avatar'
import { 
  MessageSquare, 
  ArrowLeft, 
  Clock, 
  User, 
  Share2, 
  Flag,
  ChevronRight,
  TrendingUp,
  Heart,
  Lock
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'
import { getThread, listComments } from '@/lib/public-content'

import { CommentForm } from './comment-form'
import { LikeButton } from '@/components/forum/like-button'
import { RealtimeComments } from '@/components/forum/realtime-comments'
import { ReportButton } from '@/components/reports/report-button'

export const dynamic = 'force-dynamic'

export default async function ThreadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Untuk menyembunyikan tombol "Laporkan" pada konten sendiri. Server Action
  // tetap menolak laporan atas konten sendiri, jadi ini hanya kenyamanan.
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser()
  const currentUserId = viewer?.id ?? null

  // Thread + komentar lewat helper yang menyembunyikan identitas penulis
  // anonim (author_id NULL, label pseudonim per-konten).
  const thread = await getThread(supabase, params.id)
  if (!thread) notFound()

  // Increment view count. RPC-nya kini ada di database (phase1-data-security.sql)
  // dan SECURITY DEFINER, jadi pengunjung yang bukan penulis pun berhasil.
  // Tidak ada fallback update langsung — update itu dulu ditolak RLS dan
  // berisiko menghitung ganda.
  await supabase.rpc('increment_thread_views', { thread_id: params.id })

  const comments = await listComments(supabase, params.id)

  const threadData = thread

  // Fetch likes
  const { count: likeCount } = await supabase
    .from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('content_type', 'thread')
    .eq('content_id', params.id)

  // Related threads — same category, excluding this one. Falls back to the
  // newest threads when the category has nothing else, so the sidebar is never
  // filled with invented titles.
  const relatedQuery = supabase
    .from('threads')
    .select('id, title, comment_count, created_at')
    .neq('id', params.id)
    .order('created_at', { ascending: false })
    .limit(3)
  const { data: relatedData } = threadData.category_id
    ? await relatedQuery.eq('category_id', threadData.category_id)
    : await relatedQuery
  const related = (relatedData ?? []) as { id: string; title: string; comment_count: number; created_at: string }[]

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

  const displayName = threadData.author.label

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
                    {threadData.is_anonymous ? (
                      <div className="w-14 h-14 rounded-2xl bg-slate-400 flex items-center justify-center text-white shadow-lg shrink-0">
                        <Lock size={22} />
                      </div>
                    ) : (
                      <Avatar
                        src={(threadData.author as any)?.avatarUrl}
                        name={displayName}
                        size="lg"
                        className="!rounded-2xl shadow-lg"
                      />
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-[var(--brown-dark)]">{displayName}</span>
                          {threadData.author.role === 'konselor' && (
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
                          {threadData.editedByStaff && (
                            <>
                              <span>•</span>
                              <span className="italic">diedit moderator</span>
                            </>
                          )}
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
                    <ReportButton
                      contentType="thread"
                      contentId={params.id}
                      isOwn={Boolean(currentUserId && threadData.authorId === currentUserId)}
                    />
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
              {related.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Belum ada diskusi lain di kategori ini. Jadilah yang pertama memulai.
                </p>
              ) : (
                <div className="space-y-4">
                   {related.map((item) => (
                      <Link key={item.id} href={`/forum/${item.id}`} className="block group">
                         <h4 className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--terra)] transition-colors line-clamp-2">
                            {item.title}
                         </h4>
                         <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)] font-medium">
                            <span>{item.comment_count ?? 0} Komentar</span>
                            <span>•</span>
                            <span>{getRelativeTime(item.created_at)}</span>
                         </div>
                      </Link>
                   ))}
                </div>
              )}
           </section>
        </aside>
      </div>
    </div>
  )
}

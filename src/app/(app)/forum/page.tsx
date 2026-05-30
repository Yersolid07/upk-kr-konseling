// src/app/forum/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  MessageSquare, 
  Search, 
  Filter, 
  PlusCircle, 
  Users, 
  Clock, 
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ForumPage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string; q?: string }
}) {
  const supabase = createClient()
  const { category, sort = 'latest', q } = searchParams

  // Fetch Categories
  const { data: categories } = await supabase
    .from('thread_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  // Build Query
  let query = supabase
    .from('threads')
    .select(`
      id, title, content, is_anonymous, created_at, comment_count, view_count,
      author:profiles(id, full_name, anon_token),
      category:thread_categories(name, slug, icon, color)
    `)
    .eq('is_flagged', false)

  if (category) {
    query = query.eq('category.slug', category)
  }

  if (q) {
    query = query.ilike('title', `%${q}%`)
  }

  if (sort === 'latest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'popular') {
    query = query.order('view_count', { ascending: false })
  }

  const { data: threads } = await query.limit(20)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-[var(--cream-dark)]">
        <div>
          <h1 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--brown-dark)]">Forum Komunitas</h1>
          <p className="text-sm text-[var(--text-muted)]">Ruang aman untuk berbagi cerita dan saling menguatkan.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <form action="/forum" method="GET" className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Cari topik..." 
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--cream)] border-none rounded-xl text-sm focus:ring-2 focus:ring-[var(--terra)]/20 transition-all"
            />
          </form>
          <Link href="/forum/new" className="btn-primary !w-auto flex items-center gap-2 whitespace-nowrap">
            <PlusCircle size={18} />
            Buat Thread
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Categories & Filters */}
        <aside className="lg:col-span-1 space-y-6">
          <section className="card-premium p-5">
            <h2 className="font-bold text-[var(--brown-dark)] text-sm mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Filter size={14} /> Kategori
            </h2>
            <div className="space-y-1">
              <Link 
                href="/forum"
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all hover:bg-[var(--cream)]",
                  !category ? "bg-[var(--terra)]/10 text-[var(--terra)] font-bold shadow-sm" : "text-[var(--text-muted)]"
                )}
              >
                <span>🌐</span> Semua Kategori
              </Link>
              {(categories as any[])?.map((cat: any) => (
                <Link 
                  key={cat.id}
                  href={`/forum?category=${cat.slug}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all hover:bg-[var(--cream)]",
                    category === cat.slug ? "bg-[var(--terra)]/10 text-[var(--terra)] font-bold shadow-sm" : "text-[var(--text-muted)]"
                  )}
                >
                  <span>{cat.icon}</span> {cat.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="card-premium p-5">
             <h2 className="font-bold text-[var(--brown-dark)] text-sm mb-4 flex items-center gap-2 uppercase tracking-widest">
              <TrendingUp size={14} /> Pengaturan
            </h2>
            <div className="grid grid-cols-1 gap-2">
               <Link href="/forum?sort=latest" className={cn("text-xs px-3 py-2 rounded-lg text-center font-bold border transition-all", sort === 'latest' ? "bg-[var(--brown-dark)] text-white border-[var(--brown-dark)]" : "border-[var(--cream-dark)] text-[var(--text-muted)] hover:bg-[var(--cream)]")}>Terbaru</Link>
               <Link href="/forum?sort=popular" className={cn("text-xs px-3 py-2 rounded-lg text-center font-bold border transition-all", sort === 'popular' ? "bg-[var(--brown-dark)] text-white border-[var(--brown-dark)]" : "border-[var(--cream-dark)] text-[var(--text-muted)] hover:bg-[var(--cream)]")}>Terpopuler</Link>
            </div>
          </section>
        </aside>

        {/* Main: Thread List */}
        <div className="lg:col-span-3 space-y-4">
          {threads?.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-[var(--cream-dark)]">
              <MessageSquare className="mx-auto text-[var(--cream-dark)] mb-4" size={48} />
              <p className="text-[var(--text-muted)] font-medium">Belum ada diskusi di kategori ini.</p>
              <Link href="/forum/new" className="text-[var(--terra)] text-sm font-bold mt-2 inline-block">Mulai diskusi pertama!</Link>
            </div>
          ) : (threads as any[])?.map((thread: any) => {
            const displayName = thread.is_anonymous
              ? `Anonim#${(thread.author as any)?.anon_token?.slice(0,4).toUpperCase()}`
              : (thread.author as any)?.full_name
            
            return (
              <Link 
                key={thread.id} 
                href={`/forum/${thread.id}`}
                className="block card-premium p-6 hover-lift group"
              >
                <div className="flex gap-5">
                  {/* Author Avatar */}
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0 transition-transform group-hover:rotate-3",
                    thread.is_anonymous ? "bg-slate-400" : "bg-gradient-to-br from-[var(--terra)] to-[var(--brown)]"
                  )}>
                    {thread.is_anonymous ? "🔒" : (thread.author as any)?.full_name?.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                       <span 
                        className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
                        style={{ backgroundColor: `${(thread.category as any)?.color}15`, color: (thread.category as any)?.color }}
                       >
                         {(thread.category as any)?.name}
                       </span>
                       <span className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                         <Clock size={12} /> {getRelativeTime(thread.created_at)}
                       </span>
                    </div>

                    <h2 className="text-xl font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors mb-2 leading-tight">
                      {thread.title}
                    </h2>
                    
                    <p className="text-[var(--text-muted)] text-sm line-clamp-2 mb-4 leading-relaxed">
                      {thread.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-[var(--cream-dark)] pt-4">
                      <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5 hover:text-[var(--brown)] transition-colors">
                          <Users size={14} /> {displayName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MessageSquare size={14} /> {thread.comment_count} Komentar
                        </span>
                        <span className="flex items-center gap-1.5">
                          <TrendingUp size={14} /> {thread.view_count} Dilihat
                        </span>
                      </div>
                      
                      <div className="w-8 h-8 rounded-full bg-[var(--cream)] flex items-center justify-center text-[var(--terra)] group-hover:bg-[var(--terra)] group-hover:text-white transition-all">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

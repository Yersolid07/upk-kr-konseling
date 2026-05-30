// src/app/renungan/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Calendar,
  Share2,
  Bookmark,
  ChevronRight
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ArticleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  // Fetch article with author and category
  const { data: article } = await supabase
    .from('articles')
    .select(`
      *,
      author:profiles(id, full_name, avatar_url, role),
      category:thread_categories(*)
    `)
    .eq('id', params.id)
    .single()

  if (!article) notFound()

  // Increment read count
  await (supabase.from('articles') as any).update({ read_count: ((article as any).read_count ?? 0) + 1 }).eq('id', params.id)

  const articleData = article as any

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Navigation */}
      <div className="flex items-center justify-between">
         <Link href="/renungan" className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group">
            <div className="w-8 h-8 rounded-full bg-white border border-[var(--cream-dark)] flex items-center justify-center group-hover:bg-[var(--terra)] group-hover:text-white transition-all">
               <ArrowLeft size={16} />
            </div>
            Kembali ke Renungan
         </Link>
         <button className="btn-icon text-[var(--text-muted)]"><Share2 size={18} /></button>
      </div>

      <article className="space-y-10">
         {/* Header */}
         <div className="space-y-6">
            <div className="flex items-center gap-3">
               <span 
                 className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                 style={{ backgroundColor: `${(articleData.category as any)?.color}15`, color: (articleData.category as any)?.color }}
               >
                  {(articleData.category as any)?.name || 'Renungan'}
               </span>
               <span className="text-[var(--text-muted)] opacity-30">•</span>
               <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} /> {articleData.read_count || 0} Pembaca
               </span>
            </div>

            <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-black text-[var(--brown-dark)] leading-tight">
               {articleData.title}
            </h1>

            <div className="flex items-center gap-6 pt-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--cream-dark)] flex items-center justify-center text-[var(--brown)] font-bold text-sm">
                     {(articleData.author as any)?.full_name?.charAt(0)}
                  </div>
                  <div>
                     <div className="text-sm font-bold text-[var(--brown-dark)]">{(articleData.author as any)?.full_name}</div>
                     <div className="text-[10px] text-[var(--text-muted)] font-medium">Penulis / Kontributor</div>
                  </div>
               </div>
               <div className="w-px h-8 bg-[var(--cream-dark)]" />
               <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Calendar size={14} />
                  <span className="text-xs font-medium">{new Date(articleData.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
               </div>
            </div>
         </div>

         {/* Cover Image */}
         {articleData.cover_url && (
            <div className="aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl">
               <img 
                 src={articleData.cover_url} 
                 className="w-full h-full object-cover"
                 alt={articleData.title}
               />
            </div>
         )}

         {/* Content */}
         <div className="prose prose-stone prose-lg max-w-none text-[var(--text)] leading-relaxed whitespace-pre-wrap font-[var(--font-dm-sans)]">
            {articleData.content}
         </div>

         {/* Footer / Call to Action */}
         <div className="pt-12 border-t border-[var(--cream-dark)]">
            <div className="card-premium p-10 bg-[var(--brown-dark)] text-white flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
               <div className="space-y-2">
                  <h3 className="font-[var(--font-playfair)] text-2xl font-bold">Terberkati dengan artikel ini?</h3>
                  <p className="text-white/60 text-sm">Bagikan ke teman-teman alumni lainnya agar mereka juga dikuatkan.</p>
               </div>
               <div className="flex items-center gap-4">
                  <button className="px-8 py-3 bg-[var(--terra)] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--terra-light)] transition-all">Share Sekarang</button>
                  <button className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                     <Bookmark size={20} />
                  </button>
               </div>
            </div>
         </div>
      </article>

      {/* Suggested Articles */}
      <section className="space-y-6 pt-12">
         <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">Artikel Lainnya</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
               <div key={i} className="card-premium p-4 flex gap-4 group cursor-pointer">
                  <div className="w-24 h-24 rounded-2xl bg-[var(--cream)] overflow-hidden shrink-0">
                     <img src={`https://picsum.photos/seed/${i+50}/200`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <h4 className="text-sm font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors line-clamp-2">
                        Pentingnya Komunitas dalam Pertumbuhan Iman Sehari-hari
                     </h4>
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">Renungan • 3 Menit</span>
                        <ChevronRight size={14} className="text-[var(--terra)] opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </section>
    </div>
  )
}

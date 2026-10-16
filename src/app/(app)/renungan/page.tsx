// src/app/renungan/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { 
  Book, 
  BookOpen,
  Clock, 
  User, 
  ChevronRight,
  TrendingUp,
  Bookmark,
  Plus
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function RenunganPage() {
  const supabase = createClient()

  // Fetch articles
  const { data: articles } = await supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      cover_url, 
      created_at,
      author:profiles(full_name),
      category:thread_categories(name)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(10)

  const list = (articles ?? []) as any[]
  const featured = list[0]

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Featured Header */}
      <section className="relative min-h-[320px] sm:h-[400px] rounded-[1.5rem] overflow-hidden flex items-end p-6 sm:p-10 md:p-16 bg-[var(--brown-dark)]">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brown-dark)] via-[var(--brown-dark)]/40 to-transparent z-10" />
        {featured?.cover_url ? (
          <img
            src={featured.cover_url}
            className="absolute inset-0 w-full h-full object-cover"
            alt={featured.title}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--brown-dark)] via-[var(--brown)] to-[var(--terra)]/60" />
        )}

        <div className="relative z-20 space-y-4 max-w-2xl">
           <div className="inline-block px-3 py-1 rounded-full bg-[var(--gold)] text-[var(--brown-dark)] text-[10px] font-black uppercase tracking-widest">
             {featured ? 'Renungan Utama' : 'Selamat Datang'}
           </div>
              <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                {featured?.title || 'Bagikan Renungan Pertama Anda'}
              </h1>
           <div className="flex items-center gap-4 text-white/70 text-sm font-medium">
              <span className="flex items-center gap-1.5"><User size={14} /> {featured?.author?.full_name || 'Tim IKA UPK-Kr FT UNSRAT'}</span>
              {featured && <span className="flex items-center gap-1.5"><Clock size={14} /> {Math.max(1, Math.ceil((featured.content?.length || 0) / 1000))} Menit Baca</span>}
           </div>
           {featured && (
             <Link href={`/renungan/${featured.id}`} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--brown-dark)] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--cream)] transition-all">
               Baca Selengkapnya <ChevronRight size={16} />
             </Link>
           )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--brown-dark)] flex items-center gap-3">
              <Book className="text-[var(--terra)]" /> Artikel & Renungan
            </h2>
            <Link href="/renungan/new" className="px-6 py-3 bg-[var(--terra)] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--terra-light)] transition-all shadow-lg shadow-[var(--terra)]/20 active:scale-95 flex items-center gap-2">
              <Plus size={16} /> Tulis Artikel
            </Link>
          </div>

          {!articles || articles.length === 0 ? (
            <div className="card-premium p-12 text-center text-[var(--text-muted)]">
              Belum ada artikel yang dipublikasikan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(articles as any[]).map((article) => (
                <Link key={article.id} href={`/renungan/${article.id}`} className="group space-y-4">
                  <div className="aspect-[16/10] rounded-2xl overflow-hidden relative shadow-lg bg-[var(--cream-dark)]">
                    {article.cover_url ? (
                      <img 
                        src={article.cover_url} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt={article.title}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--cream)] to-[var(--cream-dark)] text-[var(--text-muted)]">
                        <BookOpen size={32} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-black text-[var(--brown-dark)] uppercase tracking-wider shadow-sm">
                        {(article.category as any)?.name || 'Umum'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 px-2">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      <span>{new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      <span>•</span>
                      <span>{(article.author as any)?.full_name || 'Alumni'}</span>
                    </div>
                    <h3 className="font-[var(--font-playfair)] text-xl font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors leading-tight">
                      {article.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-10">
           {/* Artikel lain dari feed yang sama — dulu daftar ini hardcoded */}
           {list.length > 1 && (
             <section className="card-premium p-6 space-y-6">
                <h3 className="font-bold text-[var(--brown-dark)] text-sm flex items-center gap-2 uppercase tracking-[0.2em]">
                  <TrendingUp size={16} className="text-[var(--gold)]" /> Artikel Lainnya
                </h3>
                <div className="space-y-5">
                   {list.slice(1, 5).map((article) => (
                     <Link key={article.id} href={`/renungan/${article.id}`} className="flex gap-4 group">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--cream)] overflow-hidden shrink-0">
                           {article.cover_url ? (
                             <img src={article.cover_url} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                               <BookOpen size={20} />
                             </div>
                           )}
                        </div>
                        <div className="space-y-1 min-w-0">
                           <h4 className="text-xs font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors line-clamp-2">
                              {article.title}
                           </h4>
                           <span className="text-[10px] text-[var(--text-muted)] font-medium">
                              {getRelativeTime(article.created_at)}
                           </span>
                        </div>
                     </Link>
                   ))}
                </div>
             </section>
           )}

           {/* Ajakan menulis — menggantikan form newsletter yang tidak tersambung */}
           <section className="bg-[var(--terra)] rounded-[1.5rem] p-6 sm:p-8 text-white space-y-5 shadow-xl shadow-[var(--terra)]/20">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                 <Bookmark size={24} />
              </div>
              <div className="space-y-2">
                 <h3 className="font-[var(--font-playfair)] text-2xl font-bold">Punya Renungan?</h3>
                 <p className="text-white/80 text-sm leading-relaxed">
                    Bagikan apa yang Tuhan ajarkan kepadamu. Tulisanmu bisa menjadi kekuatan
                    bagi alumni lain yang sedang berjuang.
                 </p>
              </div>
              <Link
                href="/renungan/new"
                className="w-full py-3 bg-white text-[var(--terra)] font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-[var(--cream)] transition-all flex items-center justify-center gap-2"
              >
                 <Plus size={14} /> Tulis Sekarang
              </Link>
           </section>
        </aside>
      </div>
    </div>
  )
}

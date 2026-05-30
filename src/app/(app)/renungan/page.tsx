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

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* Featured Header */}
      <section className="relative h-[400px] rounded-[3rem] overflow-hidden flex items-end p-10 md:p-16">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brown-dark)] via-[var(--brown-dark)]/40 to-transparent z-10" />
        <img 
          src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover"
          alt="Featured Renungan"
        />
        
        <div className="relative z-20 space-y-4 max-w-2xl">
           <div className="inline-block px-3 py-1 rounded-full bg-[var(--gold)] text-[var(--brown-dark)] text-[10px] font-black uppercase tracking-widest">
             Renungan Utama
           </div>
           <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-black text-white leading-tight">
             Menemukan Kedamaian di Tengah Badai Akademik
           </h1>
           <div className="flex items-center gap-4 text-white/70 text-sm font-medium">
              <span className="flex items-center gap-1.5"><User size={14} /> Pdt. Dr. John Doe</span>
              <span className="flex items-center gap-1.5"><Clock size={14} /> 5 Menit Baca</span>
           </div>
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
                  <div className="aspect-[16/10] rounded-3xl overflow-hidden relative shadow-lg">
                    <img 
                      src={article.cover_url || 'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&q=80&w=800'} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={article.title}
                    />
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
           {/* Popular Content */}
           <section className="card-premium p-6 space-y-6">
              <h3 className="font-bold text-[var(--brown-dark)] text-sm flex items-center gap-2 uppercase tracking-[0.2em]">
                <TrendingUp size={16} className="text-[var(--gold)]" /> Terpopuler
              </h3>
              <div className="space-y-6">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex gap-4 group cursor-pointer">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--cream)] overflow-hidden shrink-0">
                         <img src={`https://picsum.photos/seed/${i+10}/200`} className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-1">
                         <h4 className="text-xs font-bold text-[var(--brown-dark)] group-hover:text-[var(--terra)] transition-colors line-clamp-2">
                            Pentingnya Menjaga Kesehatan Mental bagi Mahasiswa Teknik
                         </h4>
                         <span className="text-[10px] text-[var(--text-muted)] font-medium">1.2k Views</span>
                      </div>
                   </div>
                 ))}
              </div>
           </section>

           {/* Newsletter / Subscription */}
           <section className="bg-[var(--terra)] rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-[var(--terra)]/20">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                 <Bookmark size={24} />
              </div>
              <div className="space-y-2">
                 <h3 className="font-[var(--font-playfair)] text-2xl font-bold">Dapatkan Renungan Harian</h3>
                 <p className="text-white/80 text-sm leading-relaxed">
                    Berlangganan untuk menerima kata-kata penguatan langsung di email Anda setiap pagi.
                 </p>
              </div>
              <div className="space-y-3">
                 <input 
                   type="email" 
                   placeholder="Email Anda" 
                   className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20"
                 />
                 <button className="w-full py-3 bg-white text-[var(--terra)] font-black text-xs rounded-xl uppercase tracking-widest hover:bg-[var(--cream)] transition-all">
                    Berlangganan
                 </button>
              </div>
           </section>
        </aside>
      </div>
    </div>
  )
}

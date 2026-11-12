// src/app/(app)/renungan/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/profile/Avatar'
import { ShareButton } from './share-button'
import { ArrowLeft, Clock, Calendar, Share2, Bookmark } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ArticleDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: article } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      excerpt,
      content,
      cover_url,
      read_count,
      is_published,
      created_at,
      category:thread_categories(id, name, name_en, color),
      author:profiles(id, full_name, avatar_url, role)
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (!article || !article.is_published) notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            <Link
              href="/renungan"
              className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-white border border-[var(--cream-dark)] flex items-center justify-center group-hover:bg-[var(--terra)] group-hover:text-white transition-all">
                <ArrowLeft size={16} />
              </div>
              Kembali ke Renungan
            </Link>
            <ShareButton title={article.title} />

      <article className="space-y-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {article.category && (
              <span
                className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{
                  backgroundColor: `${article.category.color}18`,
                  color: article.category.color,
                }}
              >
                {article.category.name || 'Renungan'}
              </span>
            )}
            <span className="text-[var(--text-muted)] opacity-30">•</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={12} /> {article.read_count || 0} Pembaca
            </span>
          </div>

          <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-black text-[var(--brown-dark)] leading-tight">
            {article.title}
          </h1>

          <div className="flex items-center gap-6 pt-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={article.author?.avatar_url ?? null}
                name={article.author?.full_name ?? undefined}
                size="md"
              />
              <div>
                <div className="text-sm font-bold text-[var(--brown-dark)]">
                  {article.author?.full_name ?? 'Tim IKA'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-medium">
                  Penulis / Kontributor
                </div>
              </div>
            </div>
            <div className="w-px h-8 bg-[var(--cream-dark)]" />
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Calendar size={14} />
              <span className="text-xs font-medium">
                {new Date(article.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {article.cover_url && (
          <div className="aspect-[21/9] rounded-[1.5rem] overflow-hidden shadow-2xl">
            <img src={article.cover_url} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="prose prose-stone prose-lg max-w-none text-[var(--text)] leading-relaxed whitespace-pre-wrap font-[var(--font-dm-sans)]">
          {article.content}
        </div>

        <div className="pt-12 border-t border-[var(--cream-dark)]">
          <div className="card-premium p-10 text-white flex [--card-bg:var(--brown-dark)] flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="space-y-2">
              <h3 className="font-[var(--font-playfair)] text-2xl font-bold">Terberkati dengan artikel ini?</h3>
              <p className="text-white/60 text-sm">Bagikan ke teman-teman alumni lainnya agar mereka juga dikuatkan.</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-8 py-3 bg-[var(--terra)] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[var(--terra-light)] transition-all flex items-center gap-2">
                <Share2 size={14} />
                Share Sekarang
              </button>
              <button
                className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                aria-label="Simpan di koleksi"
              >
                <Bookmark size={20} />
              </button>
            </div>
          </div>
        </div>
      </article>

      <section className="space-y-6 pt-12">
        <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">Artikel Lainnya</h2>
        <RelatedArticles articleId={article.id} categoryId={article.category?.id} />
      </section>
    </div>
  )
}



async function RelatedArticles({ articleId, categoryId }: { articleId: string; categoryId?: string | null }) {
  const supabase = createClient()

  const { data } = await supabase
    .from('articles')
    .select('id, title, excerpt, cover_url, created_at, category:thread_categories(id, name, name_en, color)')
    .eq('is_published', true)
    .neq('id', articleId)
    .order('created_at', { ascending: false })
    .limit(4)

  const list = (data ?? []) as any[]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {list.map((article) => (
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
                <Bookmark size={32} />
              </div>
            )}
            {article.category && (
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-black text-[var(--brown-dark)] uppercase tracking-wider shadow-sm">
                  {article.category?.name || 'Umum'}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2 px-2">
            <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
              <span>{new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              <span>•</span>
              <span>{list.length > 0 ? 'Alumni' : 'Tim IKA'}</span>
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
  )
}

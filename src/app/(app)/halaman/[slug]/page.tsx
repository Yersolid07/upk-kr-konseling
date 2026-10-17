// src/app/(app)/halaman/[slug]/page.tsx
// Halaman statis yang isinya diedit admin (M10), tampil di dalam AppShell
// supaya navigasi tetap ada. Rute publik /legal/[slug] tetap dipakai untuk
// dokumen legal; ini untuk halaman seperti "Tentang", "FAQ", "Kontak".

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar } from 'lucide-react'
import { loadSitePage } from '@/lib/site-content'
import { renderMarkdown } from '@/lib/markdown'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = await loadSitePage(params.slug)
  return {
    title: page ? `${page.title} | IKA UPK-Kr FT UNSRAT` : 'Halaman | IKA UPK-Kr FT UNSRAT',
  }
}

export default async function SitePageView({ params }: { params: { slug: string } }) {
  const page = await loadSitePage(params.slug)
  if (!page) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 animate-fade-in pb-20">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali
      </Link>

      <header className="space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--cream-dark)] flex items-center justify-center text-[var(--terra)] shadow-sm">
          <FileText size={22} />
        </div>
        <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[var(--brown-dark)]">
          {page.title}
        </h1>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <Calendar size={11} />
          Diperbarui{' '}
          {new Date(page.updated_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      <article className="card-premium p-6 sm:p-10 bg-white/80 backdrop-blur-xl border border-white rounded-2xl">
        {renderMarkdown(page.content)}
      </article>
    </div>
  )
}

// src/app/legal/[slug]/page.tsx
// Halaman PUBLIK untuk dokumen legal (Syarat & Ketentuan, Kebijakan Privasi,
// Panduan Konselor) — sengaja di luar route group (app) supaya bisa dibaca
// tanpa login. Isi utama dibaca dari tabel legal_documents sehingga super admin
// bisa memperbarui tanpa deploy ulang; bila tabel belum ada (migrasi
// cms-rbac.sql belum dijalankan) atau dokumen belum diisi, dipakai konten
// bawaan dari src/content/legal.ts supaya halaman ini TIDAK PERNAH 404.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar, GitBranch } from 'lucide-react'
import { renderMarkdown } from '@/lib/markdown'
import { getFallbackLegal } from '@/content/legal'
import type { LegalDocument } from '@/types/database'

export const dynamic = 'force-dynamic'

type Doc = Pick<
  LegalDocument,
  'slug' | 'title' | 'summary' | 'content' | 'version' | 'effective_date'
>

async function loadDoc(slug: string): Promise<Doc | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('legal_documents')
      .select('slug, title, summary, content, version, effective_date')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()

    // error = tabel belum ada / RLS menolak → pakai bawaan.
    if (error || !data) return getFallbackLegal(slug)
    return data as Doc
  } catch {
    return getFallbackLegal(slug)
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const d = await loadDoc(params.slug)
  return {
    title: d ? `${d.title} | IKA UPK-Kr FT UNSRAT` : 'Dokumen | IKA UPK-Kr FT UNSRAT',
    description: d?.summary ?? undefined,
  }
}

export default async function LegalPage({ params }: { params: { slug: string } }) {
  const doc = await loadDoc(params.slug)
  if (!doc) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--cream)] via-white to-[var(--cream)]">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-14 sm:py-20 space-y-6 animate-fade-in">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali
        </Link>

        <header className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[var(--cream-dark)] flex items-center justify-center text-[var(--terra)] shadow-sm">
            <FileText size={26} />
          </div>
          <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[var(--brown-dark)]">
            {doc.title}
          </h1>
          {doc.summary && <p className="text-[var(--text-muted)] leading-relaxed">{doc.summary}</p>}

          <div className="flex items-center gap-4 flex-wrap text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5">
              <GitBranch size={12} /> Versi {doc.version}
            </span>
            {doc.effective_date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={12} />
                Berlaku {new Date(doc.effective_date).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            )}
          </div>
        </header>

        <article className="card-premium p-6 sm:p-10 bg-white/80 backdrop-blur-xl border border-white rounded-2xl">
          {renderMarkdown(doc.content)}
        </article>

        <footer className="text-center text-xs text-[var(--text-muted)] pt-4 pb-8">
          Dokumen ini dapat diperbarui. Perubahan material akan diberitahukan melalui notifikasi
          aplikasi.
        </footer>
      </div>
    </div>
  )
}

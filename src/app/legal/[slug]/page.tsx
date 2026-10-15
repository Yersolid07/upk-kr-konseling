// src/app/legal/[slug]/page.tsx
// Halaman PUBLIK untuk dokumen legal (Syarat & Ketentuan, Kebijakan Privasi,
// Panduan Konselor) — sengaja di luar route group (app) supaya bisa dibaca
// tanpa login. Isinya dibaca dari tabel legal_documents sehingga super admin
// bisa memperbarui tanpa deploy ulang.

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar, GitBranch } from 'lucide-react'
import { renderMarkdown } from '@/lib/markdown'
import type { LegalDocument } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data } = await supabase
    .from('legal_documents')
    .select('title, summary')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .maybeSingle()

  const d = data as { title: string; summary: string | null } | null
  return {
    title: d ? `${d.title} | UPK-Kr. Konseling` : 'Dokumen | UPK-Kr. Konseling',
    description: d?.summary ?? undefined,
  }
}

export default async function LegalPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .maybeSingle()

  const doc = data as LegalDocument | null
  if (!doc) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali
      </Link>

      <header className="space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--cream)] border border-[var(--cream-dark)] flex items-center justify-center text-[var(--terra)]">
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

      <article className="card-premium p-6 sm:p-10">{renderMarkdown(doc.content)}</article>

      <footer className="text-center text-xs text-[var(--text-muted)] pt-4">
        Dokumen ini dapat diperbarui. Perubahan material akan diberitahukan melalui notifikasi
        aplikasi.
      </footer>
    </div>
  )
}

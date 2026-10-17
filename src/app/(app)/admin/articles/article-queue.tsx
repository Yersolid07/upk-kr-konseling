// src/app/(app)/admin/articles/article-queue.tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Check, X, Archive, Loader2, Clock, FileText, ExternalLink,
  ChevronDown, AlertTriangle, ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { approveArticle, rejectArticle, archiveArticle } from '../_shared/article-actions'
import type { Article } from '@/types/database'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'Menunggu Tinjauan', cls: 'bg-[var(--gold)]/15 text-[var(--brown-dark)]' },
  draft:          { label: 'Draf',              cls: 'bg-[var(--cream-dark)] text-[var(--text-muted)]' },
  published:      { label: 'Terbit',            cls: 'bg-[var(--sage)]/15 text-[var(--sage)]' },
  rejected:       { label: 'Ditolak',           cls: 'bg-red-50 text-red-600' },
  archived:       { label: 'Diarsipkan',        cls: 'bg-[var(--cream-dark)] text-[var(--text-muted)]' },
}

export function ArticleQueue({ pending, published }: { pending: Article[]; published: Article[] }) {
  const [pendingList, setPendingList] = useState(pending)
  const [busy, startTransition] = useTransition()

  function act(
    fn: (fd: FormData) => Promise<unknown>,
    id: string,
    notes: string | null,
    doneMsg: string
  ) {
    const fd = new FormData()
    fd.set('id', id)
    if (notes) fd.set('review_notes', notes)

    startTransition(async () => {
      const res = (await fn(fd)) as { error?: string; success?: string } | undefined
      if (res?.error) {
        toast.error(res.error)
        return
      }
      setPendingList((prev) => prev.filter((a) => a.id !== id))
      toast.success(res?.success ?? doneMsg)
    })
  }

  return (
    <div className="space-y-8">
      {/* Antrean */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[var(--gold)]" />
          <h2 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-wider">
            Menunggu Persetujuan ({pendingList.length})
          </h2>
        </div>

        {pendingList.length === 0 ? (
          <div className="card-premium p-10 text-center space-y-2">
            <ShieldCheck size={28} className="text-[var(--sage)] mx-auto" />
            <p className="text-sm text-[var(--text-muted)]">
              Tidak ada artikel yang menunggu. Antrean bersih.
            </p>
          </div>
        ) : (
          pendingList.map((a) => <ReviewCard key={a.id} article={a} onAct={act} busy={busy} />)
        )}
      </section>

      {/* Riwayat */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--terra)]" />
          <h2 className="font-bold text-[var(--brown-dark)] text-sm uppercase tracking-wider">
            Riwayat Terbit & Arsip ({published.length})
          </h2>
        </div>

        {published.length === 0 ? (
          <div className="card-premium p-8 text-center text-sm text-[var(--text-muted)]">
            Belum ada artikel yang pernah diterbitkan.
          </div>
        ) : (
          <div className="card-premium divide-y divide-[var(--cream-dark)]">
            {published.map((a) => {
              const meta = STATUS_META[a.status] ?? STATUS_META.draft
              return (
                <div key={a.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', meta.cls)}>
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {a.author?.full_name ?? 'Tanpa nama'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[var(--brown-dark)] mt-1 line-clamp-1">
                      {a.title}
                    </p>
                    {a.review_notes && a.status === 'rejected' && (
                      <p className="text-[11px] text-red-600 mt-1 line-clamp-2">
                        Catatan: {a.review_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/renungan/${a.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--cream)] text-[var(--brown)] text-[11px] font-bold border border-[var(--cream-dark)] hover:border-[var(--terra)] transition-all"
                    >
                      <ExternalLink size={12} /> Lihat
                    </Link>
                    {a.status === 'published' && (
                      <button
                        disabled={busy}
                        onClick={() => act(archiveArticle, a.id, null, 'Artikel diarsipkan.')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--cream)] text-[var(--text-muted)] text-[11px] font-bold border border-[var(--cream-dark)] hover:border-[var(--terra)] transition-all disabled:opacity-50"
                      >
                        <Archive size={12} /> Arsipkan
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function ReviewCard({
  article,
  onAct,
  busy,
}: {
  article: Article
  onAct: (fn: (fd: FormData) => Promise<unknown>, id: string, notes: string | null, msg: string) => void
  busy: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [notes, setNotes] = useState('')

  return (
    <article className="card-premium p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h3 className="font-[var(--font-playfair)] text-lg font-bold text-[var(--brown-dark)]">
            {article.title}
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            {article.author?.full_name ?? 'Tanpa nama'} ·{' '}
            {new Date(article.created_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--terra)] uppercase tracking-wider"
        >
          {expanded ? 'Tutup' : 'Baca'}
          <ChevronDown size={13} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {article.excerpt && !expanded && (
        <p className="text-sm text-[var(--text-muted)] line-clamp-2">{article.excerpt}</p>
      )}

      {expanded && (
        <div className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar p-4 rounded-xl bg-[var(--cream)]/50 border border-[var(--cream-dark)]">
          {article.content}
        </div>
      )}

      {rejecting && (
        <div className="space-y-2 p-4 rounded-xl bg-red-50/60 border border-red-200">
          <label className="flex items-center gap-2 text-xs font-bold text-red-700">
            <AlertTriangle size={13} /> Alasan penolakan (dikirim ke penulis)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="mis. Perlu tambahan rujukan ayat dan perbaikan struktur paragraf."
            className="form-input text-sm resize-none"
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--cream-dark)]">
        <button
          disabled={busy}
          onClick={() => onAct(approveArticle, article.id, notes || null, 'Artikel diterbitkan.')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--sage)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Setujui & Terbitkan
        </button>

        {!rejecting ? (
          <button
            disabled={busy}
            onClick={() => setRejecting(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
          >
            <X size={13} /> Tolak
          </button>
        ) : (
          <>
            <button
              disabled={busy || !notes.trim()}
              onClick={() => onAct(rejectArticle, article.id, notes, 'Artikel dikembalikan ke penulis.')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Kirim Penolakan
            </button>
            <button
              onClick={() => { setRejecting(false); setNotes('') }}
              className="px-4 py-2.5 rounded-xl text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider hover:text-[var(--brown-dark)]"
            >
              Batal
            </button>
          </>
        )}

        <Link
          href={`/renungan/${article.id}`}
          target="_blank"
          className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--terra)] uppercase tracking-wider"
        >
          <ExternalLink size={12} /> Pratinjau
        </Link>
      </div>
    </article>
  )
}

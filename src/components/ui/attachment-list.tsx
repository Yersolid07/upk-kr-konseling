// src/components/ui/attachment-list.tsx
// Menampilkan lampiran sebuah postingan. Server component — tidak butuh state.

import { FileText, Link2, Music, Download, ExternalLink } from 'lucide-react'
import type { Attachment } from '@/types/database'

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function AttachmentList({ items, className }: { items?: Attachment[] | null; className?: string }) {
  if (!items || items.length === 0) return null

  const media = items.filter((a) => a.kind === 'image' || a.kind === 'video' || a.kind === 'embed')
  const files = items.filter((a) => a.kind !== 'image' && a.kind !== 'video' && a.kind !== 'embed')

  return (
    <div className={className ?? 'space-y-3'}>
      {media.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {media.map((a) => (
            <figure key={a.id} className="rounded-2xl overflow-hidden border border-[var(--cream-dark)] bg-white">
              {a.kind === 'image' ? (
                <img src={a.url} alt={a.title ?? ''} className="w-full h-auto object-cover" loading="lazy" />
              ) : (
                <div className="aspect-video">
                  <iframe
                    src={a.url}
                    title={a.title ?? 'Lampiran'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              )}
              {a.title && (
                <figcaption className="px-3 py-2 text-[11px] text-[var(--text-muted)] font-medium truncate">
                  {a.title}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((a) => (
            <li key={a.id}>
              {a.kind === 'audio' ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[var(--cream-dark)]">
                  <Music size={18} className="text-[var(--terra)] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--brown-dark)] truncate">{a.title ?? 'Audio'}</p>
                    <audio src={a.url} controls preload="none" className="w-full mt-1.5 h-8" />
                  </div>
                </div>
              ) : (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[var(--cream-dark)] hover:border-[var(--terra)] transition-colors group"
                >
                  <span className="w-9 h-9 rounded-lg bg-[var(--cream)] flex items-center justify-center text-[var(--brown)] shrink-0">
                    {a.kind === 'link' ? <Link2 size={16} /> : <FileText size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[var(--brown-dark)] truncate">
                      {a.title ?? (a.kind === 'link' ? hostOf(a.url) : 'Dokumen')}
                    </span>
                    <span className="block text-[10px] text-[var(--text-muted)] truncate">
                      {a.kind === 'link' ? hostOf(a.url) : 'Ketuk untuk membuka'}
                    </span>
                  </span>
                  {a.kind === 'link' ? (
                    <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-[var(--terra)] shrink-0" />
                  ) : (
                    <Download size={14} className="text-[var(--text-muted)] group-hover:text-[var(--terra)] shrink-0" />
                  )}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

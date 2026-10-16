// src/components/ui/attachment-list.tsx
// Menampilkan lampiran sebuah postingan. Server component — tidak butuh state.
//
// KEAMANAN: nilai `a.url` berasal dari database dan TIDAK boleh dipercaya.
// Sebelumnya URL itu dipasang langsung ke <iframe src> dan <img src>, sehingga
// lampiran `kind: 'embed'` dengan URL sembarang (atau `javascript:`) bisa
// disisipkan lewat REST API — allowlist host embed hanya ada di klien.
// Sekarang setiap URL melewati pemeriksaan di lib/attachment-policy.ts:
//   - embed hanya untuk host yang diizinkan, kalau tidak -> dirender sebagai
//     tautan biasa, bukan iframe
//   - gambar/audio/video hanya dari storage sendiri
//   - apa pun yang gagal validasi TIDAK dirender sebagai elemen aktif

import { FileText, Link2, Music, Download, ExternalLink } from 'lucide-react'
import type { Attachment } from '@/types/database'
import { isAllowedEmbedUrl, isSafeAssetUrl } from '@/lib/attachment-policy'

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Lampiran yang tidak lolos validasi dirender sebagai tautan biasa saja. */
function safeEmbed(a: Attachment): boolean {
  return a.kind === 'embed' && isAllowedEmbedUrl(a.url)
}

function safeAsset(a: Attachment): boolean {
  return isSafeAssetUrl(a.url)
}

export function AttachmentList({ items, className }: { items?: Attachment[] | null; className?: string }) {
  if (!items || items.length === 0) return null

  // Hanya tampilkan yang URL-nya lolos validasi dasar.
  const usable = items.filter((a) => isSafeAssetUrl(a.url))
  if (usable.length === 0) return null

  const media = usable.filter(
    (a) => (a.kind === 'image' || a.kind === 'video' || safeEmbed(a)) && safeAsset(a)
  )
  const files = usable.filter((a) => !media.includes(a))

  return (
    <div className={className ?? 'space-y-3'}>
      {media.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {media.map((a) => (
            <figure key={a.id} className="rounded-2xl overflow-hidden border border-[var(--cream-dark)] bg-white">
              {a.kind === 'image' ? (
                <img src={a.url} alt={a.title ?? ''} className="w-full h-auto object-cover" loading="lazy" />
              ) : a.kind === 'video' ? (
                <video src={a.url} controls preload="metadata" className="w-full h-auto" />
              ) : (
                <div className="aspect-video">
                  <iframe
                    src={a.url}
                    title={a.title ?? 'Lampiran'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    // Batasi apa yang bisa dilakukan iframe pihak ketiga.
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                    referrerPolicy="strict-origin-when-cross-origin"
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
              {a.kind === 'audio' && safeAsset(a) ? (
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

// src/components/ui/attachment-input.tsx
// "Superinput" — satu komponen untuk menambah gambar, video, audio, dokumen,
// link, dan embed ke sebuah postingan.

'use client'

import { useRef, useState } from 'react'
import {
  ImagePlus, Video, Music, FileText, Link2, Loader2, X, Plus, Play
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  ACCEPT, formatBytes, kindFromMime, parseLink, uploadFiles,
  type UploadResult,
} from '@/lib/uploads'
import type { AttachmentKind } from '@/types/database'

export interface DraftAttachment {
  kind: AttachmentKind
  url: string
  title: string
  mime_type?: string | null
  size_bytes?: number | null
}

interface Props {
  userId: string
  value: DraftAttachment[]
  onChange: (next: DraftAttachment[]) => void
  maxFiles?: number
  disabled?: boolean
}

const KIND_META: Record<string, { label: string; icon: typeof ImagePlus; accept: string }> = {
  image:    { label: 'Gambar',   icon: ImagePlus, accept: ACCEPT.image },
  video:    { label: 'Video',    icon: Video,     accept: ACCEPT.video },
  audio:    { label: 'Audio',    icon: Music,     accept: ACCEPT.audio },
  document: { label: 'Dokumen',  icon: FileText,  accept: ACCEPT.document },
}

export function AttachmentInput({ userId, value, onChange, maxFiles = 12, disabled }: Props) {
  const [busy, setBusy] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pickKind = useRef<keyof typeof KIND_META>('image')

  const remaining = Math.max(0, maxFiles - value.length)

  const handlePick = (kind: keyof typeof KIND_META) => {
    pickKind.current = kind
    if (inputRef.current) {
      inputRef.current.accept = KIND_META[kind].accept
      inputRef.current.click()
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (remaining === 0) {
      toast.error(`Maksimal ${maxFiles} lampiran per postingan.`)
      return
    }
    const list = Array.from(files).slice(0, remaining)

    setBusy(true)
    const { uploaded, errors } = await uploadFiles(list, userId)
    setBusy(false)

    if (uploaded.length > 0) {
      onChange([
        ...value,
        ...uploaded.map((u: UploadResult) => ({
          kind: kindFromMime(u.mimeType),
          url: u.url,
          title: u.title,
          mime_type: u.mimeType,
          size_bytes: u.sizeBytes,
        })),
      ])
      toast.success(`${uploaded.length} lampiran ditambahkan.`)
    }
    errors.forEach((e) => toast.error(e))
  }

  const handleAddLink = () => {
    const parsed = parseLink(linkValue)
    if (!parsed) {
      toast.error('Masukkan URL yang valid (diawali http:// atau https://).')
      return
    }
    onChange([
      ...value,
      { kind: parsed.kind, url: parsed.url, title: parsed.title },
    ])
    setLinkValue('')
    setLinkOpen(false)
  }

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).map((k) => {
          const Icon = KIND_META[k].icon
          return (
            <button
              key={k}
              type="button"
              disabled={disabled || busy || remaining === 0}
              onClick={() => handlePick(k)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[var(--cream)] text-[var(--brown)] border border-[var(--cream-dark)] hover:border-[var(--terra)] hover:text-[var(--terra)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon size={14} /> {KIND_META[k].label}
            </button>
          )
        })}

        <button
          type="button"
          disabled={disabled || remaining === 0}
          onClick={() => setLinkOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all disabled:opacity-40',
            linkOpen
              ? 'bg-[var(--terra)] text-white border-[var(--terra)]'
              : 'bg-[var(--cream)] text-[var(--brown)] border-[var(--cream-dark)] hover:border-[var(--terra)] hover:text-[var(--terra)]'
          )}
        >
          <Link2 size={14} /> Link / Embed
        </button>

        {busy && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)]">
            <Loader2 size={13} className="animate-spin" /> Mengunggah…
          </span>
        )}
        {!busy && value.length > 0 && (
          <span className="text-[11px] font-bold text-[var(--text-muted)] ml-auto">
            {value.length}/{maxFiles}
          </span>
        )}
      </div>

      {linkOpen && (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddLink()
              }
            }}
            placeholder="https://youtube.com/watch?v=… atau tautan apa pun"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[var(--cream-dark)] text-sm focus:outline-none focus:border-[var(--terra)] focus:ring-2 focus:ring-[var(--terra)]/10"
          />
          <button
            type="button"
            onClick={handleAddLink}
            className="p-2.5 rounded-xl bg-[var(--terra)] text-white hover:opacity-90 transition-all"
            aria-label="Tambahkan tautan"
          >
            <Plus size={18} />
          </button>
        </div>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {value.map((a, i) => (
            <li
              key={`${a.url}-${i}`}
              className="relative group rounded-xl overflow-hidden border border-[var(--cream-dark)] bg-white"
            >
              <div className="aspect-[4/3] bg-[var(--cream)] flex items-center justify-center overflow-hidden">
                {a.kind === 'image' ? (
                  <img src={a.url} alt={a.title} className="w-full h-full object-cover" />
                ) : a.kind === 'video' || a.kind === 'embed' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]">
                    <Play size={22} />
                    <span className="text-[9px] font-bold uppercase px-2 text-center line-clamp-2">
                      {a.title}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] px-2">
                    {a.kind === 'audio' ? <Music size={22} /> : a.kind === 'link' ? <Link2 size={22} /> : <FileText size={22} />}
                    <span className="text-[9px] font-bold text-center line-clamp-2">{a.title}</span>
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-bold text-[var(--brown-dark)] truncate">{a.title}</p>
                {a.size_bytes ? (
                  <p className="text-[9px] text-[var(--text-muted)]">{formatBytes(a.size_bytes)}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label={`Hapus ${a.title}`}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

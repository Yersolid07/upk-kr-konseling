// src/lib/uploads.ts
// Unggah lampiran ke Supabase Storage (bucket "media").
// Path wajib diawali uid pemilik — RLS storage menolak folder milik orang lain.

import { createClient } from '@/lib/supabase/client'
import type { AttachmentKind } from '@/types/database'

export const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

/** Batas ukuran per jenis lampiran. */
export const SIZE_LIMIT: Record<'image' | 'video' | 'audio' | 'document', number> = {
  image: 5 * 1024 * 1024,
  video: MAX_FILE_BYTES,
  audio: 15 * 1024 * 1024,
  document: 10 * 1024 * 1024,
}

export const ACCEPT: Record<'image' | 'video' | 'audio' | 'document', string> = {
  image: 'image/png,image/jpeg,image/webp,image/gif,image/avif',
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm',
  document: 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv',
}

export function kindFromMime(mime: string): AttachmentKind {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`
}

function safeName(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${base || 'file'}-${Date.now().toString(36)}-${rand}.${ext}`
}

export interface UploadResult {
  url: string
  path: string
  mimeType: string
  sizeBytes: number
  title: string
}

/** Unggah satu berkas. Melempar Error dengan pesan ramah bila gagal. */
export async function uploadFile(
  file: File,
  userId: string,
  bucket = 'media'
): Promise<UploadResult> {
  const kind = kindFromMime(file.type)
  const limit = SIZE_LIMIT[kind as keyof typeof SIZE_LIMIT] ?? MAX_FILE_BYTES

  if (file.size > limit) {
    throw new Error(
      `Ukuran berkas terlalu besar (${formatBytes(file.size)}). Maksimal ${formatBytes(limit)} untuk ${kind}.`
    )
  }

  const supabase = createClient()
  const path = `${userId}/${safeName(file.name)}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (error) {
    throw new Error(`Gagal mengunggah "${file.name}": ${error.message}`)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    url: data.publicUrl,
    path,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    title: file.name,
  }
}

/** Unggah banyak berkas; yang gagal dikumpulkan, tidak menggagalkan sisanya. */
export async function uploadFiles(
  files: File[],
  userId: string
): Promise<{ uploaded: UploadResult[]; errors: string[] }> {
  const uploaded: UploadResult[] = []
  const errors: string[] = []
  for (const file of files) {
    try {
      uploaded.push(await uploadFile(file, userId))
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Gagal mengunggah ${file.name}`)
    }
  }
  return { uploaded, errors }
}

// ─── Penyematan tautan ───

export interface LinkPreview {
  kind: 'link' | 'embed'
  url: string
  title: string
  provider?: string
}

const YT = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/
const SPOTIFY = /open\.spotify\.com\/(track|album|playlist|episode)\/(\w+)/
const DRIVE = /drive\.google\.com\/file\/d\/([\w-]+)/

/** Ubah URL apa pun jadi lampiran link/embed yang bisa ditampilkan. */
export function parseLink(raw: string): LinkPreview | null {
  const url = raw.trim()
  if (!/^https?:\/\//i.test(url)) return null

  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }

  const yt = url.match(YT)
  if (yt) {
    return {
      kind: 'embed',
      url: `https://www.youtube.com/embed/${yt[1]}`,
      title: 'Video YouTube',
      provider: 'youtube',
    }
  }

  const vm = url.match(VIMEO)
  if (vm) {
    return {
      kind: 'embed',
      url: `https://player.vimeo.com/video/${vm[1]}`,
      title: 'Video Vimeo',
      provider: 'vimeo',
    }
  }

  const sp = url.match(SPOTIFY)
  if (sp) {
    return {
      kind: 'embed',
      url: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`,
      title: 'Audio Spotify',
      provider: 'spotify',
    }
  }

  const gd = url.match(DRIVE)
  if (gd) {
    return {
      kind: 'embed',
      url: `https://drive.google.com/file/d/${gd[1]}/preview`,
      title: 'Dokumen Google Drive',
      provider: 'drive',
    }
  }

  return { kind: 'link', url, title: host }
}

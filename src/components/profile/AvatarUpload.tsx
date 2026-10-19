// src/components/profile/AvatarUpload.tsx
'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2, Trash2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

/**
 * Unggah foto profil.
 *
 * Gambar dikecilkan dan dipotong persegi DI PERAMBAN sebelum dikirim.
 * Alasannya bukan sekadar penghematan: foto ponsel 12 MP akan ditolak batas
 * 2 MB bucket, dan menaikkan batas berarti setiap halaman yang menampilkan
 * avatar harus mengunduh berkas besar. 512x512 WebP cukup tajam untuk semua
 * tempat avatar dipakai (maksimal 56 px di UI) dan biasanya di bawah 60 KB.
 *
 * Pemotongan memakai <canvas> — tidak ada dependensi tambahan.
 */

const SIZE = 512
const MAX_INPUT_BYTES = 20 * 1024 * 1024 // batas sebelum dikecilkan

async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)

  // Potong tengah persegi, lalu skala ke 512x512.
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.86)
  )
  if (!blob) throw new Error('Gagal mengolah gambar')
  return blob
}

export function AvatarUpload({
  userId,
  fullName,
  currentUrl,
}: {
  userId: string
  fullName: string
  currentUrl: string | null
}) {
  const [url, setUrl] = useState(currentUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const upload = async (file: File) => {
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Berkas harus berupa gambar.')
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Ukuran gambar melebihi 20 MB.')
      return
    }

    setBusy(true)
    try {
      const blob = await toSquareWebp(file)

      // Nama berkas memuat stempel waktu: nama tetap akan tersimpan di cache
      // CDN, sehingga pengguna mengganti foto tetapi melihat foto lama.
      const path = `${userId}/avatar-${Date.now()}.webp`

      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(path, blob, { contentType: 'image/webp', upsert: false })

      if (upErr) throw new Error(upErr.message)

      const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
      const publicUrl = pub.publicUrl

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (dbErr) throw new Error(dbErr.message)

      // Hapus berkas lama supaya kuota tidak menumpuk. Kegagalan di sini tidak
      // menggagalkan unggahan — foto baru sudah aktif.
      const oldPath = pathFromUrl(url)
      if (oldPath && oldPath !== path) {
        await supabase.storage.from('media').remove([oldPath])
      }

      setUrl(publicUrl)
      toast.success('Foto profil diperbarui.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal mengunggah'
      console.error('avatar upload:', msg)
      setError(
        /row-level security|policy/i.test(msg)
          ? 'Unggahan ditolak. Pastikan migrasi avatar sudah dijalankan.'
          : /mime|type/i.test(msg)
            ? 'Jenis berkas tidak diizinkan.'
            : /anon_token|42703/i.test(msg)
              ? 'Database menolak pembaruan profil: jalankan supabase/profile-trigger-fix.sql.'
              : /size|too large/i.test(msg)
                ? 'Berkas terlalu besar untuk penyimpanan.'
                : 'Gagal mengunggah foto. Coba gambar lain.'
      )
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      const oldPath = pathFromUrl(url)
      if (oldPath) await supabase.storage.from('media').remove([oldPath])
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId)
      if (dbErr) throw new Error(dbErr.message)
      setUrl(null)
      toast.success('Foto profil dihapus.')
    } catch {
      setError('Gagal menghapus foto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Foto profil ${fullName}`}
            width={72}
            height={72}
            className="w-[72px] h-[72px] rounded-full object-cover border-2 border-white shadow-md"
          />
        ) : (
          <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white font-bold text-2xl shadow-md">
            {fullName?.charAt(0) ?? 'U'}
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 rounded-full bg-black/45 flex items-center justify-center">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--cream-dark)] text-[var(--brown-dark)] text-[11px] font-bold hover:bg-[var(--cream)] transition-colors disabled:opacity-50"
          >
            <Camera size={13} />
            {url ? 'Ganti foto' : 'Unggah foto'}
          </button>

          {url && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-700 text-[11px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              Hapus
            </button>
          )}
        </div>

        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
          JPG, PNG, atau WebP. Dipotong persegi otomatis, maksimal 2 MB.
        </p>

        {error && (
          <p className="flex items-start gap-1.5 text-[10px] text-red-700 mt-1.5 leading-relaxed">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = '' // supaya memilih berkas yang sama tetap memicu
        }}
      />
    </div>
  )
}

/** Ambil path objek dari URL publik bucket media. */
function pathFromUrl(url: string | null): string | null {
  if (!url) return null
  const marker = '/storage/v1/object/public/media/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

// src/app/(app)/renungan/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createArticle } from '../actions'
import { createClient } from '@/lib/supabase/client'
import { AttachmentInput, type DraftAttachment } from '@/components/ui/attachment-input'
import { CategoryIcon } from '@/components/ui/icons'
import {
  ArrowLeft, Send, BookOpen, Layout, HelpCircle, Type,
  Info, ShieldCheck, Loader2, Paperclip
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { ThreadCategory, UserRole } from '@/types/database'

export default function NewArticlePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<ThreadCategory[]>([])
  const [attachments, setAttachments] = useState<DraftAttachment[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>('member')

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: { user } }] = await Promise.all([
        supabase.from('thread_categories').select('*').order('sort_order'),
        supabase.auth.getUser(),
      ])
      setCategories((cats ?? []) as ThreadCategory[])
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) setRole((profile as { role: UserRole }).role)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const publishesDirectly = role === 'admin' || role === 'super_admin'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('attachments', JSON.stringify(attachments))

    const result = await createArticle(formData)

    // createArticle redirect() pada sukses; kalau sampai di sini berarti gagal.
    if (result && 'error' in result) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-20">
      <Link
        href="/renungan"
        className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Renungan
      </Link>

      <div className="space-y-2">
        <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[var(--brown-dark)]">
          Tulis Renungan Baru
        </h1>
        <p className="text-[var(--text-muted)]">
          Bagikan hikmat, penguatan, atau cerita yang menguatkan komunitas.
        </p>
      </div>

      {/* Status publikasi — jelaskan aturan sebelum menulis, bukan setelah gagal */}
      <div
        className={
          publishesDirectly
            ? 'flex items-start gap-3 p-4 rounded-xl bg-[var(--sage)]/10 border border-[var(--sage)]/20'
            : 'flex items-start gap-3 p-4 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/25'
        }
      >
        {publishesDirectly ? (
          <ShieldCheck size={18} className="text-[var(--sage)] shrink-0 mt-0.5" />
        ) : (
          <Info size={18} className="text-[var(--gold)] shrink-0 mt-0.5" />
        )}
        <p className="text-xs sm:text-sm leading-relaxed text-[var(--brown-dark)]">
          {publishesDirectly ? (
            <>Sebagai <strong>{role === 'super_admin' ? 'Super Admin' : 'Admin'}</strong>, artikelmu langsung terbit di dinding Renungan.</>
          ) : (
            <>Artikelmu akan <strong>ditinjau admin terlebih dahulu</strong> sebelum tampil di dinding Renungan. Kamu akan mendapat notifikasi begitu disetujui atau bila perlu diperbaiki.</>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-premium p-5 sm:p-8 space-y-6">
              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <Type size={14} className="text-[var(--terra)]" /> Judul Artikel
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  minLength={5}
                  placeholder="Masukkan judul yang menarik..."
                  className="form-input text-lg sm:text-2xl font-bold placeholder:opacity-30"
                />
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <Layout size={14} className="text-[var(--terra)]" /> Ringkasan Singkat
                </label>
                <textarea
                  name="excerpt"
                  rows={2}
                  placeholder="Gambarkan isi artikel dalam 1-2 kalimat..."
                  className="form-input text-sm resize-none"
                />
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <BookOpen size={14} className="text-[var(--terra)]" /> Isi Artikel
                </label>
                <textarea
                  name="content"
                  required
                  minLength={50}
                  rows={14}
                  placeholder="Tuliskan hikmat atau cerita Anda di sini..."
                  className="form-input text-base leading-relaxed resize-none"
                />
              </div>

              {/* Lampiran — gambar, video, audio, dokumen, link, embed */}
              <div className="form-group pt-2 border-t border-[var(--cream-dark)]">
                <label className="form-label flex items-center gap-2 mt-4">
                  <Paperclip size={14} className="text-[var(--terra)]" /> Lampiran
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mb-3">
                  Gambar, video, audio, dokumen, atau tempel tautan YouTube/Spotify/Drive.
                </p>
                {userId ? (
                  <AttachmentInput userId={userId} value={attachments} onChange={setAttachments} />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Loader2 size={14} className="animate-spin" /> Memuat…
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card-premium p-5 sm:p-6 space-y-6">
              <h2 className="font-bold text-[var(--brown-dark)] text-xs uppercase tracking-widest border-b border-[var(--cream-dark)] pb-3">
                Pengaturan Artikel
              </h2>

              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <HelpCircle size={14} className="text-[var(--terra)]" /> Kategori
                </label>
                <select name="category_id" required className="form-input">
                  <option value="">Pilih Kategori...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">URL Gambar Sampul</label>
                <input
                  name="cover_url"
                  type="url"
                  placeholder="https://..."
                  className="form-input text-xs"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-2">
                  Opsional. Boleh juga unggah gambar lewat Lampiran di samping.
                </p>
              </div>
            </div>

            {error && <div className="error-banner animate-shake">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-14 group shadow-xl shadow-[var(--terra)]/20 w-full"
            >
              <span className="flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 size={17} className="animate-spin" /> Menyimpan…</>
                  : publishesDirectly
                    ? <>Terbitkan Sekarang <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                    : <>Kirim untuk Ditinjau <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

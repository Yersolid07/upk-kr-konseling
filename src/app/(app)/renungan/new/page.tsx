// src/app/renungan/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createArticle } from '../actions'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  Send, 
  Image as ImageIcon,
  BookOpen,
  Layout,
  HelpCircle,
  Type
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function NewArticlePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('thread_categories').select('*').order('sort_order')
      setCategories(data ?? [])
    }
    fetchCategories()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await createArticle(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Navigation */}
      <Link href="/renungan" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Renungan
      </Link>

      <div className="space-y-2">
        <h1 className="font-[var(--font-playfair)] text-4xl font-black text-[var(--brown-dark)]">Tulis Renungan Baru</h1>
        <p className="text-[var(--text-muted)]">Bagikan hikmat, penguatan, atau artikel inspiratif untuk komunitas.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-premium p-8 space-y-6">
              {/* Title */}
              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <Type size={14} className="text-[var(--terra)]" /> Judul Artikel
                </label>
                <input 
                  name="title"
                  type="text" 
                  required
                  placeholder="Masukkan judul yang menarik..."
                  className="form-input text-2xl font-black placeholder:opacity-30"
                />
              </div>

              {/* Excerpt */}
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

              {/* Content */}
              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <BookOpen size={14} className="text-[var(--terra)]" /> Isi Artikel
                </label>
                <textarea 
                  name="content"
                  required
                  rows={15}
                  placeholder="Tuliskan hikmat atau cerita Anda di sini..."
                  className="form-input text-lg leading-relaxed resize-none"
                />
              </div>
            </div>
          </div>

          {/* Sidebar Settings (1 col) */}
          <div className="space-y-6">
            <div className="card-premium p-6 space-y-6">
              <h3 className="font-bold text-[var(--brown-dark)] text-xs uppercase tracking-widest border-b border-[var(--cream-dark)] pb-3">Pengaturan Artikel</h3>
              
              {/* Category */}
              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <HelpCircle size={14} className="text-[var(--terra)]" /> Kategori
                </label>
                <select name="category_id" required className="form-input">
                  <option value="">Pilih Kategori...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Cover URL */}
              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <ImageIcon size={14} className="text-[var(--terra)]" /> URL Gambar Sampul
                </label>
                <input 
                  name="cover_url"
                  type="url" 
                  placeholder="https://..."
                  className="form-input text-xs"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">Gunakan link dari Unsplash untuk hasil terbaik.</p>
              </div>
            </div>

            {error && <div className="error-banner animate-shake">{error}</div>}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary h-14 group shadow-xl shadow-[var(--terra)]/20"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? 'Mempublikasikan...' : 'Publikasikan Sekarang'}
                {!loading && <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

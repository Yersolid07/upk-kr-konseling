// src/app/forum/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createThread } from '../actions'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  Send, 
  Shield, 
  HelpCircle,
  MessageSquare,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function NewThreadPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  
  const supabase = createClient()

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase.from('thread_categories').select('*').order('sort_order')
        if (error) throw error
        setCategories(data ?? [])
      } catch (err) {
        console.error('Failed to fetch categories:', err)
        setError('Gagal memuat kategori. Beberapa fitur mungkin terbatas.')
      }
    }
    fetchCategories()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.append('is_anonymous', String(isAnonymous))
    
    const result = await createThread(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Navigation */}
      <Link href="/forum" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Forum
      </Link>

      <div className="space-y-2">
        <h1 className="font-[var(--font-playfair)] text-4xl font-black text-[var(--brown-dark)]">Mulai Diskusi Baru</h1>
        <p className="text-[var(--text-muted)]">Bagikan pemikiran, pertanyaan, atau kesaksian Anda dengan komunitas.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-premium p-8 space-y-6">
          {/* Title */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <MessageSquare size={14} className="text-[var(--terra)]" /> Judul Diskusi
            </label>
            <input 
              name="title"
              type="text" 
              required
              minLength={5}
              maxLength={200}
              placeholder="Apa yang ingin Anda bicarakan?"
              className="form-input text-lg font-bold"
            />
          </div>

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

          {/* Content */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Info size={14} className="text-[var(--terra)]" /> Isi Pesan
            </label>
            <textarea 
              name="content"
              required
              minLength={10}
              rows={8}
              placeholder="Tuliskan isi diskusi Anda di sini..."
              className="form-input resize-none leading-relaxed"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="p-4 bg-[var(--cream)] rounded-2xl flex items-center justify-between border border-[var(--cream-dark)]">
             <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  isAnonymous ? "bg-[var(--gold)] text-white shadow-lg" : "bg-white text-[var(--text-muted)]"
                )}>
                  <Shield size={20} />
                </div>
                <div>
                   <p className="text-sm font-bold text-[var(--brown-dark)]">Posting secara Anonim</p>
                   <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Identitas Anda akan disembunyikan</p>
                </div>
             </div>
             <button 
               type="button"
               onClick={() => setIsAnonymous(!isAnonymous)}
               className={cn(
                 "w-12 h-6 rounded-full relative transition-all duration-300",
                 isAnonymous ? "bg-[var(--gold)]" : "bg-gray-300"
               )}
             >
               <div className={cn(
                 "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
                 isAnonymous ? "right-1" : "left-1"
               )} />
             </button>
          </div>
        </div>

        {error && <div className="error-banner animate-shake">{error}</div>}

        <button 
          type="submit" 
          disabled={loading}
          className="btn-primary h-14 group"
        >
          <span className="flex items-center justify-center gap-2">
            {loading ? 'Mengirim...' : 'Publikasikan Diskusi'}
            {!loading && <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
          </span>
        </button>
      </form>
    </div>
  )
}

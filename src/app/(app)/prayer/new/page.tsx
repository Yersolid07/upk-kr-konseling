// src/app/prayer/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createPrayerRequest } from '../actions'
import { 
  ArrowLeft, 
  Send, 
  Shield, 
  Heart,
  Info,
  HelpCircle
} from 'lucide-react'
import { HandsPraying } from '@/components/icons/HandsPraying'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export default function NewPrayerPage() {
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
    
    const result = await createPrayerRequest(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Navigation */}
      <Link href="/prayer" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Prayer Wall
      </Link>

      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-[var(--gold)]/10 rounded-[2rem] flex items-center justify-center text-[var(--gold)] mx-auto shadow-sm">
          <Heart size={40} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h1 className="font-[var(--font-playfair)] text-4xl font-black text-[var(--brown-dark)]">Kirim Pokok Doa</h1>
          <p className="text-[var(--text-muted)]">Biarkan kami dan komunitas mendoakan beban atau syukur Anda.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-premium p-8 space-y-6">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <HandsPraying size={14} className="text-[var(--gold)]" /> Pokok Doa Anda
            </label>
            <textarea 
              name="content"
              required
              minLength={10}
              maxLength={500}
              rows={6}
              placeholder="Tuliskan permohonan doa Anda di sini... (Contoh: Mohon dukungan doa untuk kesembuhan orang tua saya)"
              className="form-input text-lg italic resize-none leading-relaxed"
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <HelpCircle size={14} className="text-[var(--gold)]" /> Kategori (Opsional)
            </label>
            <select name="category_id" className="form-input">
              <option value="">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
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
                   <p className="text-sm font-bold text-[var(--brown-dark)]">Kirim secara Anonim</p>
                   <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Nama Anda tidak akan ditampilkan</p>
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
          className="btn-primary h-14 group shadow-2xl shadow-[var(--gold)]/20"
        >
          <span className="flex items-center justify-center gap-2">
            {loading ? 'Mengirim...' : 'Kirim Pokok Doa'}
            {!loading && <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
          </span>
        </button>
      </form>
    </div>
  )
}

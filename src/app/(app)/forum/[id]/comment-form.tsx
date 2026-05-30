// src/app/forum/[id]/comment-form.tsx
'use client'

import { useState } from 'react'
import { createComment } from '../actions'
import { Shield, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommentFormProps {
  threadId: string
  isAnonymousDefault: boolean
}

export function CommentForm({ threadId, isAnonymousDefault }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousDefault)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    setError('')

    const result = await createComment(threadId, content, isAnonymous)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setContent('')
      setLoading(false)
    }
  }

  return (
    <div className="card-premium p-6 bg-gradient-to-br from-white to-[var(--cream)] space-y-4">
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full bg-white border border-[var(--cream-dark)] rounded-2xl p-4 text-sm focus:ring-4 focus:ring-[var(--terra)]/10 transition-all outline-none resize-none"
        placeholder="Bagikan kata-kata penguatan atau pendapat Anda..."
        rows={3}
        disabled={loading}
      />
      
      {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
              <Shield size={14} /> Sopan & Santun
           </div>
           
           <button 
             type="button"
             onClick={() => setIsAnonymous(!isAnonymous)}
             className={cn(
               "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all",
               isAnonymous 
                 ? "bg-[var(--gold)]/10 border-[var(--gold)]/30 text-[var(--gold)]" 
                 : "bg-white border-[var(--cream-dark)] text-[var(--text-muted)]"
             )}
           >
             <div className={cn("w-1.5 h-1.5 rounded-full", isAnonymous ? "bg-[var(--gold)]" : "bg-gray-300")} />
             Anonim
           </button>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="btn-primary !w-auto px-8 flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
        >
          {loading ? 'Mengirim...' : 'Kirim Komentar'}
          {!loading && <Send size={16} />}
        </button>
      </div>
    </div>
  )
}

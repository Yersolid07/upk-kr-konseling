// src/components/prayer/PrayerComments.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/profile/Avatar'
import { getRelativeTime } from '@/lib/utils'

interface Comment {
  id: string
  content: string
  is_anonymous: boolean
  created_at: string
  author_label: string
  avatar_url: string | null
}

interface PrayerCommentsProps {
  requestId: string
}

async function fetchComments(requestId: string): Promise<Comment[]> {
  const res = await fetch(`/api/prayer-comments?request_id=${encodeURIComponent(requestId)}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Gagal memuat komentar')
  const data = await res.json()
  return (data.comments ?? []) as Comment[]
}

export function PrayerComments({ requestId }: PrayerCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [anon, setAnon] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchComments(requestId)
      setComments(data)
    } catch {
      setError('Komentar gagal dimuat')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = content.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)

    const res = await fetch('/api/prayer-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, content: text, is_anonymous: anon }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Komentar gagal dikirim')
      setSending(false)
      return
    }
    setContent('')
    setComments((prev) => [...prev, data.comment as Comment])
    setSending(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus komentar ini?')) return
    const res = await fetch(`/api/prayer-comments?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) return
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <section className="bg-white rounded-3xl border border-[var(--cream-dark)] shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--cream)] flex items-center gap-3">
        <MessageCircle size={18} className="text-[var(--gold)]" />
        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--brown-dark)]">
          Komentar ({comments.length})
        </h2>
      </div>

      <div className="p-6 space-y-5">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Memuat komentar...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] italic">
            Belum ada komentar. Jadi yang pertama menguatkan.
          </p>
        ) : (
          comments.map((c) => (
            <article key={c.id} className="flex gap-3">
              <Avatar
                src={c.avatar_url}
                name={c.author_label}
                isAnonymous={c.is_anonymous}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[var(--brown-dark)]">{c.author_label}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{getRelativeTime(c.created_at)}</span>
                </div>
                <p className="text-sm text-[var(--text)] leading-relaxed mt-1">{c.content}</p>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="mt-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-red-500 transition-colors inline-flex items-center gap-1"
                >
                  <Trash2 size={12} /> Hapus
                </button>
              </div>
            </article>
          ))
        )}

        {error && (
          <p className="text-xs font-bold text-red-500 bg-red-50 rounded-xl px-4 py-2">{error}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 border-t border-[var(--cream)] bg-[var(--bg)]">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Tulis kata penguat..."
          className="w-full px-4 py-3 bg-white border border-[var(--cream-dark)] rounded-2xl text-sm focus:ring-4 focus:ring-[var(--gold)]/10 transition-all outline-none resize-none"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
              className="w-4 h-4 accent-[var(--gold)]"
            />
            Kirim anonim
          </label>
          <span className="text-[10px] text-[var(--text-muted)]">{content.length}/1000</span>
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--gold)] text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-[var(--gold-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? 'Mengirim...' : (
              <>
                <Send size={13} /> Kirim
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}

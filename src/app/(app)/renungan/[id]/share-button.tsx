'use client'
import { useState } from 'react'
import { Share2 } from 'lucide-react'

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <button
      onClick={handleShare}
      className="relative btn-icon text-[var(--text-muted)]"
      aria-label="Bagikan artikel"
    >
      <Share2 size={18} />
      {copied ? (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--terra)] bg-[var(--cream)] px-2 py-1 rounded">
          Tautan disalin
        </span>
      ) : null}
    </button>
  )
}

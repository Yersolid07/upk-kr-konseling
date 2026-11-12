// src/components/prayer/PrayerCard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supportPrayer } from '@/app/(app)/prayer/actions'
import { HandsPraying } from '@/components/icons/HandsPraying'
import { ReportButton } from '@/components/reports/report-button'
import { Shield, MessageCircle } from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'
import type { PublicPrayer } from '@/lib/public-content'

interface PrayerCardProps {
  prayer: PublicPrayer
  commentCount?: number
}

export function PrayerCard({ prayer, commentCount = 0 }: PrayerCardProps) {
  const [count, setCount] = useState(prayer.pray_count)
  const [loading, setLoading] = useState(false)

  const displayName = prayer.author.label

  async function handleSupport(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    setCount(count + 1)
    const result = await supportPrayer(prayer.id)
    if (result.error) setCount(count)
    setLoading(false)
  }

  return (
    <div className="break-inside-avoid card-premium p-8 space-y-6 hover-lift relative overflow-hidden group">
       {/* Background Glow */}
       <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/5 blur-3xl rounded-full group-hover:bg-[var(--gold)]/10 transition-all" />

       <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm",
              prayer.is_anonymous ? "bg-slate-400" : "bg-gradient-to-br from-[var(--gold)] to-[var(--brown)]"
            )}>
              {prayer.is_anonymous ? <Shield size={16} /> : displayName.charAt(0)}
            </div>
            <div>
               <div className="text-xs font-bold text-[var(--brown-dark)]">{displayName}</div>
               <div className="text-[10px] text-[var(--text-muted)]">{getRelativeTime(prayer.created_at)}</div>
            </div>
          </div>
          <div className="text-[var(--gold)] opacity-30">
             <HandsPraying size={20} />
          </div>
       </div>

       <p className="text-[var(--text)] italic leading-relaxed text-base font-medium relative z-10">
         "{prayer.content}"
       </p>

       <div className="pt-6 border-t border-[var(--cream-dark)] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSupport}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 transition-all group/btn",
                loading ? "opacity-50 cursor-not-allowed" : "text-[var(--gold)] hover:text-[var(--gold-light)]"
              )}
            >
               <div className="w-10 h-10 rounded-full bg-[var(--gold)]/10 flex items-center justify-center group-hover/btn:scale-110 transition-all">
                  <HandsPraying size={18} />
               </div>
               <span className="text-sm font-black uppercase tracking-widest">Amin ({count})</span>
            </button>

            <Link
              href={`/prayer/${prayer.id}`}
              className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors"
            >
              <MessageCircle size={15} />
              {commentCount} komentar
            </Link>
          </div>

          <ReportButton contentType="prayer" contentId={prayer.id} compact />
       </div>
    </div>
  )
}

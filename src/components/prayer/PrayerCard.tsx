// src/components/prayer/PrayerCard.tsx
'use client'

import { useState } from 'react'
import { supportPrayer } from '@/app/(app)/prayer/actions'
import { HandsPraying } from '@/components/icons/HandsPraying'
import { MessageCircle, Shield } from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

interface PrayerCardProps {
  prayer: any
}

export function PrayerCard({ prayer }: PrayerCardProps) {
  const [count, setCount] = useState(prayer.pray_count)
  const [loading, setLoading] = useState(false)

  const displayName = prayer.is_anonymous 
    ? `Anonim#${(prayer.author as any)?.anon_token?.slice(0,4).toUpperCase()}`
    : (prayer.author as any)?.full_name

  async function handleSupport() {
    if (loading) return
    setLoading(true)
    
    // Optimistic update
    setCount(count + 1)
    
    const result = await supportPrayer(prayer.id)
    if (result.error) {
      setCount(count) // Rollback
    }
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
               {prayer.is_anonymous ? <Shield size={16} /> : (prayer.author as any)?.full_name?.charAt(0)}
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
          
          <button className="text-[var(--text-muted)] hover:text-[var(--brown)] transition-all">
             <MessageCircle size={18} />
          </button>
       </div>
    </div>
  )
}

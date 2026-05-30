// src/components/dashboard/verse-banner.tsx
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface VerseBannerProps {
  text: string
  reference: string
  className?: string
}

export function VerseBanner({ text, reference, className }: VerseBannerProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-[24px] p-8 md:p-10 text-white shadow-xl shadow-[var(--brown-dark)]/20",
      "bg-gradient-to-br from-[var(--brown-dark)] via-[#5A3A25] to-[var(--brown)]",
      className
    )}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Sparkles size={120} />
      </div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[var(--gold)]/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-2 text-[var(--gold-light)] text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
          <span className="w-8 h-[1px] bg-current opacity-50" />
          Ayat Hari Ini
        </div>
        
        <blockquote className="font-[var(--font-playfair)] text-xl md:text-2xl italic leading-relaxed mb-6 selection:bg-[var(--gold)] selection:text-[var(--brown-dark)]">
          "{text}"
        </blockquote>
        
        <div className="flex items-center gap-3">
          <div className="h-[1px] w-4 bg-[var(--gold)] opacity-50" />
          <cite className="text-sm font-semibold text-[var(--gold-light)] not-italic">
            {reference}
          </cite>
          <span className="text-[10px] text-white/40 font-medium tracking-wide">
            · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
      </div>
    </div>
  )
}

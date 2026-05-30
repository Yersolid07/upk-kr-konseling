// src/components/dashboard/stat-card.tsx
import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  className?: string
}

export function StatCard({ icon, label, value, color, className }: StatCardProps) {
  return (
    <div className={cn("card-premium group hover-lift overflow-hidden", className)}>
      <div className="p-5 flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all group-hover:scale-110 shadow-sm"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div>
          <div className="font-[var(--font-playfair)] text-3xl font-bold text-[var(--brown-dark)] leading-none mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {label}
          </div>
        </div>
      </div>
      <div 
        className="h-1 w-full opacity-30" 
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

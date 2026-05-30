import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-12 h-12 text-[var(--terra)] animate-spin" />
      <p className="text-[var(--brown-dark)] font-black uppercase tracking-widest text-xs animate-pulse">
        Memuat Dasbor...
      </p>
    </div>
  )
}

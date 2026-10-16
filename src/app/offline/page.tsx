// src/app/offline/page.tsx
import Link from 'next/link'
import { WifiOff, RefreshCw } from 'lucide-react'

export const metadata = { title: 'Offline — IKA UPK-Kr FT UNSRAT' }

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--cream)]">
      <div className="card-premium p-12 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-[var(--cream-dark)] rounded-full flex items-center justify-center text-[var(--brown)] mx-auto">
          <WifiOff size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="font-[var(--font-playfair)] text-3xl font-black text-[var(--brown-dark)]">
            Anda Sedang Offline
          </h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Koneksi internet terputus. Beberapa halaman mungkin tersedia dari cache.
            Periksa jaringan Anda lalu coba lagi.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--brown-dark)] text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--brown)] transition-all"
        >
          <RefreshCw size={16} /> Coba Lagi
        </Link>
      </div>
    </div>
  )
}

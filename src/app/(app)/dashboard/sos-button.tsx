// src/app/dashboard/sos-button.tsx
'use client'

import { useState } from 'react'
import { Flame } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function SOSButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSOS = async () => {
    if (!confirm('Apakah Anda yakin ingin mengirim sinyal SOS? Konselor akan segera dihubungi.')) return

    setLoading(true)
    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Butuh bantuan segera dari Dashboard' })
      })

      const data = await res.json()

      if (res.ok) {
        alert('Sinyal SOS Terkirim. Konselor akan segera merespon melalui chat.')
        router.push(`/chat/${data.session_id}`)
      } else {
        alert(data.error || 'Gagal mengirim sinyal SOS. Silakan coba lagi atau hubungi hotline.')
      }
    } catch (error) {
      alert('Terjadi kesalahan koneksi. Silakan hubungi hotline langsung.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card-premium p-8 bg-[var(--brown-dark)] text-white relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--terra)]/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-700" />
      <div className="relative z-10 space-y-6">
        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-[var(--gold)] shadow-inner">
          <Flame size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="font-[var(--font-playfair)] text-2xl font-bold">Butuh Bantuan Segera?</h3>
          <p className="text-white/70 text-sm leading-relaxed">
            Konselor kami siap mendengarkan 24/7. Jangan menanggung beban Anda sendirian. Sinyal SOS akan segera diteruskan ke konselor siaga.
          </p>
        </div>
        <button 
          onClick={handleSOS}
          disabled={loading}
          className="w-full py-4 bg-white text-[var(--brown-dark)] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[var(--cream)] transition-all active:scale-95 shadow-xl shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Mengirim Sinyal...' : 'Kirim Sinyal SOS'}
        </button>
      </div>
    </section>
  )
}

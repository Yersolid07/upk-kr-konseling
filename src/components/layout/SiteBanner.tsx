// src/components/layout/SiteBanner.tsx
// Banner pengumuman dari tabel site_banners (M10).
//
// Ditutup per-ID di localStorage, bukan satu kunci global: menutup pengumuman
// maintenance tidak boleh ikut menyembunyikan pengumuman darurat berikutnya.

'use client'

import { useEffect, useState } from 'react'
import { Info, AlertTriangle, ShieldAlert, X } from 'lucide-react'

type Banner = {
  id: string
  message: string
  level: 'info' | 'warning' | 'critical'
  dismissible: boolean
}

const STYLE: Record<string, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-red-200 bg-red-50 text-red-900',
}

const ICON = { info: Info, warning: AlertTriangle, critical: ShieldAlert }

export function SiteBanner({ banners }: { banners: Banner[] }) {
  const [hidden, setHidden] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dismissed-banners')
      setHidden(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
      setHidden([])
    }
    setReady(true)
  }, [])

  function dismiss(id: string) {
    const next = [...hidden, id]
    setHidden(next)
    try {
      localStorage.setItem('dismissed-banners', JSON.stringify(next))
    } catch {
      /* mode privat: banner tetap tertutup untuk sesi ini */
    }
  }

  // Render kosong di server supaya tidak ada kedipan banner yang sudah ditutup.
  if (!ready) return null

  const visible = banners.filter((b) => !hidden.includes(b.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-1.5 mb-3">
      {visible.map((b) => {
        const Icon = ICON[b.level] ?? Info
        return (
          <div
            key={b.id}
            className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${STYLE[b.level] ?? STYLE.info}`}
          >
            <Icon size={15} className="mt-0.5 shrink-0" />
            <p className="flex-1 text-xs leading-relaxed whitespace-pre-wrap">{b.message}</p>
            {b.dismissible && (
              <button onClick={() => dismiss(b.id)} aria-label="Tutup pengumuman" className="shrink-0 opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

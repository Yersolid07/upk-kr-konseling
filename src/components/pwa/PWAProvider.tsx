// src/components/pwa/PWAProvider.tsx
'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Registers the service worker and surfaces a dismissible "install app" banner.
 * Renders nothing visible until the browser fires beforeinstallprompt.
 */
export function PWAProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  // --- Register service worker ---
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch((err) => console.warn('SW registration failed:', err))
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  // --- Auto-refresh once when a new service worker takes control ---
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    let done = false
    const onControllerChange = () => {
      if (done) return
      done = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  // --- Install prompt ---
  useEffect(() => {
    if (typeof window === 'undefined') return

    const dismissed = localStorage.getItem('pwa-install-dismissed') === '1'
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (dismissed || standalone) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => {
      setVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setVisible(false)
    try { localStorage.setItem('pwa-install-dismissed', '1') } catch {}
  }

  if (!visible) return null

  return (
    // Pembungkus HANYA mengatur posisi — tanpa transform apa pun.
    //
    // Sebelumnya posisi dan animasi ada di satu elemen: `left-1/2
    // -translate-x-1/2` bersamaan dengan `animate-fade-up`, yang menganimasikan
    // `transform: translateY(...)`. Dengan `forwards`, nilai akhirnya
    // `translateY(0)` — dan itu MENIMPA `translateX(-50%)` milik Tailwind.
    // Akibatnya banner duduk di left:50% tanpa digeser, melebar ke kanan, dan
    // tepi kanannya keluar layar: tombol tutup tidak bisa ditekan di ponsel.
    //
    // Memisahkan pembungkus (posisi) dari kartu (animasi) menutup kelas bug ini
    // untuk selamanya — animasi apa pun boleh dipakai di dalam tanpa merusak
    // posisi.
    //
    // Jarak bawah menghindari BottomNav (56px + safe-area) di layar kecil;
    // di desktop tidak ada BottomNav sehingga cukup 24px.
    <div
      className="fixed inset-x-0 z-[60] px-4 pointer-events-none
                 bottom-[calc(56px+env(safe-area-inset-bottom,0px)+12px)] lg:bottom-6"
      role="region"
      aria-label="Tawaran memasang aplikasi"
    >
      <div className="mx-auto max-w-md animate-fade-up pointer-events-auto">
        <div className="bg-[var(--brown-dark)] text-white rounded-2xl shadow-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4">
          <LogoMark size={40} className="shrink-0 ring-1 ring-white/15" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] sm:text-sm font-bold leading-tight">
              Pasang aplikasi IKA UPK-Kr FT UNSRAT
            </p>
            <p className="text-[11px] text-white/60 leading-snug mt-0.5">
              Akses lebih cepat langsung dari layar utama.
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-[var(--terra)] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[var(--terra-light)] transition-all flex items-center gap-1.5 shrink-0"
          >
            <Download size={14} /> Pasang
          </button>
          {/* Sasaran sentuh minimal 44px: tombol 18px dengan padding tipis
              terlalu kecil untuk jempol, terutama di tepi layar. */}
          <button
            onClick={handleDismiss}
            aria-label="Tutup tawaran pemasangan"
            className="-mr-1 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

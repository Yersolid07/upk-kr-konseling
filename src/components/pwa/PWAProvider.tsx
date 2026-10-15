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
        .register('/sw.js')
        .catch((err) => console.warn('SW registration failed:', err))
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md animate-fade-up">
      <div className="bg-[var(--brown-dark)] text-white rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--terra)] to-[var(--gold)] flex items-center justify-center text-lg shrink-0">
          <LogoMark size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Pasang aplikasi UPK-Kr</p>
          <p className="text-[11px] text-white/60 leading-snug">Akses lebih cepat langsung dari layar utama.</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-4 py-2 rounded-xl bg-[var(--terra)] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[var(--terra-light)] transition-all flex items-center gap-1.5 shrink-0"
        >
          <Download size={14} /> Pasang
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Tutup"
          className="p-1.5 text-white/50 hover:text-white transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

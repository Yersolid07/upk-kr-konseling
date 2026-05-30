// src/app/auth/setup-error/page.tsx
'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import { logout } from '../actions'

export default function SetupErrorPage() {
  return (
    <div className="auth-card backdrop-blur-xl bg-white/90 border border-white/20 text-center space-y-6">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
        <AlertTriangle size={32} />
      </div>
      
      <div>
        <h1 className="font-[var(--font-playfair)] text-2xl font-black text-[var(--brown-dark)]">Profil Tidak Ditemukan</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Akun Anda terdaftar, tetapi terjadi kesalahan saat membuat profil database (Trigger Error). 
          Silakan hubungi Administrator atau coba mendaftar ulang dengan email yang berbeda setelah masalah diperbaiki.
        </p>
      </div>

      <form action={logout}>
        <button type="submit" className="btn-primary w-full bg-red-600 hover:bg-red-700 shadow-red-600/20 shadow-2xl">
          <span className="flex items-center justify-center gap-2">
            Keluar Akun <ArrowRight size={18} />
          </span>
        </button>
      </form>
    </div>
  )
}

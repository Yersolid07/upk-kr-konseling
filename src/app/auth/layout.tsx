// src/app/auth/layout.tsx
import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[var(--cream)] overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-[var(--terra)]/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[40%] bg-[var(--sage)]/10 blur-[120px] rounded-full" />
      </div>

      {/* Left Side: Illustration / Branding (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[var(--brown-dark)] items-center justify-center p-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] " />
        
        <div className="relative z-10 text-center space-y-8 animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] rounded-[2rem] flex items-center justify-center text-white text-5xl shadow-2xl shadow-black/40 mx-auto">
            ✝
          </div>
          <div className="space-y-4">
            <h1 className="font-[var(--font-playfair)] text-5xl font-bold text-white leading-tight">
              Melangkah Maju <br /> 
              <span className="text-[var(--terra-light)]">Bersama Iman.</span>
            </h1>
            <p className="text-[var(--cream-dark)] text-lg max-w-md mx-auto leading-relaxed opacity-80">
              Temukan kedamaian dan dukungan di komunitas Kristen Fakultas Teknik UNSRAT.
            </p>
          </div>
          
          <div className="pt-10">
            <div className="inline-block p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
               <div className="px-6 py-2 text-xs font-bold text-[var(--gold-light)] uppercase tracking-widest">
                 Dikuasai oleh Kasih Kristus
               </div>
            </div>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--terra)] to-transparent opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-[440px] animate-fade-up">
          {children}
        </div>
      </div>
    </div>
  )
}

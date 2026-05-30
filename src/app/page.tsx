// src/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Heart, MessageCircle, Shield, Users, ArrowRight } from 'lucide-react'

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] selection:bg-[var(--terra-light)] selection:text-[var(--brown-dark)]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-[var(--cream-dark)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[var(--terra)]/20">
              <Heart size={22} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-[var(--font-playfair)] text-xl font-bold text-[var(--brown-dark)] leading-none">UPK-Kr Konseling</h1>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">FT UNSRAT Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brown)] transition-colors">Masuk</Link>
            <Link href="/auth/register" className="px-5 py-2.5 bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-[var(--terra)]/30 transition-all active:scale-95">Daftar Sekarang</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--sage)]/10 text-[var(--sage)] text-xs font-bold mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--sage)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--sage)]"></span>
            </span>
            Platform Konseling Mahasiswa Kristen
          </div>
          
          <h2 className="font-[var(--font-playfair)] text-5xl md:text-7xl font-bold text-[var(--brown-dark)] mb-6 leading-[1.1] tracking-tight">
            Ruang Aman untuk <br />
            <span className="text-gradient">Bertumbuh & Berbagi</span>
          </h2>
          
          <p className="max-w-2xl mx-auto text-[var(--text-muted)] text-lg md:text-xl mb-10 leading-relaxed">
            Temukan dukungan rohani, bimbingan akademik, dan komunitas yang peduli. 
            Bersama kita melangkah dengan iman dan harapan.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/auth/register" className="w-full sm:w-auto px-8 py-4 bg-[var(--brown-dark)] text-white font-bold rounded-2xl hover:bg-[var(--brown)] transition-all flex items-center justify-center gap-2 group shadow-xl shadow-[var(--brown-dark)]/20">
              Mulai Perjalanan Anda <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </Link>
            <Link href="#features" className="w-full sm:w-auto px-8 py-4 glass border-[var(--cream-dark)] text-[var(--brown-dark)] font-bold rounded-2xl hover:bg-white transition-all">
              Pelajari Lebih Lanjut
            </Link>
          </div>

          {/* Feature Grid */}
          <div id="features" className="grid md:grid-cols-3 gap-8 text-left mt-10">
            <div className="p-8 card-premium hover-lift group">
              <div className="w-14 h-14 bg-[var(--terra)]/10 rounded-2xl flex items-center justify-center text-[var(--terra)] mb-6 group-hover:bg-[var(--terra)] group-hover:text-white transition-colors">
                <Shield size={28} />
              </div>
              <h3 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)] mb-4">Anonimitas Terjamin</h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                Bagikan beban pikiran Anda tanpa rasa takut. Identitas Anda terlindungi sepenuhnya dengan sistem anonimitas kami.
              </p>
            </div>

            <div className="p-8 card-premium hover-lift group">
              <div className="w-14 h-14 bg-[var(--sage)]/10 rounded-2xl flex items-center justify-center text-[var(--sage)] mb-6 group-hover:bg-[var(--sage)] group-hover:text-white transition-colors">
                <MessageCircle size={28} />
              </div>
              <h3 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)] mb-4">Konseling 1-on-1</h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                Dapatkan bimbingan privat dari konselor berpengalaman yang siap mendengarkan dan mendoakan Anda.
              </p>
            </div>

            <div className="p-8 card-premium hover-lift group">
              <div className="w-14 h-14 bg-[var(--gold)]/10 rounded-2xl flex items-center justify-center text-[var(--gold)] mb-6 group-hover:bg-[var(--gold)] group-hover:text-white transition-colors">
                <Users size={28} />
              </div>
              <h3 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)] mb-4">Komunitas Iman</h3>
              <p className="text-[var(--text-muted)] leading-relaxed">
                Bergabunglah dengan forum diskusi dan Prayer Wall untuk saling menguatkan dalam perjalanan iman.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--cream-dark)] px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[var(--text-muted)] text-sm">
          <div>© 2024 UPK-Kr FT UNSRAT. Built with ❤️ for the community.</div>
          <div className="flex gap-8">
            <Link href="/privacy" className="hover:text-[var(--terra)] transition-colors">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-[var(--terra)] transition-colors">Syarat & Ketentuan</Link>
            <Link href="/contact" className="hover:text-[var(--terra)] transition-colors">Hubungi Kami</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

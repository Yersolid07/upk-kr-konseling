// src/app/privacy/page.tsx
import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Server, Trash2, Mail } from 'lucide-react'

export default function PrivacyPage() {
  const sections = [
    {
      icon: <Eye size={20} />,
      title: 'Data yang Kami Kumpulkan',
      content: 'Kami mengumpulkan informasi yang Anda berikan secara langsung saat mendaftar: nama lengkap, email, angkatan, dan jurusan. Data ini diperlukan untuk memverifikasi identitas alumni FT UNSRAT.'
    },
    {
      icon: <Lock size={20} />,
      title: 'Kerahasiaan Konseling',
      content: 'Seluruh sesi konseling bersifat RAHASIA. Percakapan antara anggota dan konselor dilindungi dan tidak dapat diakses oleh pihak lain, kecuali dalam keadaan darurat yang mengancam keselamatan jiwa.'
    },
    {
      icon: <Shield size={20} />,
      title: 'Fitur Anonim',
      content: 'Saat menggunakan mode anonim, identitas Anda disembunyikan dari pengguna lain. Hanya super admin yang berwenang membuka identitas dalam situasi darurat, dan setiap pembukaan dicatat dalam audit log permanen.'
    },
    {
      icon: <Server size={20} />,
      title: 'Penyimpanan Data',
      content: 'Data disimpan di server Supabase yang terenkripsi. Kami menerapkan Row Level Security (RLS) untuk memastikan setiap pengguna hanya dapat mengakses data yang menjadi haknya.'
    },
    {
      icon: <Trash2 size={20} />,
      title: 'Hak Penghapusan',
      content: 'Anda berhak meminta penghapusan akun dan seluruh data Anda kapan saja dengan menghubungi admin UPK-Kr. Proses penghapusan akan diselesaikan dalam waktu 30 hari kerja.'
    },
    {
      icon: <Mail size={20} />,
      title: 'Kontak Privasi',
      content: 'Untuk pertanyaan terkait privasi data, silakan hubungi tim UPK-Kr melalui halaman Kontak atau email langsung ke pengurus.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--cream)] via-white to-[var(--cream)]">
      <div className="max-w-3xl mx-auto px-6 py-20 space-y-12 animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>

        <div className="space-y-4">
          <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-black text-[var(--brown-dark)]">Kebijakan Privasi</h1>
          <p className="text-[var(--text-muted)] leading-relaxed">
            UPK-Kr Konseling berkomitmen menjaga privasi dan kerahasiaan seluruh anggota. Kebijakan ini menjelaskan bagaimana kami mengelola data Anda.
          </p>
          <p className="text-xs text-[var(--text-muted)]">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 border border-[var(--cream-dark)] shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--terra)]/10 text-[var(--terra)] flex items-center justify-center">
                  {section.icon}
                </div>
                <h2 className="text-lg font-bold text-[var(--brown-dark)]">{section.title}</h2>
              </div>
              <p className="text-sm text-[var(--text)] leading-relaxed pl-[52px]">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

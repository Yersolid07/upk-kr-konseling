// src/app/terms/page.tsx
import Link from 'next/link'
import { ArrowLeft, FileText, Users, Shield, AlertTriangle, Scale, CheckCircle } from 'lucide-react'

export default function TermsPage() {
  const sections = [
    {
      icon: <Users size={20} />,
      title: '1. Keanggotaan',
      content: 'Platform ini ditujukan untuk mahasiswa dan alumni UPK-Kr FT UNSRAT. Dengan mendaftar, Anda menyatakan bahwa Anda adalah anggota atau alumni yang sah. Informasi yang Anda berikan saat pendaftaran harus akurat dan benar.'
    },
    {
      icon: <Shield size={20} />,
      title: '2. Kerahasiaan',
      content: 'Anda wajib menjaga kerahasiaan sesi konseling dan percakapan di platform. Dilarang keras menyebarkan, menangkap layar, atau membagikan isi percakapan konseling tanpa persetujuan semua pihak yang terlibat.'
    },
    {
      icon: <CheckCircle size={20} />,
      title: '3. Penggunaan yang Bertanggung Jawab',
      content: 'Pengguna wajib menggunakan platform dengan itikad baik. Dilarang mengirim konten yang mengandung SARA, pornografi, ujaran kebencian, atau konten yang melanggar hukum. Penyalahgunaan fitur anonim untuk intimidasi akan dikenakan sanksi.'
    },
    {
      icon: <AlertTriangle size={20} />,
      title: '4. Batasan Layanan',
      content: 'Layanan konseling di platform ini bukan pengganti layanan kesehatan mental profesional. Dalam situasi krisis, kami akan merujuk Anda ke tenaga medis profesional. Konselor UPK-Kr memberikan pendampingan spiritual dan psikologis dasar.'
    },
    {
      icon: <Scale size={20} />,
      title: '5. Sanksi Pelanggaran',
      content: 'Admin berhak menonaktifkan akun pengguna yang melanggar syarat dan ketentuan ini. Pelanggaran berat dapat dilaporkan ke pihak berwenang sesuai hukum yang berlaku.'
    },
    {
      icon: <FileText size={20} />,
      title: '6. Perubahan Ketentuan',
      content: 'UPK-Kr berhak mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan diumumkan melalui platform. Dengan terus menggunakan layanan setelah perubahan, Anda dianggap menyetujui ketentuan terbaru.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--cream)] via-white to-[var(--cream)]">
      <div className="max-w-3xl mx-auto px-6 py-20 space-y-12 animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>

        <div className="space-y-4">
          <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-black text-[var(--brown-dark)]">Syarat & Ketentuan</h1>
          <p className="text-[var(--text-muted)] leading-relaxed">
            Dengan menggunakan platform UPK-Kr Konseling, Anda menyetujui syarat dan ketentuan berikut.
          </p>
          <p className="text-xs text-[var(--text-muted)]">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 border border-[var(--cream-dark)] shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--sage)]/10 text-[var(--sage)] flex items-center justify-center">
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

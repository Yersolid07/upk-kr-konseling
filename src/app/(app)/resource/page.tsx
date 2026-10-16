// src/app/(app)/resource/page.tsx
import {
  Phone,
  BookOpen,
  HeartHandshake,
  ExternalLink,
  ShieldAlert,
  Clock,
  Users,
  Link2
} from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Resource Kesehatan | IKA UPK-Kr FT UNSRAT',
}

// Hanya tautan yang benar-benar ada dan bisa dibuka. Tidak ada tombol atau
// item karangan — kalau tidak ada isinya, kartunya menampilkan empty state.
const EXTERNAL_RESOURCES = [
  {
    title: 'Layanan Darurat & Kesehatan Jiwa',
    description:
      'Layanan resmi yang beroperasi: hotline krisis Kemenkes dan rumah sakit rujukan di Manado.',
    icon: <Phone size={24} className="text-[var(--danger)]" />,
    items: [
      { name: 'Healing119.id — krisis jiwa (Kemenkes)', detail: '119 ekst. 8', href: 'tel:119' },
      { name: "D'Patens — dukungan psikososial", detail: '0811 979 10000', href: 'tel:081197910000' },
      { name: 'RSUP Prof. Dr. R.D. Kandou Manado', detail: '(0431) 838203', href: 'tel:0431838203' },
      { name: 'Hotline Layanan IKA UPK-Kr FT UNSRAT', detail: 'Lihat halaman', href: '/hotline' },
    ],
  },
  {
    title: 'Belajar & Menolong Diri',
    description:
      'Panduan dan materi psikoedukasi yang bisa diakses gratis untuk memahami kondisi diri sendiri.',
    icon: <BookOpen size={24} className="text-[var(--sage)]" />,
    items: [
      {
        name: 'Kemenkes — Direktorat Kesehatan Jiwa',
        detail: 'kemkes.go.id',
        href: 'https://kesprimkom.kemkes.go.id/',
      },
      {
        name: 'Healing119.id — informasi & chat',
        detail: 'healing119.id',
        href: 'https://healing119.id/',
      },
      {
        name: 'WHO — Kesehatan Mental',
        detail: 'who.int',
        href: 'https://www.who.int/health-topics/mental-health',
      },
    ],
  },
  {
    title: 'Bertumbuh Bersama',
    description:
      'Ruang di dalam aplikasi ini untuk berbagi beban dan bertumbuh bersama komunitas IKA UPK-Kr FT UNSRAT.',
    icon: <HeartHandshake size={24} className="text-[var(--terra)]" />,
    items: [
      { name: 'Forum Diskusi — topik terkurasi', detail: 'Buka', href: '/forum' },
      { name: 'Prayer Wall — minta dukungan doa', detail: 'Buka', href: '/prayer' },
      { name: 'Renungan & Artikel', detail: 'Baca', href: '/renungan' },
      { name: 'KK & KTB — kelompok kecil', detail: 'Buka', href: '/cellgroup' },
    ],
  },
]

export default function ResourcePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      <section className="text-center space-y-4">
        <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brown-dark)]">
          Resource Kesehatan
        </h1>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
          Kumpulan layanan, materi, dan ruang di dalam aplikasi untuk mendukung kesehatan
          mental dan pertumbuhan rohani Anda.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {EXTERNAL_RESOURCES.map((res) => (
          <div key={res.title} className="card-premium p-6 sm:p-8 space-y-6 flex flex-col">
            <div className="w-14 h-14 rounded-2xl bg-[var(--cream)] flex items-center justify-center shrink-0">
              {res.icon}
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--brown-dark)]">{res.title}</h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{res.description}</p>
            </div>
            <div className="space-y-1 pt-4 border-t border-[var(--cream-dark)]">
              {res.items.map((item) => {
                const external = item.href.startsWith('http')
                const className =
                  'flex items-center justify-between gap-3 py-2.5 rounded-lg group/item hover:bg-[var(--cream)]/60 transition-colors -mx-1 px-1'
                const body = (
                  <>
                    <span className="text-sm font-medium text-[var(--brown)] group-hover/item:text-[var(--terra)] transition-colors">
                      {item.name}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                        {item.detail}
                      </span>
                      <ExternalLink size={12} className="text-[var(--text-muted)]" />
                    </span>
                  </>
                )
                return external ? (
                  <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {body}
                  </a>
                ) : (
                  <Link key={item.name} href={item.href} className={className}>
                    {body}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Crisis guidance — menggantikan "Wellness Check" yang tidak punya fungsi */}
      <div className="card-premium p-6 sm:p-10 bg-gradient-to-br from-[var(--brown-dark)] to-[var(--brown)] text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <ShieldAlert size={30} className="text-[var(--gold-light)]" />
          </div>
          <div className="space-y-3 flex-1">
            <h2 className="font-[var(--font-playfair)] text-2xl sm:text-3xl font-bold">
              Kalau keadaanmu sedang berat
            </h2>
            <p className="text-white/75 max-w-2xl leading-relaxed">
              Kamu tidak harus melewatinya sendirian, dan kamu tidak perlu menunggu sampai
              semuanya terasa mustahil. Ceritakan pada seseorang hari ini — konselor kami,
              pembina KK/KTB, atau layanan krisis di bawah ini.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--brown-dark)] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[var(--cream)] transition-all shadow-xl"
              >
                Mulai Konseling
              </Link>
              <Link
                href="/hotline"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/25 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
              >
                <Clock size={14} /> Nomor Darurat
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 justify-center text-[var(--text-muted)] text-sm text-center">
        <Users size={16} className="shrink-0 mt-0.5" />
        <span>
          Ingin menambahkan materi atau layanan ke daftar ini? Sampaikan lewat{' '}
          <Link href="/contact" className="text-[var(--terra)] font-medium hover:underline">
            halaman kontak
          </Link>
          .
        </span>
      </div>
    </div>
  )
}

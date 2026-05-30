// src/app/resource/page.tsx
import { 
  Heart, 
  Shield, 
  Phone, 
  BookOpen, 
  Video, 
  FileText,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

export default function ResourcePage() {
  const resources = [
    {
      title: 'Emergency Contacts',
      description: 'Daftar hotline kesehatan mental dan layanan darurat di Manado & Nasional.',
      icon: <Phone size={24} className="text-red-500" />,
      items: [
        { name: 'Hotline Kemenkes', detail: '119 ext 9' },
        { name: 'RSUP Kandou Manado', detail: '(0431) 838203' }
      ]
    },
    {
      title: 'E-Books & Panduan',
      description: 'Materi tentang manajemen stres, depresi, dan kesehatan mental dari sudut pandang Kristiani.',
      icon: <BookOpen size={24} className="text-blue-500" />,
      items: [
        { name: 'Self-Care for Students', detail: 'PDF' },
        { name: 'Iman & Kesehatan Mental', detail: 'E-Book' }
      ]
    },
    {
      title: 'Video Edukasi',
      description: 'Kumpulan seminar dan webinar kesehatan mental UPK-Kr.',
      icon: <Video size={24} className="text-purple-500" />,
      items: [
        { name: 'Webinar: Overcoming Anxiety', detail: '1h 20m' },
        { name: 'Mental Health in Tech', detail: '45m' }
      ]
    }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      <section className="text-center space-y-4">
        <h1 className="font-[var(--font-playfair)] text-4xl md:text-6xl font-black text-[var(--brown-dark)]">Resource Kesehatan</h1>
        <p className="text-[var(--text-muted)] max-w-2xl mx-auto">
          Kumpulan materi dan alat bantu untuk mendukung kesehatan mental dan pertumbuhan rohani Anda.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {resources.map((res, i) => (
          <div key={i} className="card-premium p-8 space-y-6 flex flex-col">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-inner flex items-center justify-center">
              {res.icon}
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-xl font-bold text-[var(--brown-dark)]">{res.title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{res.description}</p>
            </div>
            <div className="space-y-3 pt-4 border-t border-[var(--cream-dark)]">
              {res.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm font-medium text-[var(--brown)] group-hover:text-[var(--terra)] transition-colors">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{item.detail}</span>
                    <ExternalLink size={12} className="text-[var(--text-muted)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Wellness Check section */}
      <div className="card-premium p-10 bg-gradient-to-br from-[var(--brown-dark)] to-[var(--brown)] text-white flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 text-center md:text-left">
          <h2 className="font-[var(--font-playfair)] text-3xl font-bold">Lakukan Wellness Check</h2>
          <p className="text-white/70 max-w-lg">
            Gunakan alat bantu penilaian diri kami untuk memahami kondisi kesehatan mental Anda hari ini.
          </p>
        </div>
        <button className="px-8 py-4 bg-white text-[var(--brown-dark)] font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-[var(--cream)] transition-all whitespace-nowrap shadow-xl">
           Mulai Tes Sekarang
        </button>
      </div>
    </div>
  )
}

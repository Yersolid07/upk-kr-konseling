// src/app/hotline/page.tsx
//
// Halaman ini SENGAJA berada di luar route group (app) supaya PUBLIK:
// orang yang sedang krisis dan belum punya akun harus tetap bisa melihat
// nomor darurat. Karena itu ia tidak memakai AppShell (tanpa sidebar) dan
// tidak butuh login.
//
// Data diambil dari tabel hotline_contacts dengan policy SELECT untuk
// anon + authenticated (lihat supabase/hotfix-security.sql A5).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Phone, MessageCircle, ShieldAlert, Heart, ExternalLink, Info, Link2, ArrowLeft
} from 'lucide-react'
import type { HotlineContact } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Layanan Hotline | IKA UPK-Kr FT UNSRAT' }

// Nomor cadangan bila tabel hotline_contacts belum diisi. Ini nomor resmi yang
// sudah diverifikasi — bukan karangan. Sumber:
//   Healing119.id (Kemenkes): 119 ekst. 8
//   D'Patens 24 jam: 0811 979 10000
// Super admin dapat mengubah daftar ini dari Panel Admin > Pengaturan Situs.
const FALLBACK: Pick<HotlineContact, 'id' | 'name' | 'description' | 'number' | 'display' | 'type' | 'note' | 'sort_order'>[] = [
  {
    id: 'fallback-119',
    name: 'Healing119.id (Kemenkes)',
    description:
      'Layanan dukungan psikologis awal untuk krisis psikologis dan pikiran menyakiti diri. Panggil 119 lalu tekan ekstensi 8, atau chat WhatsApp lewat healing119.id.',
    number: '119',
    display: '119 ekst. 8',
    type: 'phone',
    note: 'Jam kerja',
    sort_order: 1,
  },
  {
    id: 'fallback-dpatens',
    name: "D'Patens 24 Jam",
    description:
      'Dukungan psikososial melalui hotline layanan 24 jam dari Kementerian Kesehatan, untuk situasi yang tidak bisa menunggu.',
    number: '081197910000',
    display: '0811 979 10000',
    type: 'phone',
    note: '24 jam',
    sort_order: 2,
  },
  {
    id: 'fallback-112',
    name: 'Darurat Umum',
    description:
      'Nomor darurat nasional untuk situasi yang mengancam nyawa. Petugas akan mengarahkan ke layanan medis terdekat.',
    number: '112',
    display: '112',
    type: 'phone',
    note: '24 jam',
    sort_order: 3,
  },
]

function hrefFor(h: { type: string; number: string }) {
  if (h.type === 'whatsapp') return `https://wa.me/${h.number.replace(/\D/g, '')}`
  if (h.type === 'url') return h.number
  return `tel:${h.number.replace(/\s/g, '')}`
}

function iconFor(type: string) {
  if (type === 'whatsapp') return <MessageCircle size={24} />
  if (type === 'url') return <Link2 size={24} />
  return <ShieldAlert size={24} />
}

function colorFor(index: number, type: string) {
  if (type === 'whatsapp') return 'var(--sage)'
  if (index === 0) return 'var(--danger)'
  if (index === 1) return 'var(--brown)'
  return 'var(--terra)'
}

export default async function HotlinePage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('hotline_contacts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const list = ((data && data.length > 0 ? data : FALLBACK) as HotlineContact[])

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10 sm:space-y-12 animate-fade-in pb-20">
        {/* Halaman ini publik: pengunjung yang belum login tidak punya sidebar,
            jadi sediakan jalan kembali ke beranda. */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors"
        >
          <ArrowLeft size={16} /> Kembali
        </Link>

        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-red-50 text-[var(--danger)] rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-red-100">
            <ShieldAlert size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--brown-dark)]">
              Layanan Hotline
            </h1>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              Kami hadir untuk Anda. Jangan ragu menghubungi nomor di bawah ini jika Anda
              membutuhkan bantuan segera.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {list.map((item, idx) => (
            <div
              key={item.id}
              className="card-premium p-6 sm:p-8 group hover-lift flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: colorFor(idx, item.type) }}
                >
                  {iconFor(item.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg sm:text-xl text-[var(--brown-dark)]">{item.name}</h2>
                    {item.note && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--cream-dark)] text-[var(--text-muted)]">
                        {item.note}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <a
                href={hrefFor(item)}
                target={item.type === 'phone' ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--cream)] border border-[var(--cream-dark)] group-hover:border-[var(--terra)] group-hover:bg-white transition-all"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    Hubungi Sekarang
                  </span>
                  <p className="font-bold text-[var(--brown-dark)] text-base sm:text-lg truncate">
                    {item.display ?? item.number}
                  </p>
                </div>
                <div className="w-10 h-10 shrink-0 rounded-full bg-white flex items-center justify-center text-[var(--terra)] shadow-sm group-hover:bg-[var(--terra)] group-hover:text-white transition-all">
                  {item.type === 'phone' ? <Phone size={18} /> : <ExternalLink size={18} />}
                </div>
              </a>
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="card-premium p-6 sm:p-8 bg-gradient-to-br from-[var(--brown-dark)] to-[#6B4A30] text-white flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <Heart size={36} className="text-[var(--gold-light)]" />
          </div>
          <div className="space-y-3 text-center md:text-left">
            <h3 className="font-[var(--font-playfair)] text-2xl font-bold">
              &ldquo;Tuhan dekat kepada orang-orang yang patah hati&rdquo;
            </h3>
            <p className="text-white/70 text-sm italic max-w-2xl">
              &ldquo;Dan Ia menyelamatkan orang-orang yang remuk jiwanya.&rdquo; — Mazmur 34:19.
              Ingatlah bahwa Anda tidak sendirian dalam perjuangan ini.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 justify-center text-[var(--text-muted)] text-sm text-center">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Jika Anda dalam bahaya langsung, segera hubungi 112 atau datang ke IGD terdekat.
            Layanan 119 ekst. 8 beroperasi pada jam kerja; D&apos;Patens tersedia 24 jam.
          </span>
        </div>
      </div>
    </div>
  )
}

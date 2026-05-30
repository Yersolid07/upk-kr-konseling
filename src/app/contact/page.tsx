// src/app/contact/page.tsx
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, Clock, ExternalLink } from 'lucide-react'

export default function ContactPage() {
  const contacts = [
    {
      icon: <MessageCircle size={24} />,
      label: 'WhatsApp Pengurus',
      value: process.env.NEXT_PUBLIC_SOS_WA_NUMBER || '628xxxxxxxxxxxx',
      href: `https://wa.me/${(process.env.NEXT_PUBLIC_SOS_WA_NUMBER || '628xxxxxxxxxxxx').replace(/\D/g, '')}`,
      color: 'var(--sage)',
      desc: 'Respon cepat untuk pertanyaan umum'
    },
    {
      icon: <Mail size={24} />,
      label: 'Email',
      value: 'upk-kr@ft.unsrat.ac.id',
      href: 'mailto:upk-kr@ft.unsrat.ac.id',
      color: 'var(--terra)',
      desc: 'Untuk korespondensi resmi'
    },
    {
      icon: <Phone size={24} />,
      label: 'Telepon Kantor',
      value: '(0431) 863886',
      href: 'tel:0431863886',
      color: 'var(--brown)',
      desc: 'Senin - Jumat, 08:00 - 16:00 WITA'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--cream)] via-white to-[var(--cream)]">
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-12 animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </Link>

        <div className="text-center space-y-4">
          <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-black text-[var(--brown-dark)]">Hubungi Kami</h1>
          <p className="text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
            Tim UPK-Kr siap melayani Anda. Jangan ragu untuk menghubungi kami melalui salah satu saluran di bawah ini.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {contacts.map((contact, idx) => (
            <a
              key={idx}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-3xl p-8 border border-[var(--cream-dark)] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group text-center space-y-4"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto group-hover:scale-110 transition-transform"
                style={{ backgroundColor: contact.color }}
              >
                {contact.icon}
              </div>
              <div>
                <h3 className="font-bold text-[var(--brown-dark)] text-lg">{contact.label}</h3>
                <p className="text-sm text-[var(--terra)] font-bold mt-1">{contact.value}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-2">{contact.desc}</p>
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Buka <ExternalLink size={10} />
              </div>
            </a>
          ))}
        </div>

        {/* Address */}
        <div className="bg-white rounded-3xl p-10 border border-[var(--cream-dark)] shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-2xl bg-[var(--cream)] flex items-center justify-center text-[var(--brown)] shrink-0">
            <MapPin size={36} />
          </div>
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold text-[var(--brown-dark)]">Alamat Sekretariat</h3>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Sekretariat UPK-Kr. Fakultas Teknik<br />
              Universitas Sam Ratulangi<br />
              Jl. Kampus Unsrat, Bahu, Malalayang<br />
              Manado, Sulawesi Utara 95115
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] ml-auto shrink-0">
            <Clock size={14} />
            <span>Sen-Jum: 08:00 - 16:00 WITA</span>
          </div>
        </div>
      </div>
    </div>
  )
}

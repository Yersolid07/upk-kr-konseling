// src/app/hotline/page.tsx
import { 
  Phone, 
  MessageCircle, 
  ShieldAlert, 
  Clock, 
  Heart,
  ExternalLink,
  Info
} from 'lucide-react'
import Link from 'next/link'

export default function HotlinePage() {
  const HOTLINES = [
    {
      name: 'Konselor Jaga UPK-Kr',
      description: 'Layanan konseling cepat via WhatsApp untuk situasi mendesak.',
      number: process.env.NEXT_PUBLIC_SOS_WA_NUMBER || '08123456789',
      icon: <MessageCircle size={24} />,
      color: 'var(--sage)',
      type: 'whatsapp'
    },
    {
      name: 'Hotline Darurat Mental Health',
      description: 'Layanan nasional untuk pencegahan tindakan menyakiti diri.',
      number: '119',
      icon: <ShieldAlert size={24} />,
      color: 'var(--danger)',
      type: 'phone'
    },
    {
      name: 'Kantor UPK-Kr (Pusat)',
      description: 'Hubungi untuk informasi administrasi atau janji temu luring.',
      number: '022-1234567',
      icon: <Phone size={24} />,
      color: 'var(--brown)',
      type: 'phone'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-red-50 text-[var(--danger)] rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-red-100">
           <ShieldAlert size={40} />
        </div>
        <div className="space-y-2">
           <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-black text-[var(--brown-dark)]">Layanan Hotline</h1>
           <p className="text-[var(--text-muted)] max-w-xl mx-auto">
             Kami hadir untuk Anda. Jangan ragu untuk menghubungi nomor-nomor di bawah ini jika Anda membutuhkan bantuan segera.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {HOTLINES.map((item, idx) => (
          <div key={idx} className="card-premium p-8 group hover-lift flex flex-col justify-between space-y-6">
             <div className="space-y-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: item.color }}
                >
                  {item.icon}
                </div>
                <div>
                   <h3 className="font-bold text-xl text-[var(--brown-dark)]">{item.name}</h3>
                   <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                     {item.description}
                   </p>
                </div>
             </div>
             
             <a 
               href={item.type === 'whatsapp' ? `https://wa.me/${item.number.replace(/\D/g, '')}` : `tel:${item.number}`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center justify-between p-4 rounded-2xl bg-[var(--cream)] border border-[var(--cream-dark)] group-hover:border-[var(--terra)] group-hover:bg-white transition-all"
             >
                <div className="space-y-0.5">
                   <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Hubungi Sekarang</span>
                   <p className="font-black text-[var(--brown-dark)] text-lg">{item.number}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[var(--terra)] shadow-sm group-hover:bg-[var(--terra)] group-hover:text-white transition-all">
                   <ExternalLink size={18} />
                </div>
             </a>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="card-premium p-8 bg-gradient-to-br from-[var(--brown-dark)] to-[#6B4A30] text-white flex flex-col md:flex-row items-center gap-8">
         <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <Heart size={36} className="text-[var(--gold-light)]" />
         </div>
         <div className="space-y-3 text-center md:text-left">
            <h3 className="font-[var(--font-playfair)] text-2xl font-bold">"Tuhan dekat kepada orang-orang yang patah hati"</h3>
            <p className="text-white/70 text-sm italic max-w-2xl">
              "Dan Ia menyelamatkan orang-orang yang remuk jiwanya." — Mazmur 34:19. Ingatlah bahwa Anda tidak sendirian dalam perjuangan ini.
            </p>
         </div>
      </div>

      <div className="flex items-center gap-2 justify-center text-[var(--text-muted)] text-sm">
         <Info size={16} />
         <span>Layanan ini tersedia 24 jam untuk situasi krisis dan darurat.</span>
      </div>
    </div>
  )
}

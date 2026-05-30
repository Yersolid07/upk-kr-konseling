// src/components/ui/SOSModal.tsx
'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'
import { 
  X, 
  MessageCircle, 
  Phone, 
  Heart, 
  Hospital, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function SOSModal() {
  const { sosOpen, setSosOpen } = useAppStore()
  const [loading, setLoading] = useState(false)

  if (!sosOpen) return null

  async function handleChatNow() {
    setLoading(true)
    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Butuh bantuan segera' }),
      })
      const data = await res.json()
      if (data.session_id) {
        setSosOpen(false)
        window.location.href = `/chat/${data.session_id}`
      }
    } catch {
      toast.error('Gagal menghubungi konselor. Coba hotline langsung.')
    }
    setLoading(false)
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={() => setSosOpen(false)}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border-t-4 border-red-500 animate-fade-up relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-red-50/50">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
              <AlertTriangle size={24} />
            </div>
            <button
              onClick={() => setSosOpen(false)}
              className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400 border-none cursor-pointer bg-transparent"
            >
              <X size={20} />
            </button>
          </div>
          <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-red-600">
            Bantuan Darurat
          </h2>
          <p className="text-sm text-red-900/60 mt-2 leading-relaxed">
            Kami peduli dengan keselamatanmu. Pilih salah satu opsi bantuan di bawah — tim konselor siap membantu.
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          <SOSOption
            icon={<MessageCircle size={24} />}
            title="Chat Konselor Sekarang"
            desc="Terhubung ke konselor yang sedang online"
            onClick={handleChatNow}
            loading={loading}
            primary
          />
          <SOSOption
            icon={<Phone size={24} />}
            title="Hotline Into The Light"
            desc="Layanan pencegahan bunuh diri · 24 Jam"
            onClick={() => window.open('tel:119')}
          />
          <SOSOption
            icon={<Heart size={24} />}
            title="WhatsApp Konselor Piket"
            desc="Respons cepat dalam 15 menit"
            onClick={() => window.open(`https://wa.me/${process.env.NEXT_PUBLIC_SOS_WA_NUMBER}`)}
          />
          <SOSOption
            icon={<Hospital size={24} />}
            title="RSJ Prof. Dr. V. L. Ratumbuysang"
            desc="RS Jiwa Manado · (0431) 863155"
            onClick={() => window.open('tel:0431863155')}
          />
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={12} className="text-[var(--sage)]" />
            Identitasmu Terlindungi Sepenuhnya
          </div>
          <p className="text-[11px] text-[var(--text-muted)] text-center italic">
            "Sebab Ia akan memberi perintah kepada malaikat-malaikat-Nya mengenai engkau untuk menjaga engkau di segala jalanmu." · Mazmur 91:11
          </p>
        </div>
      </div>
    </div>
  )
}

function SOSOption({ icon, title, desc, onClick, loading, primary }: {
  icon: React.ReactNode; 
  title: string; 
  desc: string; 
  onClick: () => void; 
  loading?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={loading ? undefined : onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group cursor-pointer",
        loading ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg active:scale-[0.98]",
        primary 
          ? "bg-red-600 border-red-700 text-white hover:bg-red-700" 
          : "bg-white border-[var(--cream-dark)] hover:border-red-200"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-inner",
        primary ? "bg-white/20 text-white" : "bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white"
      )}>
        {loading ? <Loader2 className="animate-spin" size={24} /> : icon}
      </div>
      <div className="flex-1">
        <div className={cn("text-sm font-bold", primary ? "text-white" : "text-[var(--text)]")}>{title}</div>
        <div className={cn("text-[11px] mt-0.5", primary ? "text-white/70" : "text-[var(--text-muted)]")}>{desc}</div>
      </div>
      <ArrowRight 
        size={18} 
        className={cn(
          "transition-transform group-hover:translate-x-1",
          primary ? "text-white/50" : "text-[var(--cream-dark)] group-hover:text-red-300"
        )} 
      />
    </button>
  )
}

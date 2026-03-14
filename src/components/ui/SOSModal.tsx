// src/components/ui/SOSModal.tsx
'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'

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
    <div className="overlay" onClick={() => setSosOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ borderTop: '4px solid var(--danger)' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ color: 'var(--danger)' }}>🆘 Bantuan Darurat</h2>
          <button
            onClick={() => setSosOpen(false)}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: 'var(--cream)', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >✕</button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>
          Kami peduli dengan keselamatanmu. Pilih salah satu opsi bantuan di bawah — tim konselor siap membantu.
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          <SOSOption
            icon="💬"
            title="Chat Konselor Sekarang"
            desc="Terhubung ke konselor yang sedang online"
            onClick={handleChatNow}
            loading={loading}
          />
          <SOSOption
            icon="📞"
            title="Hotline Into The Light"
            desc="119 ext 8 · 24 jam tersedia"
            onClick={() => window.open('tel:119')}
          />
          <SOSOption
            icon="💚"
            title="WhatsApp Konselor Piket UPK-Kr"
            desc="Respons dalam 15 menit"
            onClick={() => window.open(`https://wa.me/${process.env.NEXT_PUBLIC_SOS_WA_NUMBER}`)}
          />
          <SOSOption
            icon="🏥"
            title="RSJ Prof. Dr. V. L. Ratumbuysang"
            desc="RS Jiwa Manado · (0431) 863155"
            onClick={() => window.open('tel:0431863155')}
          />
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
          🔒 Identitasmu terlindungi. Kami ada untukmu. <br/>
          Kamu tidak sendirian. Tuhan menyertaimu. 🙏
        </p>
      </div>
    </div>
  )
}

function SOSOption({ icon, title, desc, onClick, loading }: {
  icon: string; title: string; desc: string; onClick: () => void; loading?: boolean
}) {
  return (
    <div
      onClick={loading ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: 16, borderRadius: 12,
        border: '1.5px solid var(--cream-dark)',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
        background: 'var(--cream)'
      }}
      onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.borderColor = 'var(--danger)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--cream-dark)')}
    >
      <span style={{ fontSize: 26 }}>{loading ? '⏳' : icon}</span>
      <div>
        <strong style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'block' }}>{title}</strong>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</span>
      </div>
      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 18 }}>→</span>
    </div>
  )
}

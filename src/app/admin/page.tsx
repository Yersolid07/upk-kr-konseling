// src/app/admin/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

type Tab = 'users' | 'konselor-pending' | 'reports' | 'identity'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<Profile[]>([])
  const [pendingKonselor, setPendingKonselor] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('profiles').select('*').order('created_at', { ascending: false })
    const { data } = search ? await q.ilike('full_name', `%${search}%`) : await q
    setUsers(data ?? [])
    setLoading(false)
  }, [search])

  const fetchPendingKonselor = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'member')
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
    setPendingKonselor(data ?? [])
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchPendingKonselor()
  }, [fetchUsers, fetchPendingKonselor])

  async function assignRole(userId: string, role: string, specialization?: string[]) {
    const res = await fetch('/api/admin/assign-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role, specialization, is_verified: role === 'konselor' }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`Role berhasil diubah menjadi ${role}`)
      fetchUsers()
      fetchPendingKonselor()
    } else {
      toast.error(data.error ?? 'Gagal mengubah role')
    }
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'users',            label: 'Semua Pengguna', icon: '👤' },
    { id: 'konselor-pending', label: 'Tambah Konselor', icon: '💬' },
    { id: 'reports',          label: 'Laporan Konten',  icon: '🚩' },
    { id: 'identity',         label: 'Buka Identitas (Darurat)', icon: '🔓' },
  ]

  return (
    <div>
      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'btn-primary' : 'btn-secondary'}
            style={{ width: 'auto', padding: '9px 16px', fontSize: 13 }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Daftar Pengguna ({users.length})</span>
            <input
              className="form-input"
              style={{ width: 200, padding: '8px 12px', fontSize: 13 }}
              placeholder="Cari nama..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nama', 'Email', 'Angkatan', 'Role', 'Status', 'Bergabung', 'Aksi'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', borderBottom: '2px solid var(--cream-dark)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--cream)' }}>
                    <td style={{ padding: '12px 14px', fontSize: 14 }}><strong>{u.full_name}</strong></td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>—</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{u.angkatan ?? '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`tag ${u.role === 'konselor' ? 'tag-iman' : u.role === 'admin' ? 'tag-cemas' : ''}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`status-badge ${u.is_verified ? 'status-verified' : u.is_active ? 'status-active' : 'status-pending'}`}>
                        {u.is_verified ? 'Terverifikasi' : u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <RoleDropdown user={u} onAssign={assignRole} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ASSIGN KONSELOR TAB ── */}
      {tab === 'konselor-pending' && (
        <div>
          <div className="role-info-banner" style={{ marginBottom: 20 }}>
            <span>ℹ️</span>
            <span>
              Untuk menjadikan seseorang konselor, cari nama mereka di tab <strong>Semua Pengguna</strong> dan ubah role-nya ke <strong>Konselor</strong>.
              Atau, jika mereka sudah mengajukan permohonan, tampil di sini.
            </span>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Permohonan Konselor</span>
            </div>
            <div className="card-body">
              {pendingKonselor.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: 20 }}>
                  Tidak ada permohonan konselor saat ini.
                </p>
              ) : pendingKonselor.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--cream)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--terra), var(--brown))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', fontWeight: 700, flexShrink: 0 }}>
                    {u.full_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>{u.full_name}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Angkatan {u.angkatan ?? '—'} · {u.jurusan ?? '—'}</div>
                  </div>
                  <button
                    className="btn-primary"
                    style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
                    onClick={() => assignRole(u.id, 'konselor')}
                  >
                    ✓ Jadikan Konselor
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Laporan Konten</span></div>
          <div className="card-body">
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Belum ada laporan yang masuk.</p>
          </div>
        </div>
      )}

      {/* ── IDENTITY REVEAL TAB ── */}
      {tab === 'identity' && (
        <div>
          <div className="error-banner" style={{ marginBottom: 20 }}>
            ⚠️ <strong>Peringatan:</strong> Fitur ini hanya untuk keadaan darurat (ancaman bahaya nyata). Setiap pembukaan identitas dicatat dalam audit log dan tidak dapat dihapus.
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">🔓 Buka Identitas Darurat</span></div>
            <div className="card-body">
              <IdentityRevealForm />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RoleDropdown({ user, onAssign }: { user: Profile; onAssign: (id: string, role: string) => void }) {
  const [open, setOpen] = useState(false)
  const roles = ['member', 'moderator', 'konselor', 'admin']
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn-secondary"
        style={{ fontSize: 12, padding: '5px 12px' }}
        onClick={() => setOpen(!open)}
      >
        Ubah Role ▾
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: 'var(--white)', borderRadius: 10, boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--cream-dark)', zIndex: 99, overflow: 'hidden', minWidth: 140
          }}>
            {roles.map(r => (
              <button
                key={r}
                onClick={() => { onAssign(user.id, r); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 14px', border: 'none', background: user.role === r ? 'var(--cream-dark)' : 'transparent',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  color: r === 'konselor' ? 'var(--gold)' : r === 'admin' ? 'var(--terra)' : 'var(--text)',
                  fontWeight: user.role === r ? 700 : 400,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                onMouseLeave={e => (e.currentTarget.style.background = user.role === r ? 'var(--cream-dark)' : 'transparent')}
              >
                {r === 'konselor' ? '💬 ' : r === 'admin' ? '⚙️ ' : ''}
                {r.charAt(0).toUpperCase() + r.slice(1)}
                {user.role === r ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function IdentityRevealForm() {
  const [anonCode, setAnonCode] = useState('')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const supabase = createClient()

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) { toast.error('Wajib mengisi alasan.'); return }
    // Find profile by anon_token
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, angkatan, jurusan')
      .eq('anon_token', anonCode.toLowerCase())
      .single()
    if (!data) { toast.error('Kode anonim tidak ditemukan.'); return }
    // Log the reveal (audit trail)
    await supabase.from('identity_reveal_log').insert({
      requested_by: (await supabase.auth.getUser()).data.user!.id,
      revealed_user_id: data.id,
      reason,
    })
    setResult(`${data.full_name} · Angkatan ${data.angkatan ?? '—'} · ${data.jurusan ?? '—'}`)
    toast.success('Identitas berhasil dibuka. Tindakan ini telah dicatat.')
  }

  return (
    <form onSubmit={handleReveal} style={{ maxWidth: 400 }}>
      <div className="form-group">
        <label className="form-label">Kode Anonim</label>
        <input className="form-input" placeholder="Contoh: a3f9 (dari tampilan Anonim#A3F9)" value={anonCode} onChange={e => setAnonCode(e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">Alasan Pembukaan (wajib)</label>
        <textarea className="form-input" placeholder="Contoh: Pengguna mengindikasikan ancaman bahaya diri pada thread #..." value={reason} onChange={e => setReason(e.target.value)} rows={3} required style={{ resize: 'vertical' }} />
      </div>
      {result && (
        <div className="success-banner">✅ Identitas: <strong>{result}</strong></div>
      )}
      <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--danger), #a93226)' }}>
        🔓 Buka Identitas
      </button>
    </form>
  )
}

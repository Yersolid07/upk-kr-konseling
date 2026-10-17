// src/app/(app)/admin/laporan/page.tsx
// Panel moderasi (pindah dari /admin ke /admin/laporan).
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, MessageCircle, ShieldCheck, Flag, Unlock, Info, AlertTriangle,
  Check, ChevronDown, type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/database'

function getModerationAuthor(row: { is_anonymous?: boolean; anon_label?: string | null; author_name?: string | null }) {
  return row.is_anonymous ? `Anonim#${row.anon_label ?? '????'}` : row.author_name ?? 'Pengguna'
}

type Tab = 'users' | 'konselor-pending' | 'reports' | 'identity' | 'content'

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
    // Lewat Server Action (bukan route handler): guard, validasi zod, dan
    // audit dijalankan di satu tempat yang sama. Route /api/admin/assign-role
    // sudah dinonaktifkan karena tidak memeriksa peringkat peran target.
    const { assignRole: doAssign } = await import('../actions')
    const res = await doAssign({
      user_id: userId,
      role,
      specialization,
      is_verified: role === 'konselor',
    })
    if ('error' in res) {
      toast.error(res.error)
    } else {
      toast.success(`Peran berhasil diubah menjadi ${role}`)
      fetchUsers()
      fetchPendingKonselor()
    }
  }

  const TABS: { id: Tab | 'content'; label: string; icon: LucideIcon }[] = [
    { id: 'users',            label: 'Semua Pengguna', icon: Users },
    { id: 'konselor-pending', label: 'Tambah Konselor', icon: MessageCircle },
    { id: 'content',          label: 'Moderasi Konten', icon: ShieldCheck },
    { id: 'reports',          label: 'Laporan Konten',  icon: Flag },
    { id: 'identity',         label: 'Buka Identitas (Darurat)', icon: Unlock },
  ]

  return (
    <div>
      {/* Tab buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'btn-primary' : 'btn-secondary'}
            style={{ width: 'auto', padding: '9px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <Icon size={15} /> {t.label}
          </button>
          )
        })}
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
            <Info size={16} />
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
                    <Check size={14} /> Jadikan Konselor
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT MODERATION TAB ── */}
      {tab === 'content' && (
        <ContentModeration />
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
            <AlertTriangle size={16} /> <strong>Peringatan:</strong> Fitur ini hanya untuk keadaan darurat (ancaman bahaya nyata). Setiap pembukaan identitas dicatat dalam audit log dan tidak dapat dihapus.
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Unlock size={16} /> Buka Identitas Darurat</span></div>
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Ubah Role <ChevronDown size={13} />
        </span>
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
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '9px 14px', border: 'none', background: user.role === r ? 'var(--cream-dark)' : 'transparent',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  color: r === 'konselor' ? 'var(--gold)' : r === 'admin' ? 'var(--terra)' : 'var(--text)',
                  fontWeight: user.role === r ? 700 : 400,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                onMouseLeave={e => (e.currentTarget.style.background = user.role === r ? 'var(--cream-dark)' : 'transparent')}
              >
                {r === 'konselor' ? <MessageCircle size={14} /> : r === 'admin' ? <ShieldCheck size={14} /> : <span style={{ width: 14 }} />}
                {r.charAt(0).toUpperCase() + r.slice(1)}
                {user.role === r ? <Check size={14} style={{ marginLeft: 'auto' }} /> : null}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function IdentityRevealForm() {
  // Menempelkan tautan atau ID konten, BUKAN awalan kode anonim. Awalan 4 huruf
  // bisa bentrok antar pengguna, dan pencarian identitas dari browser tidak
  // pernah tercatat. Server Action revealIdentity menulis log dulu (RPC
  // reveal_identity) baru mengembalikan identitas.
  const [contentRef, setContentRef] = useState('')
  const [contentType, setContentType] = useState<'thread' | 'comment' | 'prayer'>('thread')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult(null)

    const fd = new FormData()
    fd.set('content_ref', contentRef)
    fd.set('content_type', contentType)
    fd.set('reason', reason)

    const { revealIdentity } = await import('../actions')
    const res = await revealIdentity(fd)
    setBusy(false)

    if ('error' in res) {
      toast.error(res.error)
      return
    }
    setResult(res.identity)
    toast.success('Identitas dibuka. Tindakan ini tercatat di log audit.')
  }

  return (
    <form onSubmit={handleReveal} style={{ maxWidth: 460 }}>
      <div className="form-group">
        <label className="form-label">Jenis Konten</label>
        <select
          className="form-input"
          value={contentType}
          onChange={(e) => setContentType(e.target.value as 'thread' | 'comment' | 'prayer')}
        >
          <option value="thread">Diskusi (thread)</option>
          <option value="comment">Komentar</option>
          <option value="prayer">Permohonan doa</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Tautan atau ID Konten</label>
        <input
          className="form-input"
          placeholder="Tempelkan tautan konten, mis. /forum/3f2a… atau ID-nya"
          value={contentRef}
          onChange={(e) => setContentRef(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label">Alasan Pembukaan (wajib, min. 20 karakter)</label>
        <textarea
          className="form-input"
          placeholder="Contoh: Pengguna mengindikasikan ancaman bahaya diri pada diskusi ini."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          minLength={20}
          style={{ resize: 'vertical' }}
        />
      </div>
      {result && (
        <div className="success-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={15} /> Identitas: <strong>{result}</strong>
        </div>
      )}
      <button
        type="submit"
        className="btn-primary"
        disabled={busy}
        style={{ background: 'linear-gradient(135deg, var(--danger), #a93226)', display: 'inline-flex', alignItems: 'center', gap: 7, width: 'auto' }}
      >
        <Unlock size={15} /> {busy ? 'Memproses…' : 'Buka Identitas'}
      </button>
    </form>
  )
}

function ContentModeration() {
  const [content, setContent] = useState<any>({ threads: [], comments: [], prayers: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContent()
  }, [])

  async function fetchContent() {
    setLoading(true)
    const { getAdminContent } = await import('../actions')
    const res = await getAdminContent()
    if (!('error' in res)) setContent(res)
    setLoading(false)
  }

  async function handleDelete(type: 'thread' | 'comment' | 'prayer', id: string) {
    if (!confirm('Hapus konten ini secara permanen?')) return
    const { deleteContent } = await import('../actions')
    const res = await deleteContent(type, id)
    if ('error' in res) {
      toast.error(res.error)
    } else {
      toast.success('Konten berhasil dihapus')
      fetchContent()
    }
  }

  if (loading) return <div className="card-body text-center text-sm text-[var(--text-muted)]">Memuat data konten...</div>

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header"><span className="card-title">Moderasi Forum (Threads)</span></div>
        <div className="card-body">
          {content.threads?.map((t: any) => (
            <div key={t.id} className="py-3 border-b border-[var(--cream)] flex justify-between items-start">
              <div>
                <strong className="text-sm block">{t.title}</strong>
                <span className="text-xs text-[var(--text-muted)]">Oleh: {getModerationAuthor(t)}</span>
              </div>
              <button onClick={() => handleDelete('thread', t.id)} className="btn-icon text-red-500 text-xs px-2 border border-red-200 rounded">Hapus</button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="card">
        <div className="card-header"><span className="card-title">Moderasi Komentar</span></div>
        <div className="card-body">
          {content.comments?.map((c: any) => (
            <div key={c.id} className="py-3 border-b border-[var(--cream)] flex justify-between items-start">
              <div>
                <p className="text-sm line-clamp-2">{c.content}</p>
                <span className="text-xs text-[var(--text-muted)]">Oleh: {getModerationAuthor(c)}</span>
              </div>
              <button onClick={() => handleDelete('comment', c.id)} className="btn-icon text-red-500 text-xs px-2 border border-red-200 rounded">Hapus</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


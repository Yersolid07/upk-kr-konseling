// src/app/(app)/pengaturan/settings-panels.tsx
'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import {
  User, Lock, Bell, Palette, Loader2, Save, Eye, EyeOff, Check, Globe, Volume2, Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { updateProfile, changePassword } from './actions'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import type { Profile } from '@/types/database'

type Tab = 'profil' | 'akun' | 'notifikasi' | 'tampilan'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profil', label: 'Profil', icon: <User size={15} /> },
  { id: 'akun', label: 'Akun', icon: <Lock size={15} /> },
  { id: 'notifikasi', label: 'Notifikasi', icon: <Bell size={15} /> },
  { id: 'tampilan', label: 'Tampilan', icon: <Palette size={15} /> },
]

export function SettingsPanels({ profile, email }: { profile: Profile; email: string }) {
  const [tab, setTab] = useState<Tab>('profil')

  return (
    <div className="card-premium overflow-hidden">
      {/* Tab bar — bisa digeser di ponsel */}
      <div className="flex overflow-x-auto border-b border-[var(--cream-dark)] scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3.5 text-xs font-bold whitespace-nowrap transition-colors border-b-2 -mb-px',
              tab === t.id
                ? 'text-[var(--terra)] border-[var(--terra)]'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--brown-dark)]'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'profil' && <ProfileTab profile={profile} />}
        {tab === 'akun' && <AccountTab email={email} />}
        {tab === 'notifikasi' && <NotificationTab />}
        {tab === 'tampilan' && <AppearanceTab />}
      </div>
    </div>
  )
}

/* ─────────────────────────── PROFIL ─────────────────────────── */

function ProfileTab({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile.full_name ?? '',
    display_name: profile.display_name ?? '',
    bio: profile.bio ?? '',
    angkatan: profile.angkatan ?? '',
    jurusan: profile.jurusan ?? '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    const res = await updateProfile(form)
    setSaving(false)
    if (res?.error) return toast.error(res.error)
    toast.success('Profil tersimpan.')
    router.refresh()
  }

  const angkatanOptions = Array.from({ length: 57 }, (_, i) => String(2026 - i))

  return (
    <div className="space-y-4">
      <div className="pb-4 border-b border-[var(--cream-dark)]">
        <p className="text-xs font-bold text-[var(--brown-dark)] mb-2.5">Foto profil</p>
        <AvatarUpload userId={profile.id} fullName={profile.full_name} currentUrl={profile.avatar_url} />
      </div>

      <Field label="Nama lengkap" hint="Terlihat oleh anggota lain di forum dan doa.">
        <input className="form-input" value={form.full_name} onChange={set('full_name')} maxLength={80} />
      </Field>

      <Field label="Nama tampilan" hint="Nama pendek yang muncul di samping postingan. Kosongkan untuk memakai nama lengkap.">
        <input
          className="form-input"
          value={form.display_name}
          onChange={set('display_name')}
          maxLength={40}
          placeholder={profile.full_name}
        />
      </Field>

      <Field label="Bio" hint="Satu atau dua kalimat tentang Anda. Maksimal 500 karakter.">
        <textarea
          className="form-input resize-none"
          rows={3}
          value={form.bio}
          onChange={set('bio')}
          maxLength={500}
          placeholder="Alumni Teknik, bekerja di..."
        />
        <span className="text-[10px] text-[var(--text-muted)] mt-1 block">{form.bio.length}/500</span>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Angkatan">
          <select className="form-input" value={form.angkatan} onChange={(e) => setForm((f) => ({ ...f, angkatan: e.target.value }))}>
            <option value="">Pilih</option>
            {angkatanOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </Field>
        <Field label="Jurusan">
          <input className="form-input" value={form.jurusan} onChange={set('jurusan')} maxLength={80} placeholder="Teknik Informatika" />
        </Field>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary !w-auto inline-flex items-center gap-2">
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </div>
  )
}

/* ─────────────────────────── AKUN ─────────────────────────── */

function AccountTab({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (next !== confirm) return toast.error('Konfirmasi kata sandi tidak cocok.')
    setSaving(true)
    const res = await changePassword({ current, next })
    setSaving(false)
    if (res?.error) return toast.error(res.error)
    toast.success('Kata sandi diubah.')
    setCurrent(''); setNext(''); setConfirm('')
  }

  const strength = passwordStrength(next)

  return (
    <div className="space-y-4">
      <Field label="Alamat email" hint="Email tidak dapat diubah sendiri. Hubungi pengurus bila perlu dipindahkan.">
        <input className="form-input bg-[var(--cream)]/50" value={email} readOnly disabled />
      </Field>

      <div className="h-px bg-[var(--cream-dark)] my-2" />

      <p className="text-xs font-bold text-[var(--brown-dark)]">Ubah kata sandi</p>

      <Field label="Kata sandi saat ini">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            className="form-input pr-11"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brown-dark)]"
            aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <Field label="Kata sandi baru" hint="Minimal 8 karakter.">
        <input
          type={show ? 'text' : 'password'}
          className="form-input"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
        />
        {next && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-[var(--cream-dark)] overflow-hidden">
              <div
                className={cn('h-full transition-all', strength.color)}
                style={{ width: `${strength.score * 25}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)]">{strength.label}</span>
          </div>
        )}
      </Field>

      <Field label="Ulangi kata sandi baru">
        <input
          type={show ? 'text' : 'password'}
          className="form-input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {confirm && next !== confirm && (
          <span className="text-[10px] text-red-600 mt-1 block">Belum cocok.</span>
        )}
      </Field>

      <button
        onClick={save}
        disabled={saving || !current || next.length < 8 || next !== confirm}
        className="btn-primary !w-auto inline-flex items-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        {saving ? 'Menyimpan...' : 'Ubah Kata Sandi'}
      </button>
    </div>
  )
}

function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: 'Sangat lemah', color: 'bg-red-400' },
    { label: 'Lemah', color: 'bg-orange-400' },
    { label: 'Cukup', color: 'bg-yellow-400' },
    { label: 'Kuat', color: 'bg-[var(--sage)]' },
    { label: 'Sangat kuat', color: 'bg-[var(--sage)]' },
  ]
  return { score, ...map[score] }
}

/* ─────────────────────────── NOTIFIKASI ─────────────────────────── */

/**
 * Preferensi notifikasi disimpan di perangkat ini, bukan di server.
 *
 * Belum ada tabel preferensi di basis data, dan menambahkannya berarti migrasi
 * baru untuk sesuatu yang belum dipakai pengiriman nyata. Saat pengiriman
 * email/push benar-benar diterapkan, pindahkan ke kolom profil — komentar ini
 * penanda tempatnya.
 */
function NotificationTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    forum_reply: true,
    prayer_amen: true,
    chat_message: true,
    booking_reminder: true,
    broadcast: true,
    email_digest: false,
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('upk.notif.prefs')
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }))
    } catch {
      /* penyimpanan tidak tersedia — pakai bawaan */
    }
  }, [])

  const toggle = (key: string) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    try {
      localStorage.setItem('upk.notif.prefs', JSON.stringify(next))
    } catch {
      /* abaikan */
    }
  }

  const rows = [
    { key: 'forum_reply', icon: <Mail size={16} />, title: 'Balasan di forum', hint: 'Saat seseorang membalas diskusi Anda' },
    { key: 'prayer_amen', icon: <Volume2 size={16} />, title: 'Doa didoakan', hint: 'Saat orang lain mendoakan permintaan Anda' },
    { key: 'chat_message', icon: <Mail size={16} />, title: 'Pesan konselor', hint: 'Saat konselor membalas percakapan' },
    { key: 'booking_reminder', icon: <Bell size={16} />, title: 'Pengingat jadwal', hint: 'Satu jam sebelum sesi dimulai' },
    { key: 'broadcast', icon: <Bell size={16} />, title: 'Pengumuman pengurus', hint: 'Kabar kegiatan dan informasi penting' },
    { key: 'email_digest', icon: <Mail size={16} />, title: 'Ringkasan email mingguan', hint: 'Rangkuman aktivitas dikirim ke email' },
  ]

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed">
        Atur notifikasi yang ingin Anda terima. Pengaturan ini tersimpan di perangkat ini.
      </p>
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-3 py-3 border-b border-[var(--cream-dark)] last:border-0">
          <span className="w-8 h-8 rounded-lg bg-[var(--cream)] text-[var(--brown)] flex items-center justify-center shrink-0">
            {r.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--brown-dark)]">{r.title}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{r.hint}</p>
          </div>
          <button
            role="switch"
            aria-checked={prefs[r.key]}
            aria-label={r.title}
            onClick={() => toggle(r.key)}
            className={cn(
              'w-11 h-6 rounded-full transition-colors relative shrink-0',
              prefs[r.key] ? 'bg-[var(--sage)]' : 'bg-[var(--cream-dark)]'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                prefs[r.key] ? 'translate-x-[22px]' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── TAMPILAN ─────────────────────────── */

function AppearanceTab() {
  const { lang, setLang } = useAppStore()
  const [density, setDensity] = useState<'nyaman' | 'padat'>('nyaman')

  useEffect(() => {
    try {
      const d = localStorage.getItem('upk.density')
      if (d === 'padat' || d === 'nyaman') setDensity(d)
    } catch { /* abaikan */ }
  }, [])

  const applyDensity = (d: 'nyaman' | 'padat') => {
    setDensity(d)
    try {
      localStorage.setItem('upk.density', d)
      document.documentElement.dataset.density = d
    } catch { /* abaikan */ }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-[var(--brown-dark)] mb-1 flex items-center gap-2">
          <Globe size={15} /> Bahasa
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
          Sebagian label antarmuka tersedia dalam dua bahasa.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['id', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                'px-4 py-3 rounded-xl border text-sm font-bold transition-all',
                lang === l
                  ? 'border-[var(--terra)] bg-[var(--terra)]/5 text-[var(--terra)]'
                  : 'border-[var(--cream-dark)] text-[var(--text-muted)] hover:border-[var(--brown)]/30'
              )}
            >
              {l === 'id' ? 'Bahasa Indonesia' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-[var(--cream-dark)]" />

      <div>
        <p className="text-sm font-bold text-[var(--brown-dark)] mb-1">Kerapatan tampilan</p>
        <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
          Padat menampilkan lebih banyak isi per layar; nyaman memberi jarak lebih lega.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['nyaman', 'padat'] as const).map((d) => (
            <button
              key={d}
              onClick={() => applyDensity(d)}
              className={cn(
                'px-4 py-3 rounded-xl border text-sm font-bold capitalize transition-all',
                density === d
                  ? 'border-[var(--terra)] bg-[var(--terra)]/5 text-[var(--terra)]'
                  : 'border-[var(--cream-dark)] text-[var(--text-muted)] hover:border-[var(--brown)]/30'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed pt-2 border-t border-[var(--cream-dark)]">
        Tema gelap belum tersedia. Palet aplikasi dirancang untuk kertas krem; menambahkan
        mode gelap berarti menyusun ulang seluruh palet, bukan sekadar membalik warna.
      </p>
    </div>
  )
}

/* ─────────────────────────── Komponen bantu ─────────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-[var(--text-muted)] mt-1 block leading-relaxed">{hint}</span>}
    </div>
  )
}

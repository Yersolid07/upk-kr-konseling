// src/app/(app)/admin/sistem/sistem-console.tsx
// Konsol status sistem (M14).

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Database, AlertTriangle, CheckCircle2, RefreshCw, HardDrive, Users, FileText,
  MessageSquare, HeartHandshake, CalendarClock, Flag, Trash2, Megaphone, ShieldAlert,
  CircleDot,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type Migration = { version: string; description: string | null; applied_at: string }

function fmtBytes(n: number): string {
  if (!n) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const METRICS: { key: string; label: string; icon: typeof Users; kind?: 'bytes' }[] = [
  { key: 'profiles', label: 'Anggota terdaftar', icon: Users },
  { key: 'threads', label: 'Diskusi', icon: MessageSquare },
  { key: 'comments', label: 'Komentar', icon: MessageSquare },
  { key: 'prayers', label: 'Permohonan doa', icon: HeartHandshake },
  { key: 'articles', label: 'Artikel', icon: FileText },
  { key: 'sessions', label: 'Sesi konseling', icon: HeartHandshake },
  { key: 'bookings', label: 'Jadwal konseling', icon: CalendarClock },
  { key: 'cell_groups', label: 'KK/KTB aktif', icon: Users },
  { key: 'reports_pending', label: 'Laporan menunggu', icon: Flag },
  { key: 'trash_total', label: 'Di sampah', icon: Trash2 },
  { key: 'broadcasts_sent', label: 'Siaran terkirim', icon: Megaphone },
  { key: 'data_requests_pending', label: 'Permintaan data', icon: ShieldAlert },
  { key: 'storage_files', label: 'Berkas media', icon: HardDrive },
  { key: 'storage_bytes', label: 'Ukuran media', icon: HardDrive, kind: 'bytes' },
]

export function SistemConsole({
  status,
  statusError,
  migrations,
  expected,
  missing,
}: {
  status: Record<string, number>
  statusError: string | null
  migrations: Migration[]
  expected: string[]
  missing: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showAll, setShowAll] = useState(false)

  const shown = showAll ? METRICS : METRICS.slice(0, 8)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">
            Status Sistem
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Isi basis data, pemakaian media, dan migrasi yang sudah dijalankan.
          </p>
        </div>
        <button
          onClick={() => startTransition(() => router.refresh())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--cream-dark)] px-3 py-2 text-xs font-semibold text-[var(--text-2)]"
        >
          <RefreshCw size={13} className={pending ? 'animate-spin' : ''} /> Muat ulang
        </button>
      </div>

      {statusError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-red-900">
            <AlertTriangle size={13} /> Fungsi status belum tersedia
          </p>
          <p className="mt-1 text-[11px] text-red-800 font-mono break-all">{statusError}</p>
          <p className="mt-1.5 text-[11px] text-red-900">
            Jalankan <code className="rounded bg-white/70 px-1">supabase/phase4-advanced-modules.sql</code> di
            Supabase SQL Editor.
          </p>
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle size={13} /> {missing.length} migrasi belum tercatat
          </p>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-amber-900 font-mono">
            {missing.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-amber-900 leading-relaxed">
            Berkas yang dijalankan sebelum tabel <code>schema_migrations</code> ada tidak tercatat otomatis.
            Bila sudah dijalankan, catat manual lewat SQL Editor — jangan jalankan ulang migrasi yang
            mengubah skema.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {shown.map((m) => {
          const raw = status[m.key]
          const value =
            typeof raw !== 'number'
              ? '—'
              : m.kind === 'bytes'
                ? fmtBytes(raw)
                : String(raw)
          const warn = (m.key === 'reports_pending' || m.key === 'data_requests_pending') && raw > 0
          const Icon = m.icon
          return (
            <div
              key={m.key}
              className={`rounded-xl border px-3 py-2 ${
                warn ? 'border-amber-200 bg-amber-50' : 'border-[var(--cream-dark)] bg-[var(--surface)]'
              }`}
            >
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                <Icon size={9} /> {m.label}
              </p>
              <p className="text-base font-bold text-[var(--brown-dark)] leading-tight">{value}</p>
            </div>
          )
        })}
      </div>

      {METRICS.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] font-semibold text-[var(--terra)]"
        >
          {showAll ? 'Ringkas' : `Lihat ${METRICS.length - 8} metrik lain`}
        </button>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
          <Database size={11} /> Riwayat migrasi
        </p>
        <div className="card-premium divide-y divide-[var(--cream)]">
          {expected.map((label) => {
            const suffix = '-' + label.replace(/\.sql$/, '')
            const m = migrations.find((x) => x.version.endsWith(suffix))
            return (
              <div key={label} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                {m ? (
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                ) : (
                  <CircleDot size={13} className="shrink-0 text-[var(--text-muted)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-[var(--text)] break-all">{label}</p>
                  {m?.description && (
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{m.description}</p>
                  )}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                  {m ? formatDateTime(m.applied_at) : 'belum tercatat'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

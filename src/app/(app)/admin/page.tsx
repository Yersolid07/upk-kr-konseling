// src/app/(app)/admin/page.tsx
// Dasbor konsol admin — ringkasan angka yang benar-benar dipakai staf.
//
// Prinsip: setiap angka di sini harus bisa ditindaklanjuti. "Jumlah pengguna"
// hanya berguna bila ada pekerjaan yang menunggu di baliknya, jadi kartu
// utama adalah ANTRIAN (laporan masuk, artikel menunggu, konselor menunggu),
// bukan total kumulatif.

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Flag, Newspaper, HeartHandshake, Users, MessagesSquare, HandHeart,
  TrendingUp, AlertTriangle, ArrowRight, ShieldCheck, Activity,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/auth-guard'
import { checkSchema } from '@/lib/cms/schema'
import { MigrationBanner } from '@/components/admin/migration-banner'
import { ROLE_LABEL } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

interface StatCard {
  label: string
  value: number | string
  hint?: string
  href?: string
  icon: LucideIcon
  tone: 'neutral' | 'warn' | 'good' | 'info'
}

const TONE: Record<StatCard['tone'], string> = {
  neutral: 'bg-[var(--surface)] text-[var(--brown)]',
  warn: 'bg-amber-50 text-amber-700',
  good: 'bg-emerald-50 text-emerald-700',
  info: 'bg-blue-50 text-blue-700',
}

export default async function AdminDashboard() {
  const { profile } = await requireAdminPage('moderateContent')
  const supabase = createClient()
  const schema = await checkSchema()
  const hasModeration = schema.moderation

  // Semua hitungan dijalankan paralel — dasbor tidak boleh lambat karena
  // menunggu tujuh query berurutan.
  const [
    reportsRes,
    articlesRes,
    konselorRes,
    threadsRes,
    prayersRes,
    usersRes,
    flaggedRes,
    trashRes,
  ] = await Promise.all([
    supabase
      .from('content_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    supabase
      .from('konselor_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Sebelum migrasi Fase 2, kolom deleted_at belum ada — hitung semua baris.
    hasModeration
      ? supabase.from('threads').select('id', { count: 'exact', head: true }).is('deleted_at', null)
      : supabase.from('threads').select('id', { count: 'exact', head: true }),
    hasModeration
      ? supabase
          .from('prayer_requests')
          .select('id', { count: 'exact', head: true })
          .is('deleted_at', null)
      : supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('threads')
      .select('id', { count: 'exact', head: true })
      .eq('is_flagged', true),
    hasModeration
      ? supabase
          .from('threads')
          .select('id', { count: 'exact', head: true })
          .not('deleted_at', 'is', null)
      : Promise.resolve({ count: 0, error: null }),
  ])

  // `count` bernilai null bila query gagal (mis. migrasi belum dijalankan).
  // Ditampilkan sebagai 0 dengan penanda, bukan membuat halaman error.
  const n = (r: { count: number | null; error: unknown }) =>
    r.error ? null : (r.count ?? 0)

  const reports = n(reportsRes)
  const articles = n(articlesRes)
  const konselor = n(konselorRes)
  const threads = n(threadsRes)
  const prayers = n(prayersRes)
  const users = n(usersRes)
  const flagged = n(flaggedRes)
  const trash = n(trashRes)

  const pendingTotal = (reports ?? 0) + (articles ?? 0) + (konselor ?? 0)

  const queue: StatCard[] = [
    {
      label: 'Laporan menunggu',
      value: reports ?? '—',
      hint: 'Keluhan konten yang belum ditinjau',
      href: '/admin/laporan',
      icon: Flag,
      tone: (reports ?? 0) > 0 ? 'warn' : 'neutral',
    },
    {
      label: 'Artikel menunggu',
      value: articles ?? '—',
      hint: 'Menunggu persetujuan terbit',
      href: '/admin/articles',
      icon: Newspaper,
      tone: (articles ?? 0) > 0 ? 'info' : 'neutral',
    },
    {
      label: 'Konselor menunggu',
      value: konselor ?? '—',
      hint: 'Pengajuan calon konselor',
      href: '/admin/konselor',
      icon: HeartHandshake,
      tone: (konselor ?? 0) > 0 ? 'info' : 'neutral',
    },
  ]

  const overview: StatCard[] = [
    { label: 'Anggota', value: users ?? '—', icon: Users, tone: 'neutral' },
    { label: 'Diskusi aktif', value: threads ?? '—', icon: MessagesSquare, tone: 'neutral' },
    { label: 'Permohonan doa', value: prayers ?? '—', icon: HandHeart, tone: 'neutral' },
    {
      label: 'Ditandai',
      value: flagged ?? '—',
      hint: 'Perlu ditinjau moderator',
      href: '/admin/forum?filter=flagged',
      icon: AlertTriangle,
      tone: (flagged ?? 0) > 0 ? 'warn' : 'neutral',
    },
    {
      label: 'Di tempat sampah',
      value: trash ?? '—',
      href: '/admin/sampah',
      icon: ShieldCheck,
      tone: 'neutral',
    },
  ]

  const migrationPending = [reports, articles, konselor, threads].some((v) => v === null)

  return (
    <div className="space-y-6">
      {/* Sapaan + status */}
      <section className="card-premium p-5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-[var(--brown-dark)] text-[var(--cream)] flex items-center justify-center">
            <Activity size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[var(--brown-dark)] leading-tight">
              Selamat bertugas, {profile.full_name.split(' ')[0]}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Masuk sebagai {ROLE_LABEL[profile.role]}.{' '}
              {pendingTotal > 0 ? (
                <span className="text-amber-700 font-semibold">
                  {pendingTotal} hal menunggu tindakan.
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">Tidak ada antrean mendesak.</span>
              )}
            </p>
          </div>
        </div>
      </section>

      {(migrationPending || !hasModeration) && (
        <MigrationBanner
          file="supabase/cms-superadmin.sql"
          detail={
            !hasModeration
              ? 'Kolom moderasi (moderation_status, deleted_at) belum ada.'
              : 'Sebagian hitungan tidak bisa dibaca.'
          }
        />
      )}

      {/* Antrean — bagian yang paling sering dibuka staf */}
      <section>
        <h2 className="section-title mb-3 flex items-center gap-2">
          <TrendingUp size={15} /> Perlu tindakan
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {queue.map((c) => (
            <StatCardView key={c.label} card={c} />
          ))}
        </div>
      </section>

      {/* Ikhtisar */}
      <section>
        <h2 className="section-title mb-3">Ikhtisar situs</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {overview.map((c) => (
            <StatCardView key={c.label} card={c} compact />
          ))}
        </div>
      </section>

      {/* Tautan cepat ke pekerjaan yang sering dipakai */}
      <section>
        <h2 className="section-title mb-3">Pintasan</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: '/admin/forum', label: 'Moderasi forum', desc: 'Sembunyikan atau tandai diskusi' },
            { href: '/admin/prayer', label: 'Moderasi doa', desc: 'Tinjau permohonan doa' },
            { href: '/admin/pengguna', label: 'Kelola pengguna', desc: 'Peran, status, dan pemblokiran' },
            { href: '/admin/pengaturan', label: 'Pengaturan situs', desc: 'Nama, fitur, dan kebijakan' },
            { href: '/admin/audit', label: 'Jejak audit', desc: 'Riwayat tindakan admin' },
            { href: '/admin/sampah', label: 'Tempat sampah', desc: 'Pulihkan atau hapus permanen' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center gap-3 rounded-xl border border-[var(--cream-dark)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--terra)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--brown-dark)]">
                  {l.label}
                </span>
                <span className="block text-xs text-[var(--text-muted)] mt-0.5">{l.desc}</span>
              </span>
              <ArrowRight
                size={15}
                className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--terra)]"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCardView({ card, compact = false }: { card: StatCard; compact?: boolean }) {
  const Icon = card.icon
  const body = (
    <>
      <span
        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${TONE[card.tone]}`}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {card.label}
        </span>
        <span
          className={`block font-bold text-[var(--brown-dark)] ${compact ? 'text-xl' : 'text-2xl'} leading-tight`}
        >
          {card.value}
        </span>
        {card.hint && !compact && (
          <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">{card.hint}</span>
        )}
      </span>
    </>
  )

  const cls =
    'flex items-start gap-3 rounded-xl border border-[var(--cream-dark)] bg-[var(--surface)] p-4'

  return card.href ? (
    <Link href={card.href} className={`${cls} transition-colors hover:border-[var(--terra)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

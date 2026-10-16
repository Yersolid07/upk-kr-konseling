// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatCard } from '@/components/dashboard/stat-card'
import { VerseBanner } from '@/components/dashboard/verse-banner'
import {
  MessageSquare,
  UserCheck,
  Users,
  ChevronRight,
  Calendar,
  Heart,
  BookOpen,
  PlusCircle,
} from 'lucide-react'
import { HandsPraying } from '@/components/icons/HandsPraying'
import { CategoryIcon } from '@/components/ui/icons'
import { getRelativeTime } from '@/lib/utils'

import { getDailyVerse } from '@/lib/bible'
import { listThreads } from '@/lib/public-content'
import { SOSButton } from './sos-button'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  // Ayat hari ini (dari DB; fallback ke daftar lokal)
  const todayDate = new Date().toISOString().split('T')[0]
  const { data: verse } = await supabase
    .from('daily_verses')
    .select('*')
    .eq('display_date', todayDate)
    .maybeSingle()

  const verseData = verse as any
  const v = verseData
    ? { text: verseData.verse_text, ref: verseData.verse_ref }
    : getDailyVerse()

  // Data paralel
  const [threadsRes, prayersRes, konselorRes, membersRes, prayerList, articlesRes] =
    await Promise.all([
      supabase.from('threads').select('id', { count: 'exact', head: true }),
      supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'konselor')
        .eq('is_online', true),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('prayers_public')
        .select('id, content, is_anonymous, created_at, pray_count, author_id, anon_label, author_name, author_avatar')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('articles')
        .select('id, title, excerpt, cover_url, slug, read_count, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(2),
    ])

  // Diskusi terbaru — lewat view publik supaya anon_token tidak terkirim
  // ke browser (lihat src/lib/public-content.ts).
  const recentThreads = await listThreads(supabase, { limit: 4 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()
  const profileData = profile as any

  const firstName = profileData?.full_name
    ? profileData.full_name.split(' ')[0]
    : 'Sahabat'
  const isAdmin = profileData?.role === 'admin' || profileData?.role === 'super_admin'

  const prayers = prayerList.data ?? []
  const articles = articlesRes.data ?? []

  return (
    <div className="space-y-10 animate-fade-in pb-24 lg:pb-0">
      {/* ── Sambutan ─────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--line)]">
        <div>
          <p className="eyebrow mb-3">Ruang pribadi Anda</p>
          <h1 className="display text-4xl md:text-5xl">
            Selamat datang, <span className="text-[var(--terra)]">{firstName}</span>
          </h1>
          <p className="text-[var(--ink-soft)] mt-3 max-w-xl leading-relaxed">
            Tidak ada yang harus Anda hadapi sendiri. Mulai dari mana pun yang
            terasa paling ringan hari ini.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--brown-dark)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--brown)] transition-colors"
          >
            <MessageSquare size={17} /> Mulai konseling
          </Link>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-[var(--brown-dark)] text-sm font-semibold rounded-xl border border-[var(--line-strong)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <Calendar size={17} /> Buat jadwal
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ── Kolom utama ────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-10">
          <VerseBanner text={v.text} reference={v.ref} />

          {/* Statistik (admin) */}
          {isAdmin && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Diskusi"
                value={threadsRes.count ?? 0}
                icon={<MessageSquare className="text-[var(--terra)]" />}
                color="rgba(var(--terra-rgb), 0.1)"
              />
              <StatCard
                label="Didoakan"
                value={prayersRes.count ?? 0}
                icon={<HandsPraying className="text-[var(--gold)]" />}
                color="rgba(var(--gold-rgb), 0.1)"
              />
              <StatCard
                label="Konselor online"
                value={konselorRes.count ?? 0}
                icon={<UserCheck className="text-[var(--sage)]" />}
                color="rgba(var(--sage-rgb), 0.1)"
              />
              <StatCard
                label="Anggota aktif"
                value={membersRes.count ?? 0}
                icon={<Users className="text-[var(--brown)]" />}
                color="rgba(var(--brown-rgb), 0.1)"
              />
            </section>
          )}

          {/* Diskusi terbaru */}
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)]">
                Diskusi terbaru
              </h2>
              <Link
                href="/forum"
                className="text-sm font-semibold text-[var(--terra)] hover:underline inline-flex items-center gap-1 group"
              >
                Lihat semua
                <ChevronRight
                  size={15}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            </div>

            {!recentThreads || recentThreads.length === 0 ? (
              <div className="card-premium p-10 text-center">
                <p className="text-[var(--text-muted)] mb-4">
                  Belum ada diskusi. Jadilah yang pertama membuka percakapan.
                </p>
                <Link
                  href="/forum/new"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--terra)] hover:underline"
                >
                  <PlusCircle size={16} /> Mulai diskusi
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {(recentThreads as any[]).map((thread: any) => (
                  <Link
                    key={thread.id}
                    href={`/forum/${thread.id}`}
                    className="card-premium p-5 flex items-center gap-4 hover-lift group"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{
                        backgroundColor: (thread.category as any)?.color || 'var(--terra)',
                      }}
                    >
                      <CategoryIcon
                        slug={(thread.category as any)?.slug}
                        className="w-5 h-5"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                        <span className="font-medium">
                          {(thread.category as any)?.name || 'Umum'}
                        </span>
                        <span className="opacity-40">·</span>
                        <span>{getRelativeTime(thread.created_at)}</span>
                      </div>
                      <h3 className="font-semibold text-[var(--brown-dark)] truncate group-hover:text-[var(--terra)] transition-colors">
                        {thread.title}
                      </h3>
                    </div>

                    <div className="hidden sm:flex items-center gap-5 text-[var(--text-muted)] shrink-0 pr-1">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-[var(--brown-dark)]">
                          {thread.comment_count}
                        </div>
                        <div className="text-[10px]">komentar</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-[var(--brown-dark)]">
                          {thread.view_count}
                        </div>
                        <div className="text-[10px]">dilihat</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Sidebar ────────────────────────────────────── */}
        <aside className="lg:col-span-4 space-y-8">
          <SOSButton />

          {/* Prayer Wall */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold text-[var(--brown-dark)] text-sm inline-flex items-center gap-2">
                <Heart size={15} className="text-[var(--terra)]" /> Dinding Doa
              </h3>
              <Link
                href="/prayer"
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--terra)]"
              >
                Lihat semua
              </Link>
            </div>

            <div className="space-y-3">
              {prayers.length === 0 ? (
                <div className="card-premium p-6 text-center">
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    Belum ada permintaan doa.
                  </p>
                  <Link
                    href="/prayer/new"
                    className="text-xs font-semibold text-[var(--terra)] hover:underline"
                  >
                    Tulis permintaan doa
                  </Link>
                </div>
              ) : (
                prayers.map((p) => {
                  // Label sudah dihitung server-side dari view prayers_public —
                  // anon_token tidak pernah sampai ke sini.
                  const r = p as unknown as Record<string, unknown>
                  const isAnon = Boolean(r.is_anonymous)
                  const author = isAnon
                    ? `Anonim#${String(r.anon_label ?? '????')}`
                    : String(r.author_name ?? 'Anggota')
                  return (
                    <Link
                      key={p.id}
                      href="/prayer"
                      className="card-premium p-5 block hover-lift"
                    >
                      <p className="text-sm text-[var(--text)] leading-relaxed line-clamp-3 mb-3">
                        {p.content}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">{author}</span>
                        <span className="inline-flex items-center gap-1.5 text-[var(--gold)] font-medium">
                          <HandsPraying size={13} /> {p.pray_count ?? 0}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </section>

          {/* Renungan */}
          <section>
            <h3 className="font-semibold text-[var(--brown-dark)] text-sm inline-flex items-center gap-2 mb-4">
              <BookOpen size={15} className="text-[var(--sage)]" /> Renungan
            </h3>

            {articles.length === 0 ? (
              <div className="card-premium p-6 text-center">
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  Belum ada renungan yang diterbitkan.
                </p>
                <Link
                  href="/renungan"
                  className="text-xs font-semibold text-[var(--terra)] hover:underline"
                >
                  Buka halaman renungan
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((a) => (
                  <Link key={a.id} href={`/renungan/${a.id}`} className="group block">
                    {a.cover_url && (
                      <div className="aspect-[16/9] rounded-xl overflow-hidden mb-3 border border-[var(--line)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.cover_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      </div>
                    )}
                    <h4 className="font-semibold text-[var(--brown-dark)] text-sm leading-snug group-hover:text-[var(--terra)] transition-colors mb-1">
                      {a.title}
                    </h4>
                    <span className="text-xs text-[var(--text-muted)]">
                      {a.read_count ? `${a.read_count} kali dibaca` : 'Baca selengkapnya'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* FAB (mobile) */}
      <Link
        href="/forum/new"
        aria-label="Mulai diskusi baru"
        className="fixed bottom-24 right-5 w-13 h-13 p-3.5 bg-[var(--brown-dark)] text-white rounded-full shadow-[var(--shadow-lg)] flex items-center justify-center lg:hidden z-40 active:scale-95 transition-transform"
      >
        <PlusCircle size={24} />
      </Link>
    </div>
  )
}

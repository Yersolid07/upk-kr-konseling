// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  // Fetch today's verse
  const today = new Date().toISOString().split('T')[0]
  const { data: verse } = await supabase
    .from('daily_verses')
    .select('*')
    .eq('display_date', today)
    .single()

  // Parallel data fetching
  const [threadsRes, prayersRes, konselorRes, membersRes] = await Promise.all([
    supabase.from('threads').select('id', { count: 'exact', head: true }),
    supabase.from('prayer_supports').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('role', 'konselor').eq('is_online', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  // Recent threads
  const { data: recentThreads } = await supabase
    .from('threads')
    .select(`
      id, title, is_anonymous, created_at, comment_count,
      author:profiles(id, full_name, anon_token),
      category:thread_categories(name, slug, icon, color)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // Recent prayer requests
  const { data: recentPrayers } = await supabase
    .from('prayer_requests')
    .select(`
      id, content, is_anonymous, pray_count, created_at,
      author:profiles(id, full_name, anon_token)
    `)
    .order('created_at', { ascending: false })
    .limit(3)

  // Online konselor
  const { data: onlineKonselor } = await supabase
    .from('profiles')
    .select('id, full_name, specialization, anon_token')
    .eq('role', 'konselor')
    .eq('is_online', true)
    .eq('is_verified', true)
    .limit(3)

  const defaultVerse = {
    verse_text: '"Karena Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman Tuhan, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan."',
    verse_ref: 'Yeremia 29:11'
  }

  const v = verse ?? defaultVerse

  return (
    <div>
      {/* Verse Banner */}
      <div className="verse-banner">
        <div className="verse-label">✦ Ayat Hari Ini</div>
        <div className="verse-text">{v.verse_text}</div>
        <div className="verse-ref">
          {v.verse_ref} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon="💬" color="rgba(196,137,90,0.12)" value={threadsRes.count ?? 0} label="Thread Aktif" />
        <StatCard icon="🙏" color="rgba(107,140,114,0.12)" value={prayersRes.count ?? 0} label="Doa Dipanjatkan" />
        <StatCard icon="💌" color="rgba(201,153,58,0.12)" value={konselorRes.count ?? 0} label="Konselor Online" />
        <StatCard icon="👥" color="rgba(124,92,62,0.12)" value={membersRes.count ?? 0} label="Anggota" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left column */}
        <div>
          {/* Recent Threads */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Thread Terbaru</span>
              <Link href="/forum" className="card-action">Lihat semua →</Link>
            </div>
            <div className="card-body">
              {(recentThreads ?? []).map(t => {
                const displayName = t.is_anonymous
                  ? `Anonim#${(t.author as any)?.anon_token?.slice(0,4).toUpperCase()}`
                  : (t.author as any)?.full_name
                return (
                  <Link key={t.id} href={`/forum/${t.id}`} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--cream)', textDecoration: 'none', transition: 'all 0.2s' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${(t.category as any)?.color ?? 'var(--terra)'}, var(--brown))`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--white)', fontSize: 14, fontWeight: 700
                    }}>
                      {t.is_anonymous ? '🔒' : (t.author as any)?.full_name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span className={`tag tag-${(t.category as any)?.slug}`}>{(t.category as any)?.icon} {(t.category as any)?.name}</span>
                        <span>{displayName}</span>
                        <span>💬 {t.comment_count}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><span className="card-title">Aksi Cepat</span></div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { href: '/forum', icon: '✍️', label: 'Buat Thread', sub: 'Bagikan cerita atau pertanyaan' },
                  { href: '/chat', icon: '💬', label: 'Konseling 1-on-1', sub: 'Chat privat dengan konselor' },
                  { href: '/prayer', icon: '🙏', label: 'Minta Dukungan Doa', sub: 'Kirim permintaan doa' },
                  { href: '/booking', icon: '📅', label: 'Booking Sesi', sub: 'Jadwalkan konseling' },
                ].map(a => (
                  <Link key={a.href} href={a.href} style={{
                    padding: 14, borderRadius: 12, border: '1.5px solid var(--cream-dark)',
                    background: 'var(--cream)', textDecoration: 'none',
                    display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.2s'
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--terra)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cream-dark)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  >
                    <span style={{ fontSize: 22 }}>{a.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.sub}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Prayer Wall mini */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">🙏 Prayer Wall</span>
              <Link href="/prayer" className="card-action">Lihat semua →</Link>
            </div>
            <div className="card-body">
              {(recentPrayers ?? []).map(p => {
                const displayName = p.is_anonymous ? '🔒 Anonim' : (p.author as any)?.full_name
                return (
                  <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--cream)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      "{p.content}"
                    </div>
                    <Link href={`/prayer`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, color: 'var(--terra)',
                      padding: '4px 10px', background: 'rgba(196,137,90,0.08)',
                      borderRadius: 6, textDecoration: 'none'
                    }}>
                      🙏 Mendoakan ({p.pray_count})
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Online Konselor */}
          <div className="card">
            <div className="card-header"><span className="card-title">Konselor Online</span></div>
            <div className="card-body">
              {(onlineKonselor ?? []).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                  Tidak ada konselor online saat ini
                </p>
              ) : (onlineKonselor ?? []).map(k => (
                <div key={k.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--cream)', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--sage), #3d6644)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--white)', fontWeight: 700, fontSize: 14
                    }}>
                      {k.full_name.charAt(0)}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 10, height: 10, background: 'var(--success)',
                      borderRadius: '50%', border: '2px solid var(--white)'
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{k.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>● Online</span>
                      {k.specialization?.length ? ` · ${k.specialization.slice(0,2).join(', ')}` : ''}
                    </div>
                  </div>
                  <Link href="/chat" style={{
                    padding: '6px 12px', background: 'var(--cream-dark)', color: 'var(--brown)',
                    borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}>Chat</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, color, value, label }: { icon: string; color: string; value: number; label: string }) {
  return (
    <div className="card">
      <div style={{ padding: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 700, color: 'var(--brown-dark)', lineHeight: 1, marginBottom: 4 }}>{value.toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

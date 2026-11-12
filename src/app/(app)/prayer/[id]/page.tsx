// src/app/(app)/prayer/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PrayerComments } from '@/components/prayer/PrayerComments'
import { ReportButton } from '@/components/reports/report-button'
import { cn } from '@/lib/utils'

interface DetailPageProps {
  params: Promise<{ id: string }>
}

async function DetailPage({ params }: DetailPageProps) {
  const { id } = await params
  const supabase = (await import('@/lib/supabase/server')).createClient()
  const { data: prayer, error } = await supabase
    .from('prayers_public')
    .select(
      `id, content, is_anonymous, is_answered, pray_count, comment_count, created_at,
       author_name, author_avatar, anon_label`
    )
    .eq('id', id)
    .single()

  if (error || !prayer) notFound()

  const authorLabel = prayer.is_anonymous
    ? (prayer.anon_label || 'Anonim')
    : (prayer.author_name || 'Anggota')

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link
          href="/prayer"
          className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--terra)] transition-colors mb-4 group"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Pembacaan
        </Link>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-[var(--cream-dark)] overflow-hidden shadow-sm">
            <div className="relative bg-[var(--bg)] p-8 pt-10">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--gold)]/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[var(--brown)]/5 rounded-full blur-2xl" />

              <div className="relative z-10 flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0',
                  prayer.is_anonymous ? 'bg-slate-400' : 'bg-gradient-to-br from-[var(--gold)] to-[var(--brown)]'
                )}>
                  {prayer.is_anonymous ? '?' : authorLabel.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn(
                      'text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full',
                      prayer.is_anonymous ? 'bg-slate-100 text-[var(--text-muted)]' : 'bg-[var(--gold)]/10 text-[var(--gold)]'
                    )}>
                      {prayer.is_anonymous ? 'Doa Anonim' : 'Doa Publik'}
                    </span>
                    {prayer.is_answered && (
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-green-50 text-green-600">
                        Terjawab
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-[var(--brown-dark)] mb-3">{authorLabel}</div>

                  <p className="text-[var(--text)] italic leading-relaxed text-lg font-medium">
                    "{prayer.content}"
                  </p>

                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-5 text-sm text-[var(--text-muted)]">
                    <span><span className="font-bold text-[var(--text)]">{prayer.pray_count}</span> didoakan</span>
                    <span><span className="font-bold text-[var(--text)]">{prayer.comment_count}</span> komentar</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[var(--bg)] border-t border-[var(--cream-dark)] flex items-center justify-between">
              <ReportButton contentType="prayer" contentId={prayer.id} compact />
            </div>
          </div>

          <PrayerComments requestId={prayer.id} />
        </div>
      </div>
    </div>
  )
}

export default function PrayerDetailPage({ params }: DetailPageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">Memuat...</div>}>
      <DetailPage params={params} />
    </Suspense>
  )
}

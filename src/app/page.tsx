// src/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  MessageCircle,
  ShieldCheck,
  Users,
  ArrowRight,
  CalendarCheck,
  HeartHandshake,
  LifeBuoy,
} from 'lucide-react'
import { Logo } from '@/components/brand/Logo'

export default async function LandingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-[var(--cream)]/85 backdrop-blur-xl border-b border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo tile size={34} />
            <span className="font-[var(--font-playfair)] text-[15px] sm:text-[17px] font-bold text-[var(--brown-dark)] leading-tight">
              <span className="block sm:inline">IKA UPK-Kr</span>{' '}
              <span className="block sm:inline">FT UNSRAT</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/auth/login"
              className="px-3 sm:px-4 py-2 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--brown-dark)] transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/auth/register"
              className="px-4 sm:px-5 py-2 text-sm font-semibold text-white bg-[var(--brown-dark)] rounded-lg hover:bg-[var(--brown)] transition-colors"
            >
              Daftar
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-16 md:pt-24 md:pb-24">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <p className="eyebrow mb-5">Fakultas Teknik · UNSRAT</p>

              <h1 className="display text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem] mb-6">
                Ruang aman untuk
                <br />
                <span className="text-[var(--terra)]">bertumbuh</span> dan
                <br className="hidden sm:block" /> berbagi beban.
              </h1>

              <p className="text-[var(--ink-soft)] text-lg leading-relaxed max-w-xl mb-9">
                Pendampingan rohani dan konseling untuk alumni Kristen — tanpa
                menghakimi. Anda bisa memulai percakapan secara anonim, kapan pun
                Anda siap.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[var(--brown-dark)] text-white font-semibold rounded-xl hover:bg-[var(--brown)] transition-colors group"
                >
                  Mulai dengan anonim
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-7 py-3.5 bg-white text-[var(--brown-dark)] font-semibold rounded-xl border border-[var(--line-strong)] hover:bg-[var(--surface-3)] transition-colors"
                >
                  Sudah punya akun
                </Link>
              </div>

              <dl className="flex flex-wrap gap-x-10 gap-y-5 pt-8 border-t border-[var(--line)]">
                {[
                  { k: 'Konselor terverifikasi', v: 'Pendamping terlatih' },
                  { k: 'Bisa anonim', v: 'Identitas terlindungi' },
                  { k: 'Gratis', v: 'Untuk alumni FT' },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <dt className="text-sm font-semibold text-[var(--brown-dark)]">
                      {k}
                    </dt>
                    <dd className="text-xs text-[var(--text-muted)] mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="lg:col-span-5">
              <figure className="relative bg-white rounded-2xl border border-[var(--line)] p-8 md:p-10 shadow-[var(--shadow-md)]">
                <div
                  aria-hidden
                  className="absolute left-0 top-10 bottom-10 w-[3px] rounded-full bg-gradient-to-b from-[var(--terra)] to-[var(--sage)]"
                />
                <blockquote className="font-[var(--font-playfair)] italic text-[1.3rem] leading-relaxed text-[var(--brown-dark)] mb-5">
                  &ldquo;Marilah kepada-Ku, semua yang letih lesu dan berbeban berat,
                  Aku akan memberi kelegaan kepadamu.&rdquo;
                </blockquote>
                <figcaption className="text-sm text-[var(--text-muted)] font-medium">
                  Matius 11:28
                </figcaption>
              </figure>

              <p className="text-xs text-[var(--text-muted)] mt-5 leading-relaxed">
                Semua percakapan bersifat rahasia. Konselor kami terikat kode etik
                pendampingan dan tidak membagikan identitas Anda.
              </p>
            </div>
          </div>
        </section>

        {/* Layanan */}
        <section id="layanan" className="bg-white border-y border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="max-w-2xl mb-14">
              <p className="eyebrow mb-3">Yang kami sediakan</p>
              <h2 className="display text-3xl md:text-4xl mb-4">
                Empat cara untuk memulai
              </h2>
              <p className="text-[var(--ink-soft)] leading-relaxed">
                Pilih yang paling nyaman bagi Anda. Tidak ada paksaan untuk bercerita
                lebih dari yang Anda inginkan.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Curhat anonim',
                  body: 'Tulis apa yang membebani Anda di forum. Nama Anda tidak akan tampil.',
                },
                {
                  icon: MessageCircle,
                  title: 'Konseling 1-on-1',
                  body: 'Ngobrol privat dengan konselor yang siap mendengarkan tanpa menghakimi.',
                },
                {
                  icon: CalendarCheck,
                  title: 'Jadwal tatap muka',
                  body: 'Pesan slot waktu yang tersedia dan bertemu langsung dengan konselor.',
                },
                {
                  icon: Users,
                  title: 'Kelompok kecil',
                  body: 'Bergabung dengan KK/KTB untuk bertumbuh bersama teman seiman.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <div className="w-11 h-11 rounded-xl bg-[var(--surface-3)] text-[var(--brown)] flex items-center justify-center mb-5">
                    <Icon size={21} strokeWidth={1.9} />
                  </div>
                  <h3 className="font-semibold text-[var(--brown-dark)] mb-2">{title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cara kerja */}
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3">Alurnya</p>
              <h2 className="display text-3xl md:text-4xl mb-4">
                Sesederhana tiga langkah
              </h2>
              <p className="text-[var(--ink-soft)] leading-relaxed">
                Tidak perlu menjelaskan panjang lebar di awal. Anda bisa mulai dari
                hal sekecil apa pun.
              </p>
            </div>

            <ol className="lg:col-span-8 grid sm:grid-cols-3 gap-10">
              {[
                {
                  n: '01',
                  t: 'Buat akun',
                  d: 'Cukup nama dan email. Anda juga bisa memilih mode anonim.',
                },
                {
                  n: '02',
                  t: 'Pilih pendampingan',
                  d: 'Forum, chat privat, atau jadwal tatap muka — sesuai kenyamanan Anda.',
                },
                {
                  n: '03',
                  t: 'Mulai bercerita',
                  d: 'Konselor akan merespons. Semua yang Anda bagi tetap rahasia.',
                },
              ].map(({ n, t, d }) => (
                <li key={n}>
                  <span className="block font-[var(--font-playfair)] text-3xl text-[var(--terra)] mb-3">
                    {n}
                  </span>
                  <h3 className="font-semibold text-[var(--brown-dark)] mb-2">{t}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Bantuan darurat */}
        <section className="bg-white border-y border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-8">
                <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-[var(--brown-dark)] mb-3">
                  Jika Anda dalam bahaya saat ini
                </h2>
                <p className="text-[var(--ink-soft)] leading-relaxed">
                  Jangan menunggu. Hubungi layanan darurat di bawah ini, atau tekan
                  tombol SOS di dalam aplikasi — konselor yang sedang bertugas akan
                  segera dihubungi.
                </p>
              </div>
              <div className="md:col-span-4 md:text-right">
                <Link
                  href="/hotline"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-[var(--danger)]/25 text-[var(--danger)] font-semibold hover:bg-[var(--danger)]/5 transition-colors"
                >
                  <LifeBuoy size={18} />
                  Lihat nomor darurat
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Penutup */}
        <section className="mx-auto max-w-6xl px-6 py-20 md:py-24 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--surface-3)] text-[var(--brown)] flex items-center justify-center mx-auto mb-6">
            <HeartHandshake size={24} strokeWidth={1.8} />
          </div>
          <h2 className="display text-3xl md:text-4xl mb-4 max-w-2xl mx-auto">
            Anda tidak harus melewati ini sendirian.
          </h2>
          <p className="text-[var(--ink-soft)] max-w-xl mx-auto mb-9 leading-relaxed">
            Bergabunglah dengan alumni FT UNSRAT yang saling menguatkan dalam
            perjalanan iman, karier, dan pelayanan.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--brown-dark)] text-white font-semibold rounded-xl hover:bg-[var(--brown)] transition-colors group"
          >
            Buat akun sekarang
            <ArrowRight
              size={18}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo tile size={30} />
              <div>
                <div className="text-sm font-semibold text-[var(--brown-dark)]">
                  IKA UPK-Kr FT UNSRAT
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Ikatan Alumni UPK-Kr · Fakultas Teknik UNSRAT
                </div>
              </div>
            </div>

            <nav className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-[var(--text-muted)]">
              <Link href="/privacy" className="hover:text-[var(--brown-dark)] transition-colors">
                Kebijakan Privasi
              </Link>
              <Link href="/terms" className="hover:text-[var(--brown-dark)] transition-colors">
                Syarat & Ketentuan
              </Link>
              <Link href="/contact" className="hover:text-[var(--brown-dark)] transition-colors">
                Hubungi Kami
              </Link>
              <Link href="/hotline" className="hover:text-[var(--brown-dark)] transition-colors">
                Hotline
              </Link>
            </nav>
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-8 pt-6 border-t border-[var(--line)]">
            &copy; {new Date().getFullYear()} IKA UPK-Kr FT UNSRAT. Dibuat untuk melayani.
          </p>
        </div>
      </footer>
    </div>
  )
}

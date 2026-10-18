// src/app/auth/verify-status/page.tsx
//
// Halaman tunggu verifikasi email.
//
// MASALAH YANG DIPERBAIKI
// Sebelumnya, setelah mendaftar pengguna langsung dilempar ke halaman masuk.
// Di sana ia mengetik email + kata sandi, dan mendapat "Harap verifikasi email
// Anda terlebih dahulu" — pesan yang benar tetapi datang setelah ia mencoba
// masuk, tanpa jalan keluar selain menunggu tanpa tahu kapan.
//
// Halaman ini menutup celah itu: pengguna mendarat di sini, melihat status
// secara langsung, dan halaman itu SENDIRI berpindah ke halaman masuk begitu
// emailnya terverifikasi.

import { Suspense } from 'react'
import { VerifyStatusPanel } from './verify-status-panel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Verifikasi Email | IKA UPK-Kr FT UNSRAT' }

export default function VerifyStatusPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  return (
    <Suspense fallback={null}>
      <VerifyStatusPanel email={searchParams.email ?? ''} />
    </Suspense>
  )
}

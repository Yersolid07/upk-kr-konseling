// src/components/brand/Logo.tsx
// Logo resmi IKA UPK-Kr FT UNSRAT — Ikatan Alumni Unit Pelayanan Kerohanian
// Fakultas Teknik Universitas Sam Ratulangi.
//
// Aset: /logo-ika.png (192px, badge bulat). Sumber resolusi penuh ada di
// /logo-ika-512.png untuk keperluan cetak atau unduhan.
//
// CATATAN ASET — jangan diganti tanpa memeriksa hasilnya di latar terang:
// logo sumber dirancang untuk latar GELAP. Huruf teksnya berisi gelap dengan
// garis luar PUTIH; kalau latar hitamnya dihapus (dibuat transparan), garis
// putih itu terbaca sebagai "halo" dan teksnya justru sulit dibaca. Karena itu
// aset dibuat sebagai badge bulat yang MEMPERTAHANKAN latar hitamnya. Isi logo
// 0% berada di luar lingkaran, jadi crop bulat tidak memotong apa pun.

import Image from 'next/image'

interface LogoProps {
  size?: number
  className?: string
  /**
   * Tambahkan cincin + bayangan. Dipakai di latar gelap (sidebar, panel auth)
   * supaya badge hitam tidak menyatu dengan latarnya.
   */
  tile?: boolean
}

/** Badge logo tanpa teks alternatif — dipakai berdampingan dengan nama brand. */
export function LogoMark({ size = 28, className = '' }: LogoProps) {
  return (
    <Image
      src="/logo-ika.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
      aria-hidden="true"
    />
  )
}

/** Badge logo dengan teks alternatif — dipakai sebagai lambang mandiri. */
export function Logo({ size = 40, className = '', tile = false }: LogoProps) {
  return (
    <Image
      src="/logo-ika.png"
      alt="Logo IKA UPK-Kr FT UNSRAT"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${
        tile ? 'shadow-[0_4px_16px_rgba(0,0,0,0.22)] ring-1 ring-white/15' : ''
      } ${className}`}
    />
  )
}

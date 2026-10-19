// src/components/profile/Avatar.tsx
//
// Avatar dengan tiga keadaan: foto, inisial, dan ukuran yang konsisten.
//
// Sebelumnya setiap tempat menggambar lingkaran gradien berisi huruf pertama
// nama, meski `avatar_url` sudah diambil dari basis data — foto profil tidak
// pernah tampil di mana pun. Komponen ini menggantikannya.
//
// Memakai <img> biasa, bukan next/image: URL berasal dari bucket Supabase yang
// sudah publik, dan next/image menambah lapisan optimasi yang tidak diperlukan
// untuk berkas 512x512 yang sudah dikecilkan saat diunggah.

import { cn } from '@/lib/utils'

const SIZES = {
  xs: { box: 'w-7 h-7', text: 'text-[11px]', px: 28 },
  sm: { box: 'w-9 h-9', text: 'text-sm', px: 36 },
  md: { box: 'w-11 h-11', text: 'text-base', px: 44 },
  lg: { box: 'w-14 h-14', text: 'text-xl', px: 56 },
  xl: { box: 'w-[72px] h-[72px]', text: 'text-2xl', px: 72 },
} as const

export function Avatar({
  src,
  name,
  size = 'md',
  className,
  ring = false,
}: {
  src?: string | null
  name?: string | null
  size?: keyof typeof SIZES
  className?: string
  ring?: boolean
}) {
  const s = SIZES[size]
  const initial = name?.trim().charAt(0)?.toUpperCase() ?? 'U'

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `Foto profil ${name}` : 'Foto profil'}
        width={s.px}
        height={s.px}
        loading="lazy"
        decoding="async"
        className={cn(
          s.box,
          'rounded-full object-cover shrink-0 bg-[var(--cream)]',
          ring && 'border-2 border-white shadow-md',
          className
        )}
      />
    )
  }

  return (
    <div
      aria-label={name ? `Inisial ${name}` : 'Belum ada foto'}
      className={cn(
        s.box,
        s.text,
        'rounded-full bg-gradient-to-br from-[var(--terra)] to-[var(--brown)] flex items-center justify-center text-white font-bold shrink-0',
        ring && 'shadow-md',
        className
      )}
    >
      {initial}
    </div>
  )
}

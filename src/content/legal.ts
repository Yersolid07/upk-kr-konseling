// src/content/legal.ts
// Konten legal BAWAAN (fallback).
//
// Kenapa ada di kode, bukan hanya di database:
// dokumen legal harus SELALU bisa dibaca publik — termasuk sebelum migrasi
// `supabase/cms-rbac.sql` dijalankan atau saat tabel `legal_documents` kosong.
// Super admin tetap bisa menimpa isi ini lewat panel CMS (/admin/cms); begitu
// ada baris di DB, versi DB yang dipakai.
//
// Sinkronkan isi ini dengan seed di supabase/cms-rbac.sql bila diubah.

export type LegalDoc = {
  slug: string
  title: string
  summary: string
  content: string
  version: number
  effective_date: string
  is_published: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

export const FALLBACK_LEGAL: Record<string, LegalDoc> = {
  terms: {
    slug: 'terms',
    title: 'Syarat & Ketentuan',
    summary: 'Aturan penggunaan layanan IKA UPK-Kr FT UNSRAT.',
    version: 1,
    effective_date: today(),
    is_published: true,
    content: `# Syarat & Ketentuan

## 1. Penerimaan
Dengan membuat akun dan menggunakan IKA UPK-Kr FT UNSRAT, kamu menyetujui ketentuan ini.

## 2. Bukan Layanan Darurat
Aplikasi ini **bukan** layanan gawat darurat. Jika kamu dalam bahaya langsung, hubungi 112 atau IGD terdekat.

## 3. Kerahasiaan
Identitas asli penulis konten anonim hanya dapat dibuka oleh super admin melalui prosedur resmi, dan setiap pembukaan tercatat permanen di log audit.

## 4. Tanggung Jawab Pengguna
Kamu bertanggung jawab atas konten yang kamu kirim. Dilarang mengirim konten yang melecehkan, mengancam, atau melanggar hukum.

## 5. Moderasi
Moderator dan admin dapat menandai, menyembunyikan, atau menghapus konten yang melanggar ketentuan.

## 6. Perubahan Ketentuan
Ketentuan dapat diperbarui. Perubahan material akan diberitahukan lewat notifikasi aplikasi.`,
  },

  privacy: {
    slug: 'privacy',
    title: 'Kebijakan Privasi',
    summary: 'Data apa yang kami kumpulkan dan bagaimana kami melindunginya.',
    version: 1,
    effective_date: today(),
    is_published: true,
    content: `# Kebijakan Privasi

## 1. Data yang Kami Kumpulkan
Nama lengkap, email, angkatan, jurusan, dan konten yang kamu kirim (diskusi, doa, pesan, lampiran).

## 2. Dasar Penggunaan
Data dipakai untuk menjalankan layanan: menampilkan profil, menghubungkan kamu dengan konselor, dan menampilkan kontenmu di komunitas.

## 3. Mode Anonim
Saat mode anonim aktif, nama aslimu tidak ditampilkan ke pengguna lain. Identitas tetap tersimpan di sistem agar konselor dapat menindaklanjuti kasus berat.

## 4. Percakapan Konseling
Isi percakapan 1-on-1 hanya dapat dibaca oleh kamu dan konselor yang bersangkutan.

## 5. Berbagi Data
Kami tidak menjual atau membagikan datamu ke pihak ketiga untuk tujuan komersial.

## 6. Hak Kamu
Kamu dapat meminta ekspor atau penghapusan datamu dengan menghubungi pengelola melalui halaman kontak.

## 7. Retensi
Data disimpan selama akunmu aktif. Setelah penghapusan akun, data pribadi dihapus dan konten publik dianonimkan.`,
  },

  'konselor-guide': {
    slug: 'konselor-guide',
    title: 'Panduan Menjadi Konselor',
    summary: 'Alur dan syarat menjadi konselor IKA UPK-Kr FT UNSRAT.',
    version: 1,
    effective_date: today(),
    is_published: true,
    content: `# Panduan Menjadi Konselor

## 1. Syarat
Anggota terdaftar, berkomitmen menjaga kerahasiaan, dan bersedia mengikuti pembinaan IKA UPK-Kr FT UNSRAT.

## 2. Alur
1. Ajukan lewat halaman **Dashboard Konselor** > **Ajukan sebagai Konselor**.
2. Isi motivasi, pengalaman, spesialisasi, dan lampirkan bukti kredensial bila ada.
3. Pengajuan ditinjau admin/super admin.
4. Bila disetujui, peranmu otomatis berubah menjadi \`konselor\` dan profilmu muncul di halaman booking.

## 3. Kode Etik
Menjaga kerahasiaan konseli, tidak memberi diagnosis medis, dan merujuk ke profesional saat kasus di luar kompetensi.

## 4. Status Pengajuan
Pantau status di halaman yang sama: *pending*, *under_review*, *approved*, atau *rejected*.`,
  },
}

export const LEGAL_SLUGS = Object.keys(FALLBACK_LEGAL)

export function getFallbackLegal(slug: string): LegalDoc | null {
  return FALLBACK_LEGAL[slug] ?? null
}

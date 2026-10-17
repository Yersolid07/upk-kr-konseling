// src/lib/settings/registry.ts
// Daftar TUNGGAL semua pengaturan situs.
//
// MASALAH YANG DIPERBAIKI
// Panel CMS lama menampilkan nilai apa adanya sebagai teks bebas dan menulisnya
// kembali sebagai JSON apa pun yang bisa di-parse. Akibatnya toggle boolean
// tersimpan sebagai string "on", lalu dibaca dengan Boolean('') === false —
// dan "Pendaftaran dibuka" tampak tertutup padahal tidak. Selain itu tidak ada
// yang tahu kunci mana yang benar-benar DIPAKAI aplikasi, sehingga pengaturan
// seperti `registration_open` bisa diubah tanpa efek apa pun.
//
// ATURAN
// Setiap kunci yang dipakai kode WAJIB terdaftar di sini, lengkap dengan tipe,
// nilai default, dan (bila perlu) batas nilai. `getSetting()` memvalidasi nilai
// dari database terhadap skema ini; nilai yang tidak valid jatuh ke default
// alih-alih menjatuhkan halaman.
//
// File ini murni (hanya zod) sehingga aman diimpor komponen klien maupun server.

import { z } from 'zod'

export type SettingGroup =
  | 'umum'
  | 'akses'
  | 'moderasi'
  | 'fitur'
  | 'konseling'
  | 'keamanan'
  | 'notifikasi'
  | 'data'
  | 'tampilan'
  | 'darurat'

export interface SettingDef {
  key: string
  group: SettingGroup
  label: string
  help?: string
  schema: z.ZodTypeAny
  default: unknown
  /** Boleh dibaca tanpa login (nama situs, banner, mode pemeliharaan). */
  public?: boolean
}

export const SETTING_GROUPS: Record<SettingGroup, string> = {
  umum: 'Identitas Situs',
  akses: 'Akses & Pendaftaran',
  moderasi: 'Moderasi Konten',
  fitur: 'Fitur',
  konseling: 'Konseling',
  keamanan: 'Keamanan',
  notifikasi: 'Notifikasi',
  data: 'Data & Retensi',
  tampilan: 'Tampilan',
  darurat: 'Keadaan Darurat',
}

// Nilai teks disimpan sebagai { value: "..." } di kolom JSONB.
const text = (max = 300) => z.string().max(max)
const bool = () => z.boolean()
const int = (min: number, max: number) => z.number().int().min(min).max(max)

export const SETTINGS: readonly SettingDef[] = [
  // ── Identitas situs ──
  {
    key: 'site_name',
    group: 'umum',
    label: 'Nama Situs',
    schema: text(80),
    default: 'IKA UPK-Kr FT UNSRAT',
    public: true,
  },
  {
    key: 'site_tagline',
    group: 'umum',
    label: 'Tagline',
    schema: text(160),
    default: 'Ruang aman untuk bercerita, bertumbuh, dan saling menguatkan.',
    public: true,
  },

  // ── Akses & pendaftaran ──
  {
    key: 'registration_open',
    group: 'akses',
    label: 'Pendaftaran anggota dibuka',
    help:
      'Ditutup berarti tidak ada akun baru yang bisa dibuat, termasuk lewat pendaftaran langsung ke Supabase (ditegakkan oleh trigger di database).',
    schema: bool(),
    default: true,
    public: true,
  },
  {
    key: 'konselor_recruiting',
    group: 'akses',
    label: 'Menerima pengajuan konselor',
    schema: bool(),
    default: true,
    public: true,
  },

  // ── Moderasi ──
  {
    key: 'article_requires_approval',
    group: 'moderasi',
    label: 'Artikel wajib disetujui admin',
    help: 'Bila dimatikan, artikel anggota langsung terbit tanpa tinjauan.',
    schema: bool(),
    default: true,
  },
  {
    key: 'prayer_requires_approval',
    group: 'moderasi',
    label: 'Permintaan doa wajib disetujui admin',
    schema: bool(),
    default: false,
  },
  {
    key: 'forum_requires_approval',
    group: 'moderasi',
    label: 'Diskusi baru wajib disetujui admin',
    schema: bool(),
    default: false,
  },
  {
    key: 'auto_hide_report_threshold',
    group: 'moderasi',
    label: 'Sembunyikan otomatis setelah (laporan)',
    help:
      'Konten disembunyikan sementara saat jumlah laporan menunggu mencapai angka ini. Isi 0 untuk mematikan.',
    schema: int(0, 50),
    default: 3,
  },
  {
    key: 'crisis_keywords',
    group: 'moderasi',
    label: 'Kata kunci krisis',
    help:
      'Dipisah koma. Konten yang memuat kata ini masuk antrean prioritas tinggi dan memicu notifikasi konselor. Tidak menyembunyikan konten — justru mempercepat bantuan.',
    schema: text(500),
    default:
      'bunuh diri, mengakhiri hidup, mau mati, tidak ingin hidup, menyakiti diri, self harm, overdose',
  },

  // ── Fitur ──
  {
    key: 'maintenance_mode',
    group: 'fitur',
    label: 'Mode pemeliharaan',
    help: 'Hanya admin yang bisa masuk; pengguna lain melihat halaman pemberitahuan.',
    schema: bool(),
    default: false,
    public: true,
  },
  {
    key: 'forum_enabled',
    group: 'fitur',
    label: 'Forum diskusi aktif',
    schema: bool(),
    default: true,
  },
  {
    key: 'prayer_enabled',
    group: 'fitur',
    label: 'Prayer wall aktif',
    schema: bool(),
    default: true,
  },
  {
    key: 'cellgroup_enabled',
    group: 'fitur',
    label: 'KK & KTB aktif',
    schema: bool(),
    default: true,
  },

  // ── Konseling ──
  {
    key: 'booking_min_lead_hours',
    group: 'konseling',
    label: 'Jeda minimum booking (jam)',
    help: 'Berapa jam sebelumnya anggota paling lambat bisa memesan sesi.',
    schema: int(0, 168),
    default: 12,
  },
  {
    key: 'session_auto_close_hours',
    group: 'konseling',
    label: 'Tutup sesi otomatis setelah (jam)',
    help: 'Sesi tanpa pesan baru selama ini dianggap selesai.',
    schema: int(1, 720),
    default: 72,
  },
  {
    key: 'max_active_sessions_per_konselor',
    group: 'konseling',
    label: 'Maksimum sesi aktif per konselor',
    schema: int(1, 50),
    default: 5,
  },

  // ── Notifikasi ──
  {
    key: 'notify_on_new_thread',
    group: 'notifikasi',
    label: 'Beri tahu moderator saat ada diskusi baru',
    schema: bool(),
    default: false,
  },
  {
    key: 'notify_on_report',
    group: 'notifikasi',
    label: 'Beri tahu moderator saat ada laporan konten',
    schema: bool(),
    default: true,
  },

  // ── Data & retensi ──
  {
    key: 'trash_retention_days',
    group: 'data',
    label: 'Simpan isi tempat sampah (hari)',
    help: 'Setelah ini konten di tempat sampah boleh dibersihkan permanen.',
    schema: int(1, 365),
    default: 30,
  },
  {
    key: 'audit_retention_days',
    group: 'data',
    label: 'Simpan log audit (hari)',
    help: 'Log audit bersifat append-only; penghapusan sebaiknya lewat partisi, bukan DELETE.',
    schema: int(30, 3650),
    default: 730,
  },

  // ── Keamanan ──
  {
    key: 'require_mfa_for_admins',
    group: 'keamanan',
    label: 'Wajibkan MFA untuk admin',
    help: 'Bila aktif, admin tanpa verifikasi dua langkah diminta mengaktifkannya.',
    schema: bool(),
    default: false,
  },
  {
    key: 'session_timeout_minutes',
    group: 'keamanan',
    label: 'Keluar otomatis setelah tidak aktif (menit)',
    schema: int(15, 10080),
    default: 1440,
  },

  // ── Darurat ──
  {
    key: 'crisis_notice',
    group: 'darurat',
    label: 'Peringatan krisis',
    help: 'Tampil di beranda saat diisi. Kosongkan untuk menyembunyikan.',
    schema: text(300),
    default: '',
    public: true,
  },
  {
    key: 'sos_whatsapp_number',
    group: 'darurat',
    label: 'Nomor WhatsApp SOS',
    help: 'Nomor tujuan tombol SOS, format internasional tanpa tanda + (mis. 62811...).',
    schema: text(20),
    default: '',
    public: true,
  },
  {
    key: 'fonnte_token',
    group: 'notifikasi',
    label: 'Token Fonnte (WhatsApp)',
    help:
      'Token pengiriman WhatsApp. Disimpan di sini supaya bisa diganti tanpa deploy ulang saat token dicabut. Kosongkan untuk memakai variabel lingkungan FONNTE_TOKEN.',
    schema: text(200),
    // SENGAJA tidak `public`: token ini setara kata sandi. RLS pada site_settings
    // hanya mengembalikan kunci publik kepada pengunjung anonim.
    default: '',
  },
]

/** Peta cepat key -> definisi. */
export const SETTINGS_BY_KEY: Record<string, SettingDef> = Object.fromEntries(
  SETTINGS.map((s) => [s.key, s])
)

export type SettingKey = (typeof SETTINGS)[number]['key']

/** Kunci pengaturan yang boleh dibaca tanpa login. */
export const PUBLIC_SETTING_KEYS: string[] = SETTINGS.filter((s) => s.public).map((s) => s.key)

// ─────────────────────────────────────────────────────────────
// Membaca nilai
// ─────────────────────────────────────────────────────────────
//
// coerceSetting tinggal DI SINI, bukan di get.ts, karena ia murni: masuk nilai
// mentah, keluar nilai tervalidasi. Menempatkannya bersama skemanya membuat
// satu berkas yang bisa diuji tanpa menyentuh Supabase atau Next.js.

/** Lepas pembungkus { value: X }; toleran terhadap bentuk lama (nilai telanjang). */
function unwrap(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    return (raw as { value: unknown }).value
  }
  return raw
}

/**
 * Validasi nilai mentah terhadap skema kunci tersebut.
 * Mengembalikan default bila tidak valid, `undefined` bila kuncinya asing.
 */
export function coerceSetting(key: string, raw: unknown): unknown {
  const def = SETTINGS_BY_KEY[key]
  if (!def) return undefined

  let value = unwrap(raw)

  // Toleransi bentuk lama: boolean disimpan sebagai string "on"/"true"/"false",
  // angka sebagai string. Inilah yang dulu membuat toggle tampak "tertutup".
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'on' || v === 'true') value = true
    else if (v === 'off' || v === 'false') value = false
    else if (v === '') {
      // String kosong hanya berarti "kosongkan" bila nilai bawaannya memang
      // teks. Untuk field boolean/angka, kosong berarti "belum diisi" dan
      // harus jatuh ke default. Tanpa pemisahan ini, admin tidak bisa
      // mengosongkan crisis_keywords untuk mematikan deteksi — nilainya
      // diam-diam kembali ke daftar bawaan.
      value = typeof def.default === 'string' ? '' : undefined
    } else if (typeof def.default === 'number' && !Number.isNaN(Number(v))) value = Number(v)
  }

  const parsed = def.schema.safeParse(value)
  return parsed.success ? parsed.data : def.default
}

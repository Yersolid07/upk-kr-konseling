-- supabase/public-settings-read.sql
--
-- CELAH YANG DIPERBAIKI
--
-- Policy `settings_select` di cms-rbac.sql berbunyi:
--
--     CREATE POLICY "settings_select" ON public.site_settings FOR SELECT
--       TO authenticated USING (TRUE);
--
-- Perhatikan `TO authenticated`. Pengunjung yang BELUM masuk tidak termasuk
-- peran itu, sehingga tabel ini mengembalikan nol baris untuk mereka — bukan
-- error, hanya kosong. Akibatnya setiap pembacaan pengaturan oleh halaman
-- publik diam-diam jatuh ke nilai default:
--
--   * /contact menampilkan placeholder nomor WhatsApp alih-alih nomor asli
--   * halaman masuk tidak tahu apakah pendaftaran dibuka
--   * mode pemeliharaan tidak pernah terlihat oleh pengunjung
--   * peringatan krisis di beranda tidak pernah tampil
--
-- Semuanya gagal tanpa satu pun pesan di log, karena "tidak ada baris" adalah
-- jawaban yang sah untuk SELECT.
--
-- PERBAIKAN
--
-- Policy kedua untuk peran `anon` yang HANYA membuka kunci yang memang
-- ditandai publik di registry (src/lib/settings/registry.ts, `public: true`).
-- Kunci sensitif — token Fonnte, kata kunci krisis, ambang laporan, kebijakan
-- retensi — tetap tertutup untuk pengunjung.
--
-- Daftar di bawah adalah salinan dari registry. Salinan bisa melenceng, jadi
-- test/public-settings.test.ts membandingkan keduanya dan gagal bila berbeda.
-- Kalau kamu menambah pengaturan publik baru, tambahkan kuncinya di sini dan
-- di registry — uji akan menagihnya.

DROP POLICY IF EXISTS "settings_select_public" ON public.site_settings;

CREATE POLICY "settings_select_public" ON public.site_settings
  FOR SELECT
  TO anon
  USING (
    key IN (
      'site_name',
      'site_tagline',
      'registration_open',
      'konselor_recruiting',
      'maintenance_mode',
      'crisis_notice',
      'sos_whatsapp_number'
    )
  );

-- Catatan: policy permissive digabung dengan OR, jadi `authenticated` tetap
-- memakai settings_select (semua kunci), sementara `anon` hanya mendapat
-- potongan di atas. Tidak ada yang kehilangan akses yang sudah dimiliki.

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '2026-10-17-public-settings-read',
  'Pengunjung anonim boleh membaca pengaturan yang ditandai publik'
)
ON CONFLICT (version) DO NOTHING;

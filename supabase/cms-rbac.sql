-- =====================================================
-- CMS + RBAC + APPROVAL WORKFLOW + ATTACHMENTS + ONBOARDING
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Idempotent: aman dijalankan berulang.
--
-- Isi migrasi ini:
--   1. Tipe baru: publication_status, application_status, attachment_kind,
--      content_kind, audit_action
--   2. RBAC: helper peran + hierarki + kolom pendukung
--   3. CMS: site_settings (key-value), hotline_contacts, legal_documents
--   4. Alur persetujuan: articles.status + kolom review
--   5. Lampiran: attachments (polimorfik) + Supabase Storage bucket "media"
--   6. Onboarding konselor: konselor_applications + konselor_profiles
--   7. Audit log
--   8. RLS untuk semua tabel baru
--   9. Seed: pengaturan default, hotline resmi, dokumen legal
-- =====================================================

-- =====================================================
-- 1. TIPE ENUM BARU
-- =====================================================
DO $$ BEGIN
  CREATE TYPE publication_status AS ENUM ('draft','pending_review','published','rejected','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending','under_review','approved','rejected','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attachment_kind AS ENUM ('image','video','audio','document','link','embed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_kind AS ENUM ('thread','comment','article','prayer_request','cell_group_message','chat_message','profile');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('create','update','delete','publish','unpublish','approve','reject','role_change','settings_change','login','export');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 2. RBAC — hierarki peran & helper
--    super_admin (5) > admin (4) > moderator (3) > konselor (2) > member (1)
-- =====================================================
CREATE OR REPLACE FUNCTION public.role_rank(p_role user_role)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_role
    WHEN 'super_admin' THEN 5
    WHEN 'admin'       THEN 4
    WHEN 'moderator'   THEN 3
    WHEN 'konselor'    THEN 2
    ELSE 1
  END;
$$;

-- Peran efektif pemanggil (NULL bila belum login / profil belum ada).
--
-- CATATAN: nama fungsinya `current_user_role`, BUKAN `current_role`.
-- `CURRENT_ROLE` adalah keyword bawaan SQL; memakainya sebagai nama fungsi
-- mengundang masalah sintaksis dan membingungkan pembaca. Nama ini sama dengan
-- yang sudah dipakai supabase/rls.sql, jadi keduanya menunjuk SATU fungsi yang
-- sama (didefinisikan ulang di sini agar migrasi ini bisa dijalankan mandiri).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Pemanggil minimal selevel p_role?
CREATE OR REPLACE FUNCTION public.has_min_role(p_role user_role)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE(public.role_rank(public.current_user_role()) >= public.role_rank(p_role), FALSE);
$$;

-- Moderation = moderator ke atas (boleh menandai/merapikan konten).
CREATE OR REPLACE FUNCTION public.is_moderator_or_above()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT public.has_min_role('moderator');
$$;

-- CMS = admin ke atas (mengubah pengaturan situs, menyetujui publikasi).
CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT public.has_min_role('admin');
$$;

-- COALESCE wajib: saat tidak ada sesi, current_user_role() NULL sehingga
-- ekspresi ini NULL. Di RLS itu gagal tertutup, tetapi di PL/pgSQL
-- `IF NOT NULL` TIDAK masuk cabang — penjaga izin justru terlewati.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE(public.current_user_role() = 'super_admin', FALSE);
$$;

-- =====================================================
-- 3. CMS: site_settings — pengaturan key-value
-- =====================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. CMS: hotline_contacts — nomor darurat yang bisa diatur
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hotline_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  number      TEXT NOT NULL,                  -- nomor mentah, untuk tel:/wa.me
  display     TEXT,                           -- teks yang ditampilkan
  type        TEXT NOT NULL DEFAULT 'phone',  -- phone | whatsapp | url
  note        TEXT,                           -- badge: "24 jam", "Jam kerja"
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. CMS: legal_documents — Syarat & Ketentuan, Privasi, Panduan
-- =====================================================
CREATE TABLE IF NOT EXISTS public.legal_documents (
  slug           TEXT PRIMARY KEY,          -- 'terms' | 'privacy' | 'konselor-guide'
  title          TEXT NOT NULL,
  summary        TEXT,
  content        TEXT NOT NULL,             -- markdown
  version        INT NOT NULL DEFAULT 1,
  effective_date DATE,
  is_published   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. ALUR PERSETUJUAN ARTIKEL
--    Artikel baru masuk 'pending_review'; admin/super_admin menyetujui
--    sebelum tampil di dinding renungan.
-- =====================================================
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS status publication_status NOT NULL DEFAULT 'draft';

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Selaraskan artikel lama: yang sudah published tetap published, sisanya draft.
UPDATE public.articles
SET status = CASE WHEN is_published THEN 'published'::publication_status
                  ELSE 'draft'::publication_status END
WHERE status = 'draft'::publication_status
  AND is_published = TRUE;

-- PENTING soal trigger artikel:
-- Ada DUA aturan yang harus berlaku pada setiap INSERT/UPDATE articles:
--   (a) non-admin tidak boleh menerbitkan sendiri (dipaksa `pending_review`);
--   (b) `is_published` dan `published_at` harus selalu sinkron dengan `status`.
-- Keduanya digabung dalam SATU fungsi `enforce_article_publication()` di bagian
-- bawah file ini (bagian 11). Alasannya: PostgreSQL menjalankan beberapa trigger
-- BEFORE pada tabel yang sama menurut urutan abjad NAMA trigger, bukan urutan
-- pembuatan. Kalau dipisah, `trg_articles_force_review` (f) berjalan lebih dulu
-- daripada `trg_articles_sync_publication` (s), lalu trigger kedua menimpa
-- `is_published` menjadi TRUE sehingga artikel non-admin lolos terbit.

DROP TRIGGER IF EXISTS trg_articles_sync_publication ON public.articles;
DROP TRIGGER IF EXISTS trg_articles_force_review ON public.articles;

CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles(status);

-- =====================================================
-- 7. LAMPIRAN POLIMORFIK + SUPABASE STORAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_kind NOT NULL,
  content_id   UUID,                    -- NULL = lampiran draf, diikat saat simpan
  kind         attachment_kind NOT NULL,
  url          TEXT NOT NULL,
  title        TEXT,
  mime_type    TEXT,
  size_bytes   BIGINT,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_content ON public.attachments(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_attachments_owner   ON public.attachments(owner_id);

-- Bucket media (publik-baca; hanya pemilik yang boleh menulis ke foldernya).
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', TRUE)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. ONBOARDING KONSELOR
-- =====================================================
CREATE TABLE IF NOT EXISTS public.konselor_applications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  motivation        TEXT NOT NULL,
  experience        TEXT,
  credential_url    TEXT,                    -- lampiran bukti/kredensial
  specialization    TEXT[] DEFAULT '{}',
  availability_note TEXT,
  status            application_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_konselor_app_status ON public.konselor_applications(status);

-- Satu pengajuan aktif per pengguna.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_konselor_app_active
  ON public.konselor_applications(user_id)
  WHERE status IN ('pending','under_review');

-- Profil konselor (tampil di halaman booking).
CREATE TABLE IF NOT EXISTS public.konselor_profiles (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  specialization TEXT[] DEFAULT '{}',
  bio            TEXT,
  approach       TEXT,
  languages      TEXT[] DEFAULT ARRAY['Bahasa Indonesia'],
  session_length INT NOT NULL DEFAULT 60,
  is_accepting   BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at    TIMESTAMPTZ,
  verified_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 9. AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role  user_role,
  action      audit_action NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  detail      JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON public.audit_log(actor_id);

-- Helper pencatat audit (dipanggil dari server action / trigger).
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action audit_action, p_entity TEXT, p_entity_id TEXT DEFAULT NULL,
  p_detail JSONB DEFAULT '{}'::jsonb
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, actor_role, action, entity, entity_id, detail)
  VALUES (auth.uid(), public.current_user_role(), p_action, p_entity, p_entity_id, p_detail);
END;
$$;

-- =====================================================
-- 10. RLS UNTUK TABEL BARU
-- =====================================================
ALTER TABLE public.site_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotline_contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.konselor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.konselor_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log            ENABLE ROW LEVEL SECURITY;

-- site_settings: semua yang login boleh baca; hanya admin ke atas yang ubah.
DROP POLICY IF EXISTS "settings_select" ON public.site_settings;
CREATE POLICY "settings_select" ON public.site_settings FOR SELECT
  TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "settings_write" ON public.site_settings;
CREATE POLICY "settings_write" ON public.site_settings FOR ALL
  TO authenticated USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- hotline_contacts: dibaca semua pengguna; diubah admin ke atas.
DROP POLICY IF EXISTS "hotline_select" ON public.hotline_contacts;
CREATE POLICY "hotline_select" ON public.hotline_contacts FOR SELECT
  TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "hotline_write" ON public.hotline_contacts;
CREATE POLICY "hotline_write" ON public.hotline_contacts FOR ALL
  TO authenticated USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- legal_documents: hanya yang published yang terbaca pengguna biasa;
-- admin ke atas melihat semuanya (termasuk draf).
DROP POLICY IF EXISTS "legal_select" ON public.legal_documents;
CREATE POLICY "legal_select" ON public.legal_documents FOR SELECT
  TO authenticated USING (is_published OR public.is_admin_or_above());

DROP POLICY IF EXISTS "legal_write" ON public.legal_documents;
CREATE POLICY "legal_write" ON public.legal_documents FOR ALL
  TO authenticated USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- attachments: terbaca semua yang login; ditulis hanya oleh pemiliknya.
DROP POLICY IF EXISTS "attachments_select" ON public.attachments;
CREATE POLICY "attachments_select" ON public.attachments FOR SELECT
  TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "attachments_insert" ON public.attachments;
CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "attachments_update" ON public.attachments;
CREATE POLICY "attachments_update" ON public.attachments FOR UPDATE
  TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "attachments_delete" ON public.attachments;
CREATE POLICY "attachments_delete" ON public.attachments FOR DELETE
  TO authenticated USING (owner_id = auth.uid() OR public.is_moderator_or_above());

-- konselor_applications: pengguna melihat miliknya sendiri; admin melihat semua.
DROP POLICY IF EXISTS "konselor_app_select" ON public.konselor_applications;
CREATE POLICY "konselor_app_select" ON public.konselor_applications FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_above());

DROP POLICY IF EXISTS "konselor_app_insert" ON public.konselor_applications;
CREATE POLICY "konselor_app_insert" ON public.konselor_applications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- Pengguna boleh menarik pengajuan; keputusan hanya admin ke atas.
DROP POLICY IF EXISTS "konselor_app_update" ON public.konselor_applications;
CREATE POLICY "konselor_app_update" ON public.konselor_applications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above())
  WITH CHECK (
    public.is_admin_or_above()
    OR (user_id = auth.uid() AND status IN ('pending','under_review','withdrawn'))
  );

-- konselor_profiles: terbaca semua (dipakai halaman booking).
DROP POLICY IF EXISTS "konselor_profile_select" ON public.konselor_profiles;
CREATE POLICY "konselor_profile_select" ON public.konselor_profiles FOR SELECT
  TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "konselor_profile_write" ON public.konselor_profiles;
CREATE POLICY "konselor_profile_write" ON public.konselor_profiles FOR ALL
  TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_above())
  WITH CHECK (user_id = auth.uid() OR public.is_admin_or_above());

-- audit_log: hanya admin ke atas yang boleh membaca; penulisan lewat fungsi
-- SECURITY DEFINER (log_audit) sehingga tidak perlu policy INSERT.
DROP POLICY IF EXISTS "audit_select" ON public.audit_log;
CREATE POLICY "audit_select" ON public.audit_log FOR SELECT
  TO authenticated USING (public.is_admin_or_above());

-- Storage: bucket "media" — publik baca, pengguna menulis hanya di folder uid-nya.
DROP POLICY IF EXISTS "media_read" ON storage.objects;
CREATE POLICY "media_read" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_insert" ON storage.objects;
CREATE POLICY "media_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "media_delete" ON storage.objects;
CREATE POLICY "media_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================
-- 11. TRIGGER: alur publikasi artikel (aturan approval + sinkronisasi)
--     Digabung dalam SATU fungsi. Lihat catatan di bagian 6: kalau dipisah
--     menjadi dua trigger BEFORE, PostgreSQL menjalankannya menurut urutan
--     abjad nama trigger sehingga aturan approval bisa tertimpa.
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_article_publication()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- (a) Anggota dan konselor tidak boleh menerbitkan sendiri.
  -- `IS NOT TRUE`: bila peran tidak terbaca (NULL), artikel tetap ditahan
  -- untuk ditinjau — bukan lolos terbit.
  IF public.is_admin_or_above() IS NOT TRUE AND NEW.status = 'published' THEN
    NEW.status := 'pending_review';
  END IF;

  -- (b) is_published & published_at selalu mengikuti status.
  --     Dijalankan SETELAH (a) supaya tidak bisa dipakai menembus approval.
  NEW.is_published := (NEW.status = 'published');
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_articles_enforce_publication ON public.articles;
DROP TRIGGER IF EXISTS trg_articles_force_review ON public.articles;
DROP TRIGGER IF EXISTS trg_articles_sync_publication ON public.articles;
CREATE TRIGGER trg_articles_enforce_publication
  BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_article_publication();

-- =====================================================
-- 12. TRIGGER: promosi role saat pengajuan konselor disetujui
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_konselor_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.profiles
    SET role = CASE WHEN public.role_rank(role) >= 4 THEN role ELSE 'konselor'::user_role END
    WHERE id = NEW.user_id;

    INSERT INTO public.konselor_profiles (user_id, specialization, verified_at, verified_by)
    VALUES (NEW.user_id, COALESCE(NEW.specialization, '{}'), NOW(), auth.uid())
    ON CONFLICT (user_id) DO UPDATE
      SET specialization = COALESCE(EXCLUDED.specialization, public.konselor_profiles.specialization),
          verified_at    = NOW(),
          verified_by    = auth.uid(),
          updated_at     = NOW();

    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.user_id, 'konselor_verified', 'Pengajuan Konselor Disetujui',
            'Selamat! Kamu kini terverifikasi sebagai Konselor IKA UPK-Kr FT UNSRAT.', '/konselor');

    PERFORM public.log_audit('approve', 'konselor_application', NEW.id::text,
                             jsonb_build_object('user_id', NEW.user_id));
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.user_id, 'system', 'Pengajuan Konselor Belum Disetujui',
            COALESCE(NEW.review_notes, 'Pengajuanmu belum dapat disetujui saat ini.'), '/konselor/daftar');

    PERFORM public.log_audit('reject', 'konselor_application', NEW.id::text,
                             jsonb_build_object('user_id', NEW.user_id));
  END IF;

  NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_konselor_approval ON public.konselor_applications;
CREATE TRIGGER trg_konselor_approval
  BEFORE UPDATE ON public.konselor_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_konselor_approval();

-- =====================================================
-- 13. SEED: pengaturan default
-- =====================================================
INSERT INTO public.site_settings (key, value, description) VALUES
  ('site_name',          '{"id":"IKA UPK-Kr FT UNSRAT","en":"IKA UPK-Kr FT UNSRAT"}'::jsonb, 'Nama situs'),
  ('site_tagline',       '{"id":"Ruang aman untuk berbagi, berdoa, dan bertumbuh bersama"}'::jsonb, 'Tagline'),
  ('article_requires_approval', '{"value":true}'::jsonb, 'Artikel wajib disetujui admin sebelum terbit'),
  ('prayer_requires_approval',  '{"value":false}'::jsonb, 'Permintaan doa wajib disetujui admin'),
  ('registration_open',  '{"value":true}'::jsonb, 'Pendaftaran anggota baru dibuka'),
  ('konselor_recruiting','{"value":true}'::jsonb, 'Menerima pengajuan konselor baru'),
  ('crisis_notice',      '{"id":"Jika Anda dalam bahaya langsung, hubungi 112 atau IGD terdekat."}'::jsonb, 'Peringatan krisis')
ON CONFLICT (key) DO NOTHING;

-- Upgrade only the previous default; preserve custom names set by super_admin.
UPDATE public.site_settings
SET value = jsonb_build_object('id', 'IKA UPK-Kr FT UNSRAT', 'en', 'IKA UPK-Kr FT UNSRAT'),
    updated_at = now()
WHERE key = 'site_name'
  AND value->>'id' IN ('UPK-Kr. Konseling', 'UPK-Kr Konseling');

-- =====================================================
-- 14. SEED: hotline resmi (bisa diubah super admin dari panel CMS)
-- =====================================================
INSERT INTO public.hotline_contacts (name, description, number, display, type, note, sort_order)
SELECT * FROM (VALUES
  ('Healing119.id (Kemenkes)',
   'Layanan dukungan psikologis awal untuk krisis psikologis dan pikiran menyakiti diri. Panggil 119 lalu tekan ekstensi 8, atau chat WhatsApp lewat healing119.id.',
   '119', '119 ekst. 8', 'phone', 'Jam kerja', 1),
  ('D''Patens 24 Jam',
   'Dukungan psikososial melalui hotline layanan 24 jam dari Kementerian Kesehatan, untuk situasi yang tidak bisa menunggu.',
   '081197910000', '0811 979 10000', 'phone', '24 jam', 2),
  ('Darurat Umum',
   'Nomor darurat nasional untuk situasi yang mengancam nyawa. Petugas akan mengarahkan ke layanan medis terdekat.',
   '112', '112', 'phone', '24 jam', 3)
) AS v(name, description, number, display, type, note, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.hotline_contacts);

-- =====================================================
-- 15. SEED: dokumen legal (bisa disunting dari panel CMS)
-- =====================================================
INSERT INTO public.legal_documents (slug, title, summary, content, effective_date)
VALUES
  ('terms', 'Syarat & Ketentuan',
   'Aturan penggunaan layanan IKA UPK-Kr FT UNSRAT.',
   E'# Syarat & Ketentuan\n\n## 1. Penerimaan\nDengan membuat akun dan menggunakan IKA UPK-Kr FT UNSRAT, kamu menyetujui ketentuan ini.\n\n## 2. Bukan Layanan Darurat\nAplikasi ini **bukan** layanan gawat darurat. Jika kamu dalam bahaya langsung, hubungi 112 atau IGD terdekat.\n\n## 3. Kerahasiaan\nIdentitas asli penulis konten anonim hanya dapat dibuka oleh super admin melalui prosedur resmi, dan setiap pembukaan tercatat permanen di log audit.\n\n## 4. Tanggung Jawab Pengguna\nKamu bertanggung jawab atas konten yang kamu kirim. Dilarang mengirim konten yang melecehkan, mengancam, atau melanggar hukum.\n\n## 5. Moderasi\nModerator dan admin dapat menandai, menyembunyikan, atau menghapus konten yang melanggar ketentuan.\n\n## 6. Perubahan Ketentuan\nKetentuan dapat diperbarui. Perubahan material akan diberitahukan lewat notifikasi aplikasi.',
   CURRENT_DATE),
  ('privacy', 'Kebijakan Privasi',
   'Data apa yang kami kumpulkan dan bagaimana kami melindunginya.',
   E'# Kebijakan Privasi\n\n## 1. Data yang Kami Kumpulkan\nNama lengkap, email, angkatan, jurusan, dan konten yang kamu kirim (diskusi, doa, pesan, lampiran).\n\n## 2. Dasar Penggunaan\nData dipakai untuk menjalankan layanan: menampilkan profil, menghubungkan kamu dengan konselor, dan menampilkan kontenmu di komunitas.\n\n## 3. Mode Anonim\nSaat mode anonim aktif, nama aslimu tidak ditampilkan ke pengguna lain. Identitas tetap tersimpan di sistem agar konselor dapat menindaklanjuti kasus berat.\n\n## 4. Percakapan Konseling\nIsi percakapan 1-on-1 hanya dapat dibaca oleh kamu dan konselor yang bersangkutan.\n\n## 5. Berbagi Data\nKami tidak menjual atau membagikan datamu ke pihak ketiga untuk tujuan komersial.\n\n## 6. Hak Kamu\nKamu dapat meminta ekspor atau penghapusan datamu dengan menghubungi pengelola melalui halaman kontak.\n\n## 7. Retensi\nData disimpan selama akunmu aktif. Setelah penghapusan akun, data pribadi dihapus dan konten publik dianonimkan.',
   CURRENT_DATE),
  ('konselor-guide', 'Panduan Menjadi Konselor',
   'Alur dan syarat menjadi konselor IKA UPK-Kr FT UNSRAT.',
   E'# Panduan Menjadi Konselor\n\n## 1. Syarat\nAnggota terdaftar, berkomitmen menjaga kerahasiaan, dan bersedia mengikuti pembinaan IKA UPK-Kr FT UNSRAT.\n\n## 2. Alur\n1. Ajukan lewat halaman **Dashboard Konselor** > **Ajukan sebagai Konselor**.\n2. Isi motivasi, pengalaman, spesialisasi, dan lampirkan bukti kredensial bila ada.\n3. Pengajuan ditinjau admin/super admin.\n4. Bila disetujui, peranmu otomatis berubah menjadi `konselor` dan profilmu muncul di halaman booking.\n\n## 3. Kode Etik\nMenjaga kerahasiaan konseli, tidak memberi diagnosis medis, dan merujuk ke profesional saat kasus di luar kompetensi.\n\n## 4. Status Pengajuan\nPantau status di halaman yang sama: *pending*, *under_review*, *approved*, atau *rejected*.',
   CURRENT_DATE)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- VERIFIKASI
-- =====================================================
SELECT 'site_settings'        AS tabel, COUNT(*) AS baris FROM public.site_settings
UNION ALL SELECT 'hotline_contacts',     COUNT(*) FROM public.hotline_contacts
UNION ALL SELECT 'legal_documents',      COUNT(*) FROM public.legal_documents
UNION ALL SELECT 'konselor_profiles',    COUNT(*) FROM public.konselor_profiles;

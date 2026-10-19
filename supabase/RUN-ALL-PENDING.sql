-- =====================================================
-- MIGRASI TERTUNDA — jalankan SEKALI di Supabase SQL Editor
--
-- Semua berkas di bawah idempoten: aman dijalankan berulang, aman dijalankan
-- walau sebagian sudah pernah masuk.
--
-- Cara pakai: buka Supabase -> SQL Editor -> New query, tempel SELURUH isi
-- berkas ini, lalu Run. Perhatikan pesan NOTICE di akhir tiap bagian.
-- =====================================================


-- ============================================================
-- BAGIAN 1/6: profile-trigger-fix.sql
-- PERBAIKAN WAJIB — tombol unggah foto gagal tanpa ini
-- ============================================================

-- =====================================================
-- PROFIL: trigger ganda yang menggagalkan SEMUA update profil
--
-- GEJALA
--   PATCH /rest/v1/profiles -> 400
--   {"code":"42703","message":"record \"new\" has no field \"anon_token\""}
--
-- PENYEBAB
--   Ada DUA trigger BEFORE UPDATE pada `public.profiles`:
--     trg_protect_profile_columns  -> protect_profile_columns()  (versi baru,
--                                    tanpa anon_token — benar)
--     on_profile_role_update       -> protect_profile_role()     (versi lama
--                                    dari fix-profiles-rls.sql)
--   `hotfix-security.sql` menghapus `on_profile_role_update`, tetapi
--   `fix-profiles-rls.sql` membuatnya lagi bila dijalankan sesudahnya, dan
--   `phase1-data-security.sql` hanya mendefinisikan ulang fungsi yang satunya.
--   Selama trigger lama masih ada, PL/pgSQL menyiapkan pernyataan yang merujuk
--   `NEW.anon_token` — kolom yang sudah dipindahkan ke `profile_secrets` —
--   sehingga SETIAP update profil gagal, termasuk mengganti nama dan foto.
--
--   Ini menjelaskan kenapa fitur foto profil tidak bisa dipakai sama sekali.
--
-- PERBAIKAN
--   1. Definisi ulang `protect_profile_columns()` tanpa `anon_token`.
--      Versi pertama berkas ini hanya menghapus trigger ganda dan TIDAK
--      cukup: fungsi yang benar pun tetap menyebut kolom itu, dan itu sudah
--      terbukti menggagalkan unggah foto pada akun sungguhan.
--   2. Hapus trigger lama peninggalan fix-profiles-rls.sql.
--   3. Sisakan satu trigger: `trg_protect_profile_columns`.
--
--   Perlindungan token anonim tetap dipegang RLS `profile_secrets` dan RPC
--   `rotate_anon_token()`.
-- =====================================================

-- ---------- 1. Fungsi penjaga kolom, tanpa anon_token ----------
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_caller := public.current_user_role();

  IF v_caller IS DISTINCT FROM 'super_admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF v_caller IS DISTINCT FROM 'admin'
         OR public.role_rank(OLD.role) >= 4
         OR public.role_rank(NEW.role) >= 4
         OR OLD.id = auth.uid() THEN
        NEW.role := OLD.role;
      END IF;
    END IF;

    -- Kolom sensitif di bawah ini saja yang dikunci. Token anonim sudah
    -- pindah ke tabel privat profile_secrets dan dijaga RLS di sana.
    IF v_caller IS DISTINCT FROM 'admin' THEN
      NEW.is_active   := OLD.is_active;
      NEW.is_verified := OLD.is_verified;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------- 2. Bersihkan trigger ganda ----------
DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;

CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();


-- Pastikan fungsi lama tidak menyentuh kolom yang sudah tidak ada, kalau
-- ternyata dipanggil dari tempat lain.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.is_admin_or_above() IS NOT TRUE THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- Verifikasi ----------
DO $$
DECLARE
  v_count INT;
  v_def   TEXT;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles'
    AND t.tgname IN ('on_profile_role_update', 'trg_protect_profile_role');

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Trigger lama masih terpasang (ditemukan %)', v_count;
  END IF;

  -- Trigger utama harus tetap ada dan tetap satu.
  SELECT count(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles'
    AND t.tgname = 'trg_protect_profile_columns' AND NOT t.tgisinternal;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'trg_protect_profile_columns tidak terpasang (ditemukan %)', v_count;
  END IF;

  -- Fungsi terpasang tidak boleh merujuk kolom yang sudah tidak ada.
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'protect_profile_columns';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'protect_profile_columns tidak ditemukan';
  END IF;
  IF v_def ILIKE '%anon_token%' THEN
    RAISE EXCEPTION 'protect_profile_columns masih merujuk anon_token';
  END IF;

  RAISE NOTICE 'Profil: trigger bersih, anon_token tidak lagi disebut.';
END $$;


-- ============================================================
-- BAGIAN 2/6: avatar-storage.sql
-- batas ukuran & jenis berkas bucket media
-- ============================================================

-- =====================================================
-- AVATAR: foto profil per akun
--
-- Bucket `media` sudah ada (publik baca, tulis hanya di folder uid) tetapi
-- tanpa batas ukuran dan tanpa batas jenis berkas. Tanpa keduanya, siapa pun
-- yang punya akun bisa mengunggah berkas 500 MB atau HTML yang disajikan
-- publik dari domain Supabase.
--
-- Avatar disimpan di `media/<uid>/avatar-<stempel>.webp` supaya policy folder
-- yang sudah ada otomatis berlaku: pengguna hanya bisa menulis ke foldernya
-- sendiri.
-- =====================================================

-- ---------- 1. Batas bucket ----------
-- 2 MB cukup untuk avatar 512x512 dan tidak membebani kuota gratis.
UPDATE storage.buckets
SET file_size_limit = 2097152,                       -- 2 MB
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',                                  -- lampiran konselor
      'video/mp4', 'audio/mpeg', 'audio/mp4'
    ]
WHERE id = 'media';

-- ---------- 2. Policy baca publik untuk avatar ----------
-- Bucket sudah publik, jadi berkas dapat dibaca lewat URL publik tanpa policy.
-- Policy SELECT untuk `authenticated` tetap dipertahankan untuk daftar berkas.
DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'media');

-- ---------- 3. Pastikan pengguna hanya menimpa berkasnya sendiri ----------
-- Tanpa policy UPDATE, unggah ulang ke nama yang sama gagal dengan pesan
-- "new row violates row-level security" yang membingungkan.
DROP POLICY IF EXISTS "media_update" ON storage.objects;
CREATE POLICY "media_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 4. Verifikasi ----------
DO $$
DECLARE
  v_limit  BIGINT;
  v_mimes  TEXT[];
  v_policy INT;
BEGIN
  SELECT file_size_limit, allowed_mime_types INTO v_limit, v_mimes
  FROM storage.buckets WHERE id = 'media';

  IF v_limit IS DISTINCT FROM 2097152 THEN
    RAISE EXCEPTION 'Batas ukuran bucket media tidak terpasang (ditemukan %)', v_limit;
  END IF;
  IF v_mimes IS NULL OR NOT ('image/webp' = ANY (v_mimes)) THEN
    RAISE EXCEPTION 'Daftar jenis berkas bucket media tidak terpasang';
  END IF;

  SELECT count(*) INTO v_policy FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname IN ('media_read_public', 'media_update');
  IF v_policy <> 2 THEN
    RAISE EXCEPTION 'Policy avatar tidak lengkap (ditemukan %)', v_policy;
  END IF;

  RAISE NOTICE 'Avatar: batas 2 MB, jenis berkas dibatasi, policy baca & timpa terpasang.';
END $$;


-- ============================================================
-- BAGIAN 3/6: chat-fix-sessions.sql
-- sesi chat: antrean, klaim konselor, aktivasi otomatis
-- ============================================================

-- =====================================================
-- CHAT: perbaikan sesi yang tidak pernah bisa dipakai
--
-- MASALAH YANG DIPERBAIKI
--
-- 1. Sesi dari tombol "Hubungi" dibuat dengan status 'pending' dan
--    konselor_id NULL. Policy `messages_insert` mensyaratkan
--    `status = 'active'` DAN pengirim adalah peserta sesi. Akibatnya pesan
--    pertama ditolak RLS tanpa pesan yang terlihat, dan antrean tidak pernah
--    punya konselor. Terbukti di basis data: 2 sesi 'pending', konselor NULL,
--    0 pesan.
--
-- 2. Tidak ada cara memindahkan sesi 'pending' ke konselor. Ditambahkan
--    fungsi `claim_chat_session()` yang dipanggil konselor untuk mengambil
--    sesi dari antrean — atomik, supaya dua konselor tidak mengambil sesi
--    yang sama.
--
-- 3. Sesi 'pending' tidak pernah menjadi 'active' meski konselor sudah
--    membalas. Ditambahkan trigger: pesan pertama dari konselor mengaktifkan
--    sesi.
-- =====================================================

-- ---------- 1. Peserta boleh menulis ke sesi yang belum punya konselor ----------
-- Aturan lama menuntut status 'active'. Untuk sesi 'pending' tanpa konselor,
-- anggota TETAP harus bisa menulis: justru pesan pertamanya yang menjadi
-- konteks bagi konselor yang mengambil antrean. Yang dijaga tetap sama:
-- hanya peserta sesi, dan status tidak boleh 'completed'/'cancelled'.
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = messages.session_id
        AND s.status IN ('pending', 'active')
        AND (s.member_id = auth.uid() OR s.konselor_id = auth.uid())
    )
  );

-- ---------- 2. Ambil sesi dari antrean (konselor) ----------
-- SECURITY DEFINER karena policy UPDATE chat_sessions tidak mengizinkan
-- konselor mengubah baris yang belum menjadi miliknya — memang begitu
-- seharusnya. Fungsi ini adalah satu-satunya pintu, dan syaratnya ketat:
-- pemanggil harus konselor aktif, sesi harus masih 'pending' dan belum
-- punya konselor. `FOR UPDATE` mencegah dua konselor mengambil sesi sama.
CREATE OR REPLACE FUNCTION public.claim_chat_session(p_session_id UUID)
RETURNS public.chat_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   TEXT;
  v_active BOOLEAN;
  v_row    public.chat_sessions;
BEGIN
  SELECT role, is_active INTO v_role, v_active
  FROM public.profiles WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'konselor' OR COALESCE(v_active, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Hanya konselor aktif yang dapat mengambil sesi.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.chat_sessions
  WHERE id = p_session_id
    AND status = 'pending'
    AND konselor_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi sudah diambil konselor lain atau tidak lagi tersedia.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_row.member_id = auth.uid() THEN
    RAISE EXCEPTION 'Tidak dapat mengambil sesi milik sendiri.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.chat_sessions
  SET konselor_id = auth.uid(),
      status = 'active',
      updated_at = now()
  WHERE id = p_session_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_chat_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_chat_session(UUID) TO authenticated;

-- ---------- 3. Balasan pertama konselor mengaktifkan sesi ----------
-- Tanpa ini, sesi yang diambil lewat claim sudah 'active' (baik), tetapi sesi
-- lama yang ditugaskan langsung (konselor_id terisi, status 'pending') akan
-- tetap 'pending' selamanya dan badge status di UI menyesatkan.
CREATE OR REPLACE FUNCTION public.activate_session_on_konselor_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions s
  SET status = 'active', updated_at = now()
  WHERE s.id = NEW.session_id
    AND s.status = 'pending'
    AND s.konselor_id = NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_session_on_reply ON public.messages;
CREATE TRIGGER trg_activate_session_on_reply
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.activate_session_on_konselor_reply();

-- ---------- 4. Sesi tanpa konselor boleh dibaca konselor (antrean) ----------
-- Antrean perlu memperlihatkan topik dan pesan pertama kepada konselor yang
-- mempertimbangkan mengambilnya. Akses dibatasi: hanya sesi 'pending' yang
-- belum punya konselor. Isi sesi yang sudah diambil tetap tertutup.
DROP POLICY IF EXISTS "sessions_select_queue" ON public.chat_sessions;
CREATE POLICY "sessions_select_queue" ON public.chat_sessions FOR SELECT
  TO authenticated USING (
    status = 'pending'
    AND konselor_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'konselor' AND p.is_active
    )
  );

-- ---------- 5. Verifikasi ----------
DO $$
DECLARE
  v_policy INT;
  v_fn     INT;
BEGIN
  SELECT count(*) INTO v_policy FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert';
  IF v_policy <> 1 THEN
    RAISE EXCEPTION 'Policy messages_insert tidak terpasang (ditemukan %)', v_policy;
  END IF;

  SELECT count(*) INTO v_fn FROM pg_proc
  WHERE proname IN ('claim_chat_session', 'activate_session_on_konselor_reply');
  IF v_fn <> 2 THEN
    RAISE EXCEPTION 'Fungsi chat tidak lengkap (ditemukan %)', v_fn;
  END IF;

  RAISE NOTICE 'Chat: policy insert, claim_chat_session, dan trigger aktivasi terpasang.';
END $$;


-- ============================================================
-- BAGIAN 4/6: fix-chat-last-message.sql
-- preview pesan terakhir di daftar chat
-- ============================================================

-- =====================================================
-- CHAT: last_message column + auto-maintenance
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Idempotent: aman dijalankan berulang.
--
-- Konteks: kode membaca & menulis chat_sessions.last_message
-- (daftar percakapan, preview chat), tetapi kolom ini tidak ada
-- di schema.sql sehingga query daftar chat error / kosong.
-- =====================================================

-- 1. Tambah kolom last_message
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS last_message TEXT;

-- 2. Backfill dari pesan terakhir yang ada
UPDATE public.chat_sessions s
SET last_message = m.content
FROM (
  SELECT DISTINCT ON (session_id) session_id, content
  FROM public.messages
  ORDER BY session_id, created_at DESC
) m
WHERE m.session_id = s.id
  AND (s.last_message IS NULL OR s.last_message = '');

-- 3. Trigger: setiap pesan baru memperbarui preview + updated_at sesi.
CREATE OR REPLACE FUNCTION public.touch_session_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET last_message = NEW.content,
      updated_at   = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_session_last_message();

-- 4. Trigger: notifikasi ke penerima saat ada pesan baru.
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member   UUID;
  v_konselor UUID;
  v_recipient UUID;
BEGIN
  SELECT member_id, konselor_id INTO v_member, v_konselor
  FROM public.chat_sessions WHERE id = NEW.session_id;

  -- Recipient is the other party in the session.
  v_recipient := CASE WHEN NEW.sender_id = v_member THEN v_konselor ELSE v_member END;

  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_recipient,
      'new_message',
      'Pesan Baru',
      LEFT(NEW.content, 80),
      '/chat/' || NEW.session_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify ON public.messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();


-- ============================================================
-- BAGIAN 5/6: patch-null-guards.sql
-- penjaga izin tahan NULL
-- ============================================================

-- ============================================================
-- PATCH KEAMANAN — penjaga izin yang tidak tahan NULL
--
-- Jalankan SETELAH phase4-advanced-modules.sql.
--
-- MASALAH
-- `is_super_admin()` mengembalikan NULL saat tidak ada sesi, karena
-- `current_user_role()` juga NULL. Di RLS ini gagal TERTUTUP (NULL tidak
-- lolos), tetapi di PL/pgSQL `IF NOT NULL` TIDAK masuk ke cabang `THEN` —
-- artinya penjaga izin justru TERLEWATI.
--
-- BUKTI
-- `break_glass_open_session` dipanggil tanpa sesi: alih-alih menolak dengan
-- "Hanya super admin", fungsi berjalan sampai INSERT dan gagal di NOT NULL
-- kolom `actor_id`. Bila kolom itu punya DEFAULT, isi chat privat akan
-- terbaca tanpa izin.
--
-- Berkas ini idempoten; aman dijalankan berulang.
-- ============================================================

-- ------------------------------------------------------------
-- 1. AKAR: is_super_admin() harus COALESCE
-- ------------------------------------------------------------
-- `is_admin_or_above` dan `is_moderator_or_above` sudah aman karena
-- mendelegasikan ke has_min_role() yang memakai COALESCE. Hanya
-- is_super_admin() yang telanjang.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'super_admin', FALSE);
$$;

-- ------------------------------------------------------------
-- 2. notify_user — bandingkan dengan IS NOT TRUE
-- ------------------------------------------------------------
-- Saat auth.uid() NULL, `auth.uid() = p_user_id` juga NULL; `NOT NULL` tidak
-- masuk cabang sehingga pemeriksaan izin terlewati.
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_type    public.notification_type,
  p_title   TEXT,
  p_body    TEXT DEFAULT NULL,
  p_link    TEXT DEFAULT NULL,
  p_meta    JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF (public.is_admin_or_above() IS NOT TRUE
      AND auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, meta)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_meta)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_user(UUID, public.notification_type, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_user(UUID, public.notification_type, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;

-- ------------------------------------------------------------
-- 3. Trigger penerbitan artikel — gagal tertutup
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_article_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bila peran tidak terbaca (NULL), artikel DITAHAN untuk ditinjau —
  -- bukan lolos terbit.
  IF public.is_admin_or_above() IS NOT TRUE AND NEW.status = 'published' THEN
    NEW.status := 'pending_review';
  END IF;

  NEW.is_published := (NEW.status = 'published');
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 4. Trigger profil — cegah eskalasi peran
-- ------------------------------------------------------------
-- `protect_profile_role()` dari fix-profiles-rls.sql sudah DIGANTIKAN oleh
-- `protect_profile_columns()` di hotfix-security.sql, yang memeriksa peringkat
-- peran dan mengunci is_active/is_verified. Yang dijalankan adalah versi
-- terbaru — bukan yang lama. Didefinisikan ulang di sini HANYA untuk mengganti
-- `NOT is_admin_or_above()` menjadi `IS NOT TRUE` pada berkas lamanya, supaya
-- pembacaan ulang berkas itu tidak menyesatkan.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.is_admin_or_above() IS NOT TRUE THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 5. VERIFIKASI
-- ------------------------------------------------------------
-- Setelah dijalankan, ini HARUS mengembalikan `false` (bukan NULL) saat
-- dipanggil tanpa sesi:
--   SELECT public.is_super_admin();
--
-- Dan ini HARUS melempar "Hanya super admin...":
--   SELECT public.break_glass_open_session(gen_random_uuid(), 'alasan panjang');


-- ============================================================
-- BAGIAN 6/6: public-settings-read.sql
-- pengaturan situs bisa dibaca publik
-- ============================================================

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


-- =====================================================
-- SELESAI. Semua bagian di atas harus lolos tanpa error.
-- =====================================================

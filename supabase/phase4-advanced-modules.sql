-- ============================================================
-- FASE 4 — MODUL LANJUTAN (M6, M7, M9, M10, M12, M13, M14)
--
-- Satu berkas untuk seluruh Fase 4, dijalankan SETELAH:
--   cms-rbac.sql -> hotfix-security.sql -> phase1-data-security.sql
--   -> cms-superadmin.sql -> phase3-content-modules.sql
--
-- Semua perintah idempoten: aman dijalankan ulang.
--
-- Isi:
--   1. KK & KTB (M6)          — kode undangan wajib, batas anggota, arsip
--   2. Konseling (M7)         — catatan sesi terpisah, break-glass, pengalihan
--   3. Siaran (M9)            — broadcast, templat, jadwal, riwayat
--   4. Konten situs (M10)     — site_pages, site_banners, resources
--   5. Media (M12)            — kuota, pemakaian, deteksi yatim
--   6. Privasi (M13)          — permintaan data, log pembukaan identitas
--   7. Sistem (M14)           — schema_migrations, status sistem
-- ============================================================

-- ------------------------------------------------------------
-- 1. KK & KTB (M6)
-- ------------------------------------------------------------
-- `invite_code_required`: dulu siapa pun yang tahu ID grup bisa join tanpa
-- kode. Kolom ini membuat keanggotaan benar-benar terbatas pada yang diundang.
-- `max_members`: 0 berarti tanpa batas. Grup besar berhenti menjadi kelompok
-- yang saling mengenal — justru itu nilai KK/KTB.
ALTER TABLE public.cell_groups
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_code_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_members INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.cell_groups.invite_code_required IS
  'Bila true, bergabung wajib memakai kode undangan yang benar.';
COMMENT ON COLUMN public.cell_groups.max_members IS
  'Batas jumlah anggota. 0 = tanpa batas.';

-- Pesan grup perlu penanda moderasi supaya admin bisa menghapus pesan yang
-- melanggar tanpa menghapus seluruh grup.
ALTER TABLE public.cell_group_messages
  ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cg_messages_visible
  ON public.cell_group_messages (group_id, created_at)
  WHERE deleted_at IS NULL AND moderation_status = 'visible';

-- `updated_at` diisi database, bukan kode aplikasi. Satu jalur tulis yang
-- melewatkan pembaruan kolom ini akan membuat data "terakhir diubah" berbohong.
DROP TRIGGER IF EXISTS cell_groups_updated_at ON public.cell_groups;
CREATE TRIGGER cell_groups_updated_at BEFORE UPDATE ON public.cell_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Cek keanggotaan + batas anggota + kode undangan dalam satu RPC.
--
-- Kenapa RPC, bukan Server Action biasa: pemeriksaan jumlah anggota lalu
-- penambahan anggota adalah dua langkah. Dua permintaan bersamaan bisa
-- sama-sama lolos pemeriksaan dan membuat grup melebihi batas. Di dalam satu
-- fungsi, keduanya terjadi dalam transaksi yang sama.
CREATE OR REPLACE FUNCTION public.join_cell_group(
  p_group_id UUID,
  p_invite_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_group    public.cell_groups%ROWTYPE;
  v_count    INT;
  v_existing BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Masuk dulu untuk bergabung.');
  END IF;

  -- Kunci baris supaya dua permintaan bersamaan tidak melewati batas anggota.
  SELECT * INTO v_group FROM public.cell_groups WHERE id = p_group_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Grup tidak ditemukan.');
  END IF;
  IF v_group.is_archived THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Grup ini sudah diarsipkan.');
  END IF;
  IF NOT v_group.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Grup ini sedang tidak aktif.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.cell_group_members
     WHERE group_id = p_group_id AND user_id = v_uid
  ) INTO v_existing;
  IF v_existing THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  IF v_group.invite_code_required THEN
    IF p_invite_code IS NULL OR btrim(p_invite_code) = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Kode undangan wajib diisi.');
    END IF;
    IF lower(btrim(p_invite_code)) <> lower(v_group.invite_code) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Kode undangan tidak cocok.');
    END IF;
  END IF;

  IF v_group.max_members > 0 THEN
    SELECT count(*) INTO v_count
      FROM public.cell_group_members WHERE group_id = p_group_id;
    IF v_count >= v_group.max_members THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Grup sudah penuh.');
    END IF;
  END IF;

  INSERT INTO public.cell_group_members (group_id, user_id, is_leader)
  VALUES (p_group_id, v_uid, false);

  RETURN jsonb_build_object('ok', true, 'joined', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_cell_group(UUID, TEXT) TO authenticated;

-- Putar ulang kode undangan. Kode lama langsung tidak berlaku, sehingga
-- tautan undangan yang sudah tersebar berhenti bekerja.
CREATE OR REPLACE FUNCTION public.rotate_invite_code(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF (public.is_moderator_or_above() IS NOT TRUE
      AND NOT EXISTS (SELECT 1 FROM public.cell_groups
                       WHERE id = p_group_id AND leader_id = auth.uid())) THEN
    RAISE EXCEPTION 'Tidak berhak memutar ulang kode undangan grup ini.';
  END IF;

  v_code := encode(gen_random_bytes(4), 'hex');

  UPDATE public.cell_groups
     SET invite_code = v_code, updated_at = NOW()
   WHERE id = p_group_id;

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_invite_code(UUID) TO authenticated;

-- Keluarkan anggota. Pemimpin grup boleh mengeluarkan anggota biasa; hanya
-- moderator ke atas yang boleh mengeluarkan pemimpin.
CREATE OR REPLACE FUNCTION public.remove_cell_group_member(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_target_lead BOOLEAN;
  v_is_leader   BOOLEAN;
BEGIN
  SELECT is_leader INTO v_target_lead
    FROM public.cell_group_members
   WHERE group_id = p_group_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Orang ini bukan anggota grup.');
  END IF;

  SELECT (leader_id = v_uid) INTO v_is_leader
    FROM public.cell_groups WHERE id = p_group_id;

  IF (public.is_moderator_or_above() IS NOT TRUE
      AND NOT (v_is_leader IS TRUE AND v_target_lead IS NOT TRUE)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tidak berhak mengeluarkan anggota ini.');
  END IF;

  DELETE FROM public.cell_group_members
   WHERE group_id = p_group_id AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_cell_group_member(UUID, UUID) TO authenticated;

-- ------------------------------------------------------------
-- 2. KONSELING (M7)
-- ------------------------------------------------------------
-- `session_notes` SUDAH ADA sejak phase1-data-security.sql, dengan kolom
-- `note` (bukan `body`). Fase 4 tidak membuat tabel baru — hanya memastikan
-- keunikannya dan memisahkan izin baca.
--
-- Kenapa ini penting: versi pertama berkas ini menulis `CREATE TABLE IF NOT
-- EXISTS` dengan kolom `body`, yang TIDAK berpengaruh karena tabelnya sudah
-- ada. Hasilnya kode aplikasi menulis ke kolom yang tidak ada — dan itu
-- tertangkap tepat sebelum dijalankan.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'session_notes'
       AND column_name = 'note'
  ) THEN
    ALTER TABLE public.session_notes RENAME COLUMN body TO note;
  END IF;
END $$;

-- Satu catatan per (sesi, konselor). Tanpa ini, upsert aplikasi akan gagal
-- dengan "no unique constraint matching ON CONFLICT".
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.session_notes'::regclass
       AND contype IN ('u', 'p')
       AND pg_get_constraintdef(oid) LIKE '%session_id%konselor_id%'
  ) THEN
    ALTER TABLE public.session_notes
      ADD CONSTRAINT session_notes_session_konselor_key UNIQUE (session_id, konselor_id);
  END IF;
END $$;

-- Kebijakan baca yang berlaku sekarang memberi super_admin akses baca ke
-- catatan klinis. Itu bertentangan dengan janji privasi di aplikasi dan tidak
-- diperlukan untuk moderasi: catatan klinis bukan konten publik. Kebijakan
-- diganti supaya HANYA konselor pemiliknya yang bisa membaca.
DROP POLICY IF EXISTS "session_notes_select" ON public.session_notes;
CREATE POLICY "session_notes_select" ON public.session_notes FOR SELECT
  TO authenticated USING (konselor_id = auth.uid());

-- Break-glass: pembacaan isi chat oleh super admin, selalu dengan alasan dan
-- selalu tercatat. Tabelnya mencatat KAPAN dibuka dan oleh siapa — bukan
-- isinya, karena menyimpan salinan isi chat di tabel log akan menggandakan
-- masalah privasi yang hendak dikendalikan.
CREATE TABLE IF NOT EXISTS public.break_glass_reads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  actor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (char_length(btrim(reason)) >= 10),
  message_count INT NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_break_glass_session
  ON public.break_glass_reads (session_id, created_at DESC);

ALTER TABLE public.break_glass_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "break_glass_super_only" ON public.break_glass_reads;
CREATE POLICY "break_glass_super_only" ON public.break_glass_reads
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Fungsi pembuka. Mengembalikan pesan HANYA dalam jendela waktu yang sah, dan
-- mencatat setiap pembukaan. Notifikasi ke super admin lain dikirim di sini
-- juga supaya tidak ada jalur pembacaan yang lolos tanpa jejak.
CREATE OR REPLACE FUNCTION public.break_glass_open_session(
  p_session_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_count   INT;
  v_messages JSONB;
BEGIN
  -- `IS NOT TRUE`, bukan `NOT ...`. Saat tidak ada sesi, `is_super_admin()`
  -- mengembalikan NULL; `NOT NULL` juga NULL, dan `IF NULL` TIDAK masuk ke
  -- cabang ini — penjaganya lolos. Ini terbukti saat uji: RPC berjalan tanpa
  -- sesi lalu gagal di NOT NULL kolom actor_id, bukan di pemeriksaan izin.
  IF public.is_super_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Hanya super admin yang boleh membuka isi sesi.';
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'Alasan wajib diisi, minimal 10 karakter.';
  END IF;

  SELECT count(*) INTO v_count
    FROM public.messages WHERE session_id = p_session_id;

  INSERT INTO public.break_glass_reads (session_id, actor_id, reason, message_count)
  VALUES (p_session_id, v_uid, btrim(p_reason), v_count);

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'id', m.id,
             'sender_id', m.sender_id,
             'content', m.content,
             'created_at', m.created_at
           ) ORDER BY m.created_at
         ), '[]'::jsonb)
    INTO v_messages
    FROM public.messages m
   WHERE m.session_id = p_session_id;

  -- Beri tahu super admin LAIN. Pembacaan diam-diam adalah yang berbahaya;
  -- pembacaan yang diketahui kolega adalah pengawasan.
  PERFORM public.notify_admins(
    'system',
    'Isi sesi konseling dibuka',
    'Seorang super admin membuka isi sesi dengan alasan: ' || left(btrim(p_reason), 140),
    '/admin/konseling'
  );

  RETURN jsonb_build_object('ok', true, 'messages', v_messages);
END;
$$;

GRANT EXECUTE ON FUNCTION public.break_glass_open_session(UUID, TEXT) TO authenticated;

-- Alihkan sesi ke konselor lain. Sesi yang dialihkan tidak boleh tetap
-- menempel pada konselor lama, karena ia akan melihat percakapan yang bukan
-- lagi tanggung jawabnya.
CREATE OR REPLACE FUNCTION public.reassign_session(
  p_session_id UUID,
  p_new_konselor UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old UUID;
BEGIN
  IF public.is_admin_or_above() IS NOT TRUE THEN
    RAISE EXCEPTION 'Hanya admin ke atas yang boleh mengalihkan sesi.';
  END IF;

  SELECT konselor_id INTO v_old FROM public.chat_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sesi tidak ditemukan.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_new_konselor AND role IN ('konselor', 'admin', 'super_admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tujuan harus seorang konselor.');
  END IF;

  UPDATE public.chat_sessions
     SET konselor_id = p_new_konselor, updated_at = NOW()
   WHERE id = p_session_id;

  -- Pemanggil adalah admin ke atas (dijaga di atas), jadi `notify_user`
  -- mengizinkan pengiriman ke konselor mana pun.
  PERFORM public.notify_user(
    p_new_konselor,
    'system',
    'Sesi konseling dialihkan kepadamu',
    COALESCE(left(p_reason, 160), 'Sesi dialihkan oleh admin.'),
    '/chat/' || p_session_id::text
  );

  RETURN jsonb_build_object('ok', true, 'previous', v_old);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_session(UUID, UUID, TEXT) TO authenticated;

-- Konselor perlu memberi tahu ANGGOTA janji temu miliknya. `notify_user`
-- menolak ini (hanya admin atau diri sendiri), dan membuka `notify_user` untuk
-- semua konselor akan membuat mereka bisa mengirim notifikasi ke siapa pun.
-- Fungsi sempit ini hanya bisa menyentuh anggota dari janji temu yang benar-
-- benar milik pemanggil.
CREATE OR REPLACE FUNCTION public.notify_booking_member(
  p_booking_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Janji temu tidak ditemukan.');
  END IF;

  IF v_row.konselor_id <> v_uid AND public.is_admin_or_above() IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ini bukan jadwal Anda.');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (v_row.member_id, 'system', left(p_title, 160), p_body, '/booking');

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_booking_member(UUID, TEXT, TEXT) TO authenticated;

-- Anggota hanya boleh MEMBATALKAN janji temu miliknya. Policy `bookings_update`
-- di rls.sql mengizinkan UPDATE pada barisnya sendiri tanpa membatasi kolom,
-- sehingga anggota bisa mengubah `konselor_id` atau menandai sesinya
-- `completed` tanpa pernah terjadi. Trigger ini menutup jalur itu.
CREATE OR REPLACE FUNCTION public.protect_booking_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Staf dan konselor pemegang jadwal bebas mengubah.
  IF public.is_admin_or_above() OR auth.uid() = OLD.konselor_id THEN
    RETURN NEW;
  END IF;

  -- Selain itu: hanya anggota pemilik baris, dan hanya boleh membatalkan.
  IF auth.uid() <> OLD.member_id THEN
    RAISE EXCEPTION 'Tidak berhak mengubah janji temu ini.';
  END IF;

  IF NEW.status <> 'cancelled'
     OR NEW.konselor_id <> OLD.konselor_id
     OR NEW.member_id <> OLD.member_id
     OR NEW.scheduled_at <> OLD.scheduled_at
     OR NEW.duration_min <> OLD.duration_min THEN
    RAISE EXCEPTION 'Anggota hanya dapat membatalkan janji temu, bukan mengubah isinya.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_protect_columns ON public.bookings;
CREATE TRIGGER bookings_protect_columns BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_booking_columns();

-- AKAR MASALAH: `is_super_admin()` (cms-rbac.sql) mengembalikan NULL saat
-- tidak ada sesi, karena `current_user_role()` juga NULL. `is_admin_or_above()`
-- aman karena punya COALESCE; `is_super_admin()` tidak. Di RLS ini gagal
-- tertutup (NULL = tidak lolos), tetapi di PL/pgSQL `IF NOT NULL` TIDAK masuk
-- — penjaga izin jadi terlewati. Didefinisikan ulang dengan COALESCE.
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
-- 3. SIARAN (M9)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  link         TEXT,
  audience     TEXT NOT NULL DEFAULT 'all'
               CHECK (audience IN ('all', 'role', 'angkatan', 'cell_group')),
  audience_value TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  recipient_count INT NOT NULL DEFAULT 0,
  read_count   INT NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_status
  ON public.broadcasts (status, scheduled_at);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Satu policy FOR ALL, bukan SELECT saja. Policy SELECT tunggal akan membuat
-- INSERT/UPDATE/DELETE ditolak RLS tanpa pesan yang jelas — kegagalan yang
-- mudah disalahartikan sebagai bug aplikasi.
DROP POLICY IF EXISTS "broadcasts_admin_read" ON public.broadcasts;
DROP POLICY IF EXISTS "broadcasts_admin_all" ON public.broadcasts;
CREATE POLICY "broadcasts_admin_all" ON public.broadcasts
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- Templat siaran: teks berulang yang tidak perlu diketik ulang tiap kali.
CREATE TABLE IF NOT EXISTS public.broadcast_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.broadcast_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "broadcast_templates_admin" ON public.broadcast_templates;
CREATE POLICY "broadcast_templates_admin" ON public.broadcast_templates
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- Kirim siaran: menentukan penerima, menulis notifikasi, dan menandai status
-- dalam satu transaksi.
--
-- Pembatasan laju: satu siaran per menit per pengirim. Tanpa ini, satu klik
-- ganda atau satu skrip bisa membanjiri seluruh anggota.
CREATE OR REPLACE FUNCTION public.send_broadcast(p_broadcast_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_b         public.broadcasts%ROWTYPE;
  v_recent    INT;
  v_recipients INT := 0;
BEGIN
  IF public.is_admin_or_above() IS NOT TRUE THEN
    RAISE EXCEPTION 'Hanya admin ke atas yang boleh mengirim siaran.';
  END IF;

  SELECT * INTO v_b FROM public.broadcasts WHERE id = p_broadcast_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Siaran tidak ditemukan.');
  END IF;
  IF v_b.status = 'sent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Siaran ini sudah terkirim.');
  END IF;

  SELECT count(*) INTO v_recent
    FROM public.broadcasts
   WHERE created_by = v_uid
     AND status = 'sent'
     AND sent_at > NOW() - INTERVAL '1 minute';
  IF v_recent > 0 THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'Tunggu satu menit sebelum mengirim siaran berikutnya.');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT p.id, 'system', v_b.title, v_b.body, v_b.link
    FROM public.profiles p
   WHERE p.is_active
     AND (
       v_b.audience = 'all'
       OR (v_b.audience = 'role' AND p.role::text = v_b.audience_value)
       OR (v_b.audience = 'angkatan' AND p.angkatan::text = v_b.audience_value)
       OR (v_b.audience = 'cell_group' AND EXISTS (
             SELECT 1 FROM public.cell_group_members m
              WHERE m.user_id = p.id AND m.group_id::text = v_b.audience_value
           ))
     );

  GET DIAGNOSTICS v_recipients = ROW_COUNT;

  UPDATE public.broadcasts
     SET status = 'sent', sent_at = NOW(), recipient_count = v_recipients,
         updated_at = NOW()
   WHERE id = p_broadcast_id;

  RETURN jsonb_build_object('ok', true, 'recipients', v_recipients);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_broadcast(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 4. KONTEN SITUS (M10)
-- ------------------------------------------------------------
-- Halaman statis yang bisa diedit tanpa deploy: tentang, kontak, FAQ.
CREATE TABLE IF NOT EXISTS public.site_pages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  title      TEXT NOT NULL,
  title_en   TEXT,
  content    TEXT NOT NULL DEFAULT '',
  content_en TEXT,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order INT NOT NULL DEFAULT 0,
  show_in_footer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_pages_public_read" ON public.site_pages;
CREATE POLICY "site_pages_public_read" ON public.site_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_admin_or_above());

DROP POLICY IF EXISTS "site_pages_admin_write" ON public.site_pages;
CREATE POLICY "site_pages_admin_write" ON public.site_pages
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- Banner: pengumuman berbatas waktu yang bisa ditutup pembaca.
CREATE TABLE IF NOT EXISTS public.site_banners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message    TEXT NOT NULL,
  message_en TEXT,
  level      TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'critical')),
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at    TIMESTAMPTZ,
  target_role TEXT,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_banners_public_read" ON public.site_banners;
CREATE POLICY "site_banners_public_read" ON public.site_banners
  FOR SELECT TO anon, authenticated
  USING (is_active AND starts_at <= NOW() AND (ends_at IS NULL OR ends_at > NOW()));

DROP POLICY IF EXISTS "site_banners_admin_write" ON public.site_banners;
CREATE POLICY "site_banners_admin_write" ON public.site_banners
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- Resource kesehatan: dulu daftar ini hardcoded di kode (EXTERNAL_RESOURCES),
-- sehingga menambah satu tautan butuh deploy.
CREATE TABLE IF NOT EXISTS public.resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  title_en    TEXT,
  description TEXT,
  description_en TEXT,
  url         TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'umum',
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resources_public_read" ON public.resources;
CREATE POLICY "resources_public_read" ON public.resources
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin_or_above());

DROP POLICY IF EXISTS "resources_admin_write" ON public.resources;
CREATE POLICY "resources_admin_write" ON public.resources
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- Ayat harian: RLS-nya dulu tidak punya policy UPDATE/DELETE sama sekali,
-- sehingga admin tidak bisa mengoreksi ayat yang salah ketik.
ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_verses_public_read" ON public.daily_verses;
CREATE POLICY "daily_verses_public_read" ON public.daily_verses
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "daily_verses_admin_write" ON public.daily_verses;
CREATE POLICY "daily_verses_admin_write" ON public.daily_verses
  FOR ALL TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- Ayat cadangan: bila tanggal tertentu kosong, pakai ayat terakhir yang
-- tersedia. Tanpa ini, hari tanpa ayat menampilkan bagian kosong di beranda.
CREATE OR REPLACE FUNCTION public.get_daily_verse(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.daily_verses%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.daily_verses
   WHERE display_date = p_date LIMIT 1;

  IF NOT FOUND THEN
    -- Cadangan: ayat terdekat yang tanggalnya sudah lewat.
    SELECT * INTO v_row FROM public.daily_verses
     WHERE display_date IS NOT NULL AND display_date <= p_date
     ORDER BY display_date DESC LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'verse_text', v_row.verse_text,
    'verse_ref', v_row.verse_ref,
    'verse_text_en', v_row.verse_text_en,
    'verse_ref_en', v_row.verse_ref_en,
    'display_date', v_row.display_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_verse(DATE) TO anon, authenticated;

-- ------------------------------------------------------------
-- 5. MEDIA (M12)
-- ------------------------------------------------------------
-- Kolom untuk menghitung pemakaian storage per pengguna, dan menandai berkas
-- yatim (ada di storage tanpa baris, atau sebaliknya).
ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS is_orphan BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_attachments_owner_created
  ON public.attachments (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attachments_orphan
  ON public.attachments (is_orphan) WHERE is_orphan;

-- Pemakaian storage per pengguna, dipakai untuk menegakkan kuota.
CREATE OR REPLACE FUNCTION public.storage_usage_by_user()
RETURNS TABLE (user_id UUID, file_count BIGINT, total_bytes BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT owner_id, count(*), COALESCE(sum(size_bytes), 0)
    FROM public.attachments
   WHERE is_orphan = false
   GROUP BY owner_id;
$$;

GRANT EXECUTE ON FUNCTION public.storage_usage_by_user() TO authenticated;

-- ------------------------------------------------------------
-- 6. PRIVASI (M13)
-- ------------------------------------------------------------
-- Permintaan ekspor/hapus data. Janji di Kebijakan Privasi harus punya
-- jalurnya; tanpa tabel ini, janji itu tidak bisa ditepati.
CREATE TABLE IF NOT EXISTS public.data_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('export', 'delete')),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  note         TEXT,
  handled_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_requests_status
  ON public.data_requests (status, created_at);

ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

-- Pengguna melihat permintaannya sendiri; admin melihat semuanya.
DROP POLICY IF EXISTS "data_requests_own_or_admin" ON public.data_requests;
CREATE POLICY "data_requests_own_or_admin" ON public.data_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above());

DROP POLICY IF EXISTS "data_requests_insert_own" ON public.data_requests;
CREATE POLICY "data_requests_insert_own" ON public.data_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Log pembukaan identitas sudah ada sejak skema awal sebagai
-- identity_reveal_log, lengkap dengan kolom reason NOT NULL. Tidak ada
-- perubahan skema yang diperlukan di sini; halaman M13 hanya perlu membacanya
-- (lihat RLS di bawah).
ALTER TABLE public.identity_reveal_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "identity_reveal_log_super_only" ON public.identity_reveal_log;
CREATE POLICY "identity_reveal_log_super_only" ON public.identity_reveal_log
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- ------------------------------------------------------------
-- 7. SISTEM (M14)
-- ------------------------------------------------------------
-- Catatan migrasi SUDAH ADA sejak cms-superadmin.sql (kolom `version`,
-- `description`, `applied_at`, `applied_by`). Fase 4 hanya MENULIS ke tabel
-- itu — tidak membuat ulang. Membuat tabel dengan nama kolom berbeda adalah
-- kesalahan nyata yang pernah menggagalkan seluruh migrasi ini.
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     TEXT PRIMARY KEY,
  description TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Catat berkas yang sudah dijalankan sejauh ini. `ON CONFLICT` membuat blok ini
-- aman diulang tanpa menimpa waktu penerapan yang asli.
INSERT INTO public.schema_migrations (version, description) VALUES
  ('2026-10-01-schema',            'Skema awal: tabel, enum, trigger dasar'),
  ('2026-10-01-rls',               'Kebijakan RLS awal'),
  ('2026-10-10-cms-rbac',          'Fase 2 persiapan: peran & kapabilitas CMS'),
  ('2026-10-10-hotfix-security',   'Fase 0: hotfix keamanan kritis'),
  ('2026-10-12-phase1-data-security', 'Fase 1: fondasi keamanan data'),
  ('2026-10-15-phase3-content-modules', 'Fase 3: modul konten (kategori, revisi, laporan, kata terlarang)')
ON CONFLICT (version) DO NOTHING;

INSERT INTO public.schema_migrations (version, description) VALUES
  ('2026-10-17-phase4-advanced-modules', 'Fase 4: KK/KTB, konseling, siaran, konten situs, media, privasi, sistem')
ON CONFLICT (version) DO NOTHING;

-- Status sistem untuk halaman M14: jumlah baris tiap tabel penting, pemakaian
-- storage, dan job yang tertunda. Dijalankan sebagai SECURITY DEFINER supaya
-- bisa membaca tabel yang tidak boleh dibaca langsung oleh admin.
CREATE OR REPLACE FUNCTION public.system_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF public.is_admin_or_above() IS NOT TRUE THEN
    RAISE EXCEPTION 'Hanya admin ke atas yang boleh melihat status sistem.';
  END IF;

  SELECT jsonb_build_object(
    'profiles',        (SELECT count(*) FROM public.profiles),
    'threads',         (SELECT count(*) FROM public.threads WHERE deleted_at IS NULL),
    'comments',        (SELECT count(*) FROM public.comments WHERE deleted_at IS NULL),
    'prayers',         (SELECT count(*) FROM public.prayer_requests WHERE deleted_at IS NULL),
    'articles',        (SELECT count(*) FROM public.articles WHERE deleted_at IS NULL),
    'sessions',        (SELECT count(*) FROM public.chat_sessions),
    'bookings',        (SELECT count(*) FROM public.bookings),
    'cell_groups',     (SELECT count(*) FROM public.cell_groups WHERE NOT is_archived),
    'reports_pending', (SELECT count(*) FROM public.content_reports WHERE status = 'pending'),
    'trash_total',     (SELECT
                          (SELECT count(*) FROM public.threads WHERE deleted_at IS NOT NULL) +
                          (SELECT count(*) FROM public.comments WHERE deleted_at IS NOT NULL) +
                          (SELECT count(*) FROM public.prayer_requests WHERE deleted_at IS NOT NULL) +
                          (SELECT count(*) FROM public.articles WHERE deleted_at IS NOT NULL)),
    'storage_bytes',   (SELECT COALESCE(sum(size_bytes), 0) FROM public.attachments WHERE NOT is_orphan),
    'storage_files',   (SELECT count(*) FROM public.attachments WHERE NOT is_orphan),
    'migrations',      (SELECT count(*) FROM public.schema_migrations),
    'broadcasts_sent', (SELECT count(*) FROM public.broadcasts WHERE status = 'sent'),
    'data_requests_pending', (SELECT count(*) FROM public.data_requests WHERE status = 'pending')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_status() TO authenticated;

-- ------------------------------------------------------------
-- 8. VERIFIKASI
-- ------------------------------------------------------------
-- Jalankan bagian ini secara terpisah untuk memastikan semuanya masuk.
-- SELECT public.system_status();

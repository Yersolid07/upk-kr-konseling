-- ============================================================
-- supabase/phase3-content-modules.sql
-- FASE 3 — Modul konten: kategori, revisi artikel, laporan, tempat
-- sampah, dan aksi penulis.
--
-- Idempotent: aman dijalankan berulang. Bergantung pada
-- cms-superadmin.sql (kolom moderation_status/deleted_at, log_audit_v2).
--
-- Isi:
--   1. thread_categories — arsip, urutan, proteksi hapus
--   2. article_revisions — riwayat revisi + tombol kembalikan
--   3. content_reports  — antrean terpadu, ambang auto-hide, alasan baku
--   4. banned_words     — daftar kata terlarang
--   5. RPC              — kategori aman, purge terjadwal, statistik laporan
--   6. Trigger          — larangan hapus kategori yang masih dipakai
--   7. Job pembersih    — fungsi untuk membersihkan tempat sampah kedaluwarsa
-- ============================================================

-- ------------------------------------------------------------
-- 1. KATEGORI
-- ------------------------------------------------------------
-- `is_archived` menyembunyikan kategori dari pemilih tanpa menghapusnya:
-- konten lama tetap punya kategori, tetapi tidak ada konten baru yang bisa
-- masuk ke sana. Ini menyelesaikan masalah nyata "hapus kategori = konten
-- kehilangan kategori diam-diam" (ON DELETE SET NULL).
ALTER TABLE public.thread_categories
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.thread_categories.is_archived IS
  'Kategori diarsipkan: tidak muncul di pemilih, konten lama tetap utuh.';

CREATE INDEX IF NOT EXISTS idx_thread_categories_sort
  ON public.thread_categories (sort_order) WHERE is_archived = false;

-- ------------------------------------------------------------
-- 2. REVISI ARTIKEL
-- ------------------------------------------------------------
-- Setiap perubahan judul/isi menyimpan salinan SEBELUM perubahan. Tanpa ini
-- "kembalikan ke versi sebelumnya" tidak mungkin dilakukan, dan moderator
-- tidak bisa membandingkan apa yang diubah penulis.
CREATE TABLE IF NOT EXISTS public.article_revisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  excerpt     TEXT,
  status      public.publication_status,
  edited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  edit_reason TEXT,
  version     INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_revisions_article
  ON public.article_revisions (article_id, version DESC);

COMMENT ON TABLE public.article_revisions IS
  'Riwayat revisi artikel. Menyimpan salinan SEBELUM perubahan, bukan sesudah.';

ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;

-- Riwayat hanya untuk staf. Penulis melihat riwayat artikelnya sendiri.
DROP POLICY IF EXISTS "article_revisions_select" ON public.article_revisions;
CREATE POLICY "article_revisions_select" ON public.article_revisions
  FOR SELECT USING (
    public.is_moderator_or_above()
    OR EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = article_revisions.article_id AND a.author_id = auth.uid()
    )
  );

-- Tidak ada policy INSERT/UPDATE/DELETE: baris revisi hanya ditulis oleh
-- trigger SECURITY DEFINER di bawah, jadi tidak bisa dipalsukan dari API.
REVOKE INSERT, UPDATE, DELETE ON public.article_revisions FROM PUBLIC, anon, authenticated;

/**
 * Simpan revisi sebelum artikel diubah.
 * Dipasang BEFORE UPDATE supaya salinan yang tersimpan adalah kondisi LAMA.
 */
CREATE OR REPLACE FUNCTION public.snapshot_article_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INT;
BEGIN
  -- Hanya kalau isi yang bermakna berubah.
  IF NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.content IS NOT DISTINCT FROM OLD.content
     AND NEW.excerpt IS NOT DISTINCT FROM OLD.excerpt
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
  FROM public.article_revisions WHERE article_id = OLD.id;

  INSERT INTO public.article_revisions
    (article_id, title, content, excerpt, status, edited_by, version)
  VALUES
    (OLD.id, OLD.title, OLD.content, OLD.excerpt, OLD.status, auth.uid(), v_next);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_article_revision ON public.articles;
CREATE TRIGGER trg_snapshot_article_revision
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_article_revision();

-- ------------------------------------------------------------
-- 3. LAPORAN KONTEN
-- ------------------------------------------------------------
-- `content_type` di skema lama hanya punya (thread, comment, message, prayer).
-- Artikel dan pesan grup juga perlu bisa dilaporkan.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'content_type' AND e.enumlabel = 'article'
  ) THEN
    ALTER TYPE public.content_type ADD VALUE 'article';
  END IF;
END $$;

ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS action_taken TEXT,
  ADD COLUMN IF NOT EXISTS notified_reporter_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS auto_hidden BOOLEAN NOT NULL DEFAULT false;

-- Satu pelapor hanya boleh melaporkan satu konten sekali; laporan berulang
-- dari orang yang sama bukan sinyal tambahan, hanya noise di antrean.
--
-- Unique index bisa GAGAL dibuat bila tabel sudah berisi laporan ganda dari
-- data lama. Karena itu duplikat dibereskan lebih dulu: yang DIPERTAHANKAN
-- adalah laporan paling awal (jejak pertama), sisanya dihapus. Menghapus
-- laporan ganda aman — kontennya tetap punya minimal satu laporan, dan
-- keputusan moderator tidak bergantung pada jumlah baris.
DELETE FROM public.content_reports a
  USING public.content_reports b
 WHERE a.reporter_id = b.reporter_id
   AND a.content_type = b.content_type
   AND a.content_id = b.content_id
   AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique
  ON public.content_reports (reporter_id, content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_pending
  ON public.content_reports (status, created_at DESC) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_content_reports_target
  ON public.content_reports (content_type, content_id);

COMMENT ON COLUMN public.content_reports.severity IS
  'normal atau high. high dipakai untuk kata kunci krisis — muncul di atas antrean.';

-- ------------------------------------------------------------
-- 4. KATA TERLARANG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banned_words (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL DEFAULT 'spam',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.banned_words.category IS
  'spam, kasar, atau krisis. krisis memicu prioritas tinggi, bukan penyembunyian.';

ALTER TABLE public.banned_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banned_words_staff" ON public.banned_words;
CREATE POLICY "banned_words_staff" ON public.banned_words
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

-- ------------------------------------------------------------
-- 5. RPC
-- ------------------------------------------------------------

/**
 * Kategori yang boleh dipilih: belum diarsipkan, beserta jumlah konten aktif.
 * Dipakai forum, prayer, dan artikel sekaligus.
 */
CREATE OR REPLACE FUNCTION public.list_active_categories()
RETURNS TABLE (
  id UUID, name TEXT, name_en TEXT, slug TEXT, icon TEXT,
  color TEXT, sort_order INT, thread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.name, c.name_en, c.slug, c.icon, c.color, c.sort_order,
    (SELECT COUNT(*) FROM public.threads t
      WHERE t.category_id = c.id AND t.deleted_at IS NULL) AS thread_count
  FROM public.thread_categories c
  WHERE c.is_archived = false
  ORDER BY c.sort_order, c.name;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_categories() TO anon, authenticated;

/**
 * Bersihkan tempat sampah yang melewati masa retensi.
 *
 * Dijalankan manual dari konsol (tombol) atau oleh cron. Mengembalikan
 * jumlah baris yang dihapus per tabel supaya hasilnya bisa ditampilkan.
 *
 * PENTING: hanya menyentuh baris yang SUDAH di tempat sampah. Konten hidup
 * tidak pernah tersentuh, sekalipun pengaturannya salah.
 */
CREATE OR REPLACE FUNCTION public.purge_expired_trash(p_days INT DEFAULT NULL)
RETURNS TABLE (table_name TEXT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INT;
  v_cutoff TIMESTAMPTZ;
  v_n BIGINT;
  v_tables TEXT[] := ARRAY[
    'comments', 'threads', 'prayer_requests', 'articles',
    'cell_group_messages', 'cell_groups'
  ];
  v_t TEXT;
BEGIN
  -- Hanya super admin (atau pemanggil internal tanpa auth.uid()).
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'forbidden: hanya super admin' USING ERRCODE = '42501';
  END IF;

  v_days := COALESCE(
    p_days,
    (SELECT COALESCE((value->>'value')::INT, 30)
       FROM public.site_settings WHERE key = 'trash_retention_days'),
    30
  );
  -- Batas bawah 1 hari: mencegah satu salah isi pengaturan menghapus
  -- segalanya seketika.
  v_days := GREATEST(v_days, 1);
  v_cutoff := NOW() - (v_days || ' days')::INTERVAL;

  FOREACH v_t IN ARRAY v_tables LOOP
    EXECUTE format(
      'DELETE FROM public.%I WHERE deleted_at IS NOT NULL AND deleted_at < $1',
      v_t
    ) USING v_cutoff;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      table_name := v_t; deleted_count := v_n; RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_trash(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_expired_trash(INT) TO authenticated;

/**
 * Sembunyikan konten SEMENTARA setelah laporan menembus ambang.
 *
 * Dipanggil dari jalur anggota (tombol Laporkan), jadi tidak boleh memakai
 * klien anggota langsung — RLS tidak mengizinkan anggota meng-UPDATE tabel
 * konten, dan memang tidak seharusnya. Fungsi ini SECURITY DEFINER, tetapi
 * hanya mengubah satu kolom moderasi dan menolak bila kontennya milik
 * pemanggil sendiri.
 *
 * Aman dipanggil berkali-kali: konten yang sudah tersembunyi tidak diubah.
 */
CREATE OR REPLACE FUNCTION public.auto_hide_reported_content(
  p_content_type TEXT,
  p_content_id   UUID,
  p_threshold    INT DEFAULT 3
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table  TEXT;
  v_status TEXT;
  v_count  BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'harus masuk' USING ERRCODE = '42501';
  END IF;

  v_table := CASE p_content_type
    WHEN 'thread'  THEN 'threads'
    WHEN 'comment' THEN 'comments'
    WHEN 'prayer'  THEN 'prayer_requests'
    WHEN 'article' THEN 'articles'
    WHEN 'message' THEN 'cell_group_messages'
    ELSE NULL
  END;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'jenis konten tidak dikenal: %', p_content_type USING ERRCODE = '22023';
  END IF;

  -- Hitung laporan menunggu; sekaligus pastikan kontennya ada.
  -- moderation_status adalah enum, jadi di-cast eksplisit ke TEXT — tanpa cast,
  -- PL/pgSQL harus menebak konversi dan bisa gagal saat runtime.
  EXECUTE format('SELECT moderation_status::text FROM public.%I WHERE id = $1', v_table)
    INTO v_status USING p_content_id;
  IF v_status IS NULL THEN
    RETURN FALSE;                       -- konten tidak ada
  END IF;
  IF v_status = 'hidden' THEN
    RETURN FALSE;                       -- sudah tersembunyi
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.content_reports
  WHERE content_type = p_content_type::public.content_type
    AND content_id = p_content_id
    AND status = 'pending';

  IF v_count < GREATEST(p_threshold, 1) THEN
    RETURN FALSE;
  END IF;

  EXECUTE format(
    'UPDATE public.%I
        SET moderation_status = ''hidden'',
            hidden_reason = $2,
            hidden_at = NOW()
      WHERE id = $1',
    v_table
  ) USING p_content_id, format('Disembunyikan otomatis: %s laporan menunggu tinjauan.', v_count);

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_hide_reported_content(TEXT, UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_hide_reported_content(TEXT, UUID, INT) TO authenticated;

/**
 * Statistik antrean laporan — satu query untuk dasbor.
 */
CREATE OR REPLACE FUNCTION public.report_queue_stats()
RETURNS TABLE (pending BIGINT, reviewed BIGINT, high_severity BIGINT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'reviewed'),
    COUNT(*) FILTER (WHERE status = 'pending' AND severity = 'high'),
    COUNT(*)
  FROM public.content_reports;
$$;

REVOKE ALL ON FUNCTION public.report_queue_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_queue_stats() TO authenticated;

-- ------------------------------------------------------------
-- 5b. RLS LAPORAN: MODERATOR HARUS BISA MENUTUP LAPORAN
-- ------------------------------------------------------------
-- Policy dari supabase/rls.sql membatasi UPDATE ke is_admin_or_above(),
-- padahal menangani laporan adalah tugas moderator (capability manageReports
-- mencakup moderator). Tanpa perbaikan ini, moderator membuka antrean lalu
-- setiap keputusan gagal dengan "new row violates row-level security policy".
--
-- SELECT juga dilonggarkan: moderator perlu melihat laporan yang bukan
-- miliknya sendiri, dan sebelumnya hanya konselor ke atas yang bisa.
DROP POLICY IF EXISTS "reports_select" ON public.content_reports;
CREATE POLICY "reports_select" ON public.content_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR public.is_moderator_or_above());

DROP POLICY IF EXISTS "reports_update" ON public.content_reports;
CREATE POLICY "reports_update" ON public.content_reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

-- ------------------------------------------------------------
-- 6. LINDUNGI KATEGORI YANG MASIH DIPAKAI
-- ------------------------------------------------------------
-- Skema lama memakai ON DELETE SET NULL: menghapus kategori membuat semua
-- thread kehilangan kategorinya tanpa peringatan. Trigger ini menolak
-- penghapusan selama masih ada konten, supaya admin memindahkan dulu.
CREATE OR REPLACE FUNCTION public.prevent_category_delete_in_use()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threads INT;
  v_prayers INT;
  v_articles INT;
BEGIN
  SELECT COUNT(*) INTO v_threads FROM public.threads WHERE category_id = OLD.id;
  SELECT COUNT(*) INTO v_prayers FROM public.prayer_requests WHERE category_id = OLD.id;
  SELECT COUNT(*) INTO v_articles FROM public.articles WHERE category_id = OLD.id;

  IF (v_threads + v_prayers + v_articles) > 0 THEN
    RAISE EXCEPTION
      'Kategori "%" masih dipakai (% diskusi, % doa, % artikel). Pindahkan kontennya atau arsipkan kategorinya.',
      OLD.name, v_threads, v_prayers, v_articles
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_category_delete ON public.thread_categories;
CREATE TRIGGER trg_prevent_category_delete
  BEFORE DELETE ON public.thread_categories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_category_delete_in_use();

-- ------------------------------------------------------------
-- 7. KOLOM TAMBAHAN ARTIKEL (M5)
-- ------------------------------------------------------------
-- `is_featured` menggantikan aturan lama "artikel pertama otomatis jadi
-- utama". Tanpa kolom ini, admin tidak bisa memilih artikel mana yang tampil
-- besar di halaman Renungan — urutan tabel yang menentukan, dan itu bukan
-- keputusan editorial.
--
-- `scheduled_at` menyimpan waktu terbit yang direncanakan. `published_at`
-- tetap diisi saat benar-benar terbit; keduanya dipisah supaya penjadwalan
-- tidak mengubah kenyataan "kapan artikel ini benar-benar bisa dibaca".
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_articles_featured
  ON public.articles (is_featured, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

COMMENT ON COLUMN public.articles.is_featured IS
  'Artikel unggulan yang tampil paling menonjol di halaman Renungan.';
COMMENT ON COLUMN public.articles.scheduled_at IS
  'Rencana waktu terbit. published_at diisi saat status benar-benar menjadi published.';

-- ------------------------------------------------------------
-- 8. EDIT OLEH MODERATOR DITANDAI
-- ------------------------------------------------------------
-- Ketika staf mengubah konten orang lain, tampilan publik harus jujur soal
-- itu. Tanpa penanda, pembaca mengira kata-kata moderator adalah kata-kata
-- penulis asli.
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.threads.edited_by IS
  'Diisi bila STAF mengubah konten. NULL berarti murni tulisan penulis.';

-- ------------------------------------------------------------
-- 9. TANDA "DIEDIT MODERATOR" DI VIEW PUBLIK
-- ------------------------------------------------------------
-- Ketika staf menyunting kata-kata anggota, pembaca berhak tahu. Tanpa
-- penanda, kata-kata moderator terbaca sebagai kata-kata penulis asli.
--
-- View dibuat ulang dengan kolom TAMBAHAN di akhir. CREATE OR REPLACE VIEW
-- mengizinkan penambahan kolom di belakang, asalkan kolom lama tidak diubah
-- urutannya — jadi tidak ada view yang harus di-drop (yang akan memutus
-- grant dan bergantung pada urutan migrasi).
--
-- PENTING: filter `deleted_at IS NULL AND moderation_status = 'visible'` WAJIB
-- ikut disalin. Tanpa filter itu, CREATE OR REPLACE VIEW akan MENGHAPUS aturan
-- moderasi dari cms-superadmin.sql dan seluruh konten tersembunyi/di tempat
-- sampah muncul kembali di halaman publik.
CREATE OR REPLACE VIEW public.threads_public
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.category_id,
  t.title,
  t.content,
  t.is_anonymous,
  t.is_pinned,
  t.is_locked,
  t.is_flagged,
  t.view_count,
  t.comment_count,
  t.created_at,
  t.updated_at,
  CASE WHEN t.is_anonymous THEN NULL ELSE t.author_id END AS author_id,
  CASE WHEN t.is_anonymous THEN public.public_anon_label('thread', t.id) END AS anon_label,
  CASE WHEN t.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN t.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar,
  CASE WHEN t.is_anonymous THEN NULL ELSE p.role END AS author_role,
  (t.edited_by IS NOT NULL) AS edited_by_staff
FROM public.threads t
LEFT JOIN public.profiles p ON p.id = t.author_id
WHERE t.deleted_at IS NULL AND t.moderation_status = 'visible';

CREATE OR REPLACE VIEW public.comments_public
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.thread_id,
  c.parent_id,
  c.content,
  c.is_anonymous,
  c.is_flagged,
  c.created_at,
  CASE WHEN c.is_anonymous THEN NULL ELSE c.author_id END AS author_id,
  CASE WHEN c.is_anonymous THEN public.public_anon_label('comment', c.id) END AS anon_label,
  CASE WHEN c.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN c.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar,
  CASE WHEN c.is_anonymous THEN NULL ELSE p.role END AS author_role,
  (c.edited_by IS NOT NULL) AS edited_by_staff
FROM public.comments c
LEFT JOIN public.profiles p ON p.id = c.author_id
WHERE c.deleted_at IS NULL AND c.moderation_status = 'visible';

COMMENT ON COLUMN public.threads_public.edited_by_staff IS
  'TRUE bila staf pernah mengubah judul/isi. Ditampilkan sebagai "diedit moderator".';

-- ------------------------------------------------------------
-- 10. VERIFIKASI
-- ------------------------------------------------------------
DO $$
DECLARE v_missing TEXT := '';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='thread_categories' AND column_name='is_archived')
  THEN v_missing := v_missing || ' thread_categories.is_archived'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='article_revisions')
  THEN v_missing := v_missing || ' article_revisions'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='banned_words')
  THEN v_missing := v_missing || ' banned_words'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='purge_expired_trash')
  THEN v_missing := v_missing || ' purge_expired_trash()'; END IF;

  IF v_missing <> '' THEN
    RAISE EXCEPTION 'Migrasi Fase 3 tidak lengkap, kurang:%', v_missing;
  END IF;

  RAISE NOTICE 'Fase 3 siap: kategori, revisi artikel, laporan, kata terlarang, job pembersih.';
END $$;

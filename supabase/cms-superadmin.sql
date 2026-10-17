-- =====================================================
-- FASE 2 — FONDASI CMS SUPER ADMIN
-- IKA UPK-Kr FT UNSRAT
--
-- Jalankan SELURUH berkas ini di Supabase Dashboard -> SQL Editor,
-- SETELAH supabase/hotfix-security.sql dan supabase/phase1-data-security.sql.
-- Aman dijalankan berulang kali (idempotent).
--
-- Isi:
--   1. schema_migrations — catatan migrasi yang sudah dijalankan
--   2. Soft delete + status moderasi untuk semua tabel konten
--   3. Audit v2: aksi baru, kolom before/after/reason/ip/user_agent
--   4. audit_log append-only
--   5. Registry pengaturan: penegakan registration_open di database
--   6. Perbaikan nilai toggle lama yang tersimpan sebagai ''
-- =====================================================


-- =====================================================
-- 1. SCHEMA_MIGRATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     TEXT PRIMARY KEY,
  description TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Hanya admin ke atas yang boleh melihat riwayat migrasi.
DROP POLICY IF EXISTS "migrations_select" ON public.schema_migrations;
CREATE POLICY "migrations_select" ON public.schema_migrations FOR SELECT
  TO authenticated USING (public.is_admin_or_above());


-- =====================================================
-- 2. SOFT DELETE + STATUS MODERASI
--
-- Sebelumnya "hapus" berarti DELETE permanen. Untuk konsol CMS, penghapusan
-- harus bisa dibatalkan: konten disembunyikan (deleted_at) dan masih bisa
-- dipulihkan. Purge permanen hanya lewat aksi terpisah yang tercatat.
--
-- moderation_status memisahkan "sembunyi karena moderasi" dari "dihapus":
--   visible  -> tampil normal
--   hidden   -> disembunyikan moderator (bisa dipulihkan)
--   pending  -> menunggu tinjauan
--   rejected -> ditolak moderator
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.moderation_status AS ENUM ('visible','hidden','pending','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Terapkan ke seluruh tabel konten yang dikelola CMS.
DO $$
DECLARE
  t TEXT;
  tabel TEXT[] := ARRAY[
    'threads', 'comments', 'prayer_requests', 'articles',
    'cell_groups', 'cell_group_messages'
  ];
BEGIN
  FOREACH t IN ARRAY tabel LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status NOT NULL DEFAULT ''visible'',
      ADD COLUMN IF NOT EXISTS hidden_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS hidden_reason TEXT,
      ADD COLUMN IF NOT EXISTS hidden_at     TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS deleted_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS delete_reason TEXT', t);
  END LOOP;
END $$;

-- Indeks parsial: query halaman publik hanya menyentuh baris hidup.
CREATE INDEX IF NOT EXISTS idx_threads_live  ON public.threads (created_at DESC)
  WHERE deleted_at IS NULL AND moderation_status = 'visible';
CREATE INDEX IF NOT EXISTS idx_comments_live ON public.comments (thread_id, created_at)
  WHERE deleted_at IS NULL AND moderation_status = 'visible';
CREATE INDEX IF NOT EXISTS idx_prayers_live  ON public.prayer_requests (created_at DESC)
  WHERE deleted_at IS NULL AND moderation_status = 'visible';
CREATE INDEX IF NOT EXISTS idx_articles_live ON public.articles (created_at DESC)
  WHERE deleted_at IS NULL;

-- Sampah: daftar isi tempat sampah untuk konsol CMS.
CREATE INDEX IF NOT EXISTS idx_threads_trash  ON public.threads (deleted_at DESC)          WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_trash ON public.comments (deleted_at DESC)         WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prayers_trash  ON public.prayer_requests (deleted_at DESC)  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_trash ON public.articles (deleted_at DESC)         WHERE deleted_at IS NOT NULL;

-- View publik WAJIB menyembunyikan konten yang dihapus/dimoderasi. View
-- Fase 1 belum tahu kolom baru ini, jadi keduanya ditulis ulang di sini.
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
  CASE WHEN t.is_anonymous THEN NULL ELSE p.role END AS author_role
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
  CASE WHEN c.is_anonymous THEN NULL ELSE p.role END AS author_role
FROM public.comments c
LEFT JOIN public.profiles p ON p.id = c.author_id
WHERE c.deleted_at IS NULL AND c.moderation_status = 'visible';

CREATE OR REPLACE VIEW public.prayers_public
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.content,
  r.category_id,
  r.is_anonymous,
  r.is_answered,
  r.pray_count,
  r.created_at,
  r.updated_at,
  CASE WHEN r.is_anonymous THEN NULL ELSE r.author_id END AS author_id,
  CASE WHEN r.is_anonymous THEN public.public_anon_label('prayer', r.id) END AS anon_label,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar
FROM public.prayer_requests r
LEFT JOIN public.profiles p ON p.id = r.author_id
WHERE r.deleted_at IS NULL AND r.moderation_status = 'visible';

GRANT SELECT ON public.threads_public  TO authenticated;
GRANT SELECT ON public.comments_public TO authenticated;
GRANT SELECT ON public.prayers_public  TO authenticated;


-- =====================================================
-- 3. AUDIT V2 — BEFORE/AFTER, ALASAN, IP, USER AGENT
--
-- Audit lama hanya menyimpan `detail`. Untuk CMS yang bisa mengubah dan
-- memulihkan apa pun, jejaknya harus memuat kondisi SEBELUM dan SESUDAH,
-- alasan tindakan, serta asal permintaan.
-- =====================================================

-- Aksi baru. ALTER TYPE ... ADD VALUE IF NOT EXISTS idempotent di PG 12+.
-- Catatan: nilai enum baru tidak boleh DIPAKAI di transaksi yang sama, dan
-- skrip ini tidak memakainya — hanya mendaftarkannya.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'restore';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'hide';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'unhide';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'purge';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'ban';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'unban';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'reveal_identity';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'break_glass_read';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'broadcast';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'bulk';

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS before     JSONB,
  ADD COLUMN IF NOT EXISTS after      JSONB,
  ADD COLUMN IF NOT EXISTS reason     TEXT,
  ADD COLUMN IF NOT EXISTS ip         TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Kolom detail lama dipertahankan: log_audit() masih memakainya.
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON public.audit_log(entity, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON public.audit_log(action, created_at DESC);

-- ─── Kolom apa yang boleh disimpan di snapshot audit ───
--
-- Snapshot before/after tidak boleh memuat isi pesan privat konseling atau
-- data rahasia lain: audit terbaca admin, sedangkan isi chat tidak.
-- Fungsi ini membuang kolom sensitif dari snapshot sebelum disimpan.
CREATE OR REPLACE FUNCTION public.audit_sanitize(p_row JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_row IS NULL THEN NULL
    ELSE p_row
      - 'content'      - 'body'         - 'note'         - 'konselor_notes'
      - 'message'      - 'review_notes' - 'anon_token'   - 'invite_code'
      - 'email'        - 'phone'        - 'number'
  END;
$$;

-- log_audit_v2 dipanggil dari server action CMS lewat klien PENGGUNA
-- (bukan service_role), supaya auth.uid() terisi dan RPC ini bisa menolak
-- pemanggil yang bukan admin. Karena itu SECURITY DEFINER + pemeriksaan
-- peran di dalamnya, dan GRANT ke authenticated.
CREATE OR REPLACE FUNCTION public.log_audit_v2(
  p_action    public.audit_action,
  p_entity    TEXT,
  p_entity_id TEXT,
  p_before    JSONB DEFAULT NULL,
  p_after     JSONB DEFAULT NULL,
  p_reason    TEXT  DEFAULT NULL,
  p_ip        TEXT  DEFAULT NULL,
  p_ua        TEXT  DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
  v_role public.user_role;
BEGIN
  v_role := public.current_user_role();

  -- Tanpa auth.uid() (service_role / migrasi) tetap boleh menulis: itu jalur
  -- internal. Selain itu wajib admin ke atas.
  IF auth.uid() IS NOT NULL AND public.role_rank(v_role) < 4 THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_log
    (actor_id, actor_role, action, entity, entity_id, before, after, reason, ip, user_agent)
  VALUES
    (auth.uid(), v_role, p_action, p_entity, p_entity_id,
     public.audit_sanitize(p_before), public.audit_sanitize(p_after),
     p_reason, p_ip, p_ua)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_v2(public.audit_action, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_v2(public.audit_action, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT, TEXT)
  TO authenticated;

-- ─── audit_log APPEND-ONLY ───
-- Satu-satunya UPDATE yang diizinkan: actor_id menjadi NULL ketika profil
-- aktornya dihapus (FK ON DELETE SET NULL). Selain itu ditolak.
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.actor_id IS NOT NULL
     AND NEW.actor_id IS NULL
     AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_log bersifat append-only: baris tidak boleh diubah atau dihapus.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_immutable ON public.audit_log;
CREATE TRIGGER trg_audit_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();


-- =====================================================
-- 4. PENEGAKAN registration_open DI DATABASE
--
-- Memeriksa di register() saja tidak cukup: anon key itu publik, jadi siapa
-- pun bisa memanggil Supabase Auth langsung (celah yang sama dengan K1).
-- Trigger BEFORE INSERT pada auth.users membuat penutupan pendaftaran
-- berlaku untuk SEMUA jalur.
-- =====================================================

-- Perbaiki nilai toggle lama yang tersimpan sebagai string kosong (''), yang
-- membuat Boolean('') === false sehingga "Pendaftaran dibuka" tampak tertutup.
UPDATE public.site_settings
   SET value = jsonb_build_object('value', FALSE)
 WHERE key = 'registration_open'
   AND COALESCE(value->>'value', '') = '';

UPDATE public.site_settings
   SET value = jsonb_build_object('value', TRUE)
 WHERE key = 'registration_open'
   AND value->>'value' IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_registration_open()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_open BOOLEAN;
BEGIN
  SELECT COALESCE(
           (NULLIF(value->>'value', ''))::boolean,
           TRUE   -- pengaturan belum ada / tidak terbaca: jangan kunci pendaftaran
         )
    INTO v_open
    FROM public.site_settings
   WHERE key = 'registration_open';

  IF v_open IS FALSE THEN
    RAISE EXCEPTION 'Pendaftaran sedang ditutup oleh pengelola.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_user_created ON auth.users;
CREATE TRIGGER before_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_registration_open();


-- =====================================================
-- 5. PENGGUNA — kolom pendukung M2
--
-- Admin perlu bisa menonaktifkan akun dan mencatat alasannya, tanpa
-- menghapus profil (riwayat konten & audit tetap utuh).
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ban_reason    TEXT,
  ADD COLUMN IF NOT EXISTS last_role_change_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_role   ON public.profiles (role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles (is_active) WHERE is_active = FALSE;

-- Ringkasan statistik untuk dasbor admin — dihitung di database supaya
-- konsol tidak perlu menarik seluruh tabel.
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'users_total',       (SELECT count(*) FROM public.profiles),
    'users_active',      (SELECT count(*) FROM public.profiles WHERE is_active),
    'users_banned',      (SELECT count(*) FROM public.profiles WHERE banned_at IS NOT NULL),
    'konselor_total',    (SELECT count(*) FROM public.profiles WHERE role = 'konselor'),
    'threads_total',     (SELECT count(*) FROM public.threads     WHERE deleted_at IS NULL),
    'threads_trash',     (SELECT count(*) FROM public.threads     WHERE deleted_at IS NOT NULL),
    'comments_total',    (SELECT count(*) FROM public.comments    WHERE deleted_at IS NULL),
    'prayers_total',     (SELECT count(*) FROM public.prayer_requests WHERE deleted_at IS NULL),
    'articles_pending',  (SELECT count(*) FROM public.articles    WHERE status = 'pending_review' AND deleted_at IS NULL),
    'articles_published',(SELECT count(*) FROM public.articles    WHERE status = 'published' AND deleted_at IS NULL),
    'reports_pending',   (SELECT count(*) FROM public.content_reports WHERE status = 'pending')
  );
$$;

REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;


-- =====================================================
-- 6. CATAT MIGRASI
-- =====================================================

INSERT INTO public.schema_migrations (version, description)
VALUES ('2026-10-17-cms-superadmin',
        'Fase 2: soft delete, moderation_status, audit v2, schema_migrations, penegakan registration_open')
ON CONFLICT (version) DO NOTHING;


-- =====================================================
-- 7. VERIFIKASI
-- =====================================================

-- (1) Kolom soft delete terpasang di semua tabel konten?
SELECT table_name, count(*) AS kolom_baru
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('moderation_status','deleted_at','deleted_by','delete_reason','hidden_by','hidden_reason')
  AND table_name IN ('threads','comments','prayer_requests','articles','cell_groups','cell_group_messages')
GROUP BY table_name ORDER BY table_name;
-- Harus: 6 baris, masing-masing kolom_baru = 6

-- (2) Kolom audit v2 ada?
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_log'
  AND column_name IN ('before','after','reason','ip','user_agent')
ORDER BY column_name;
-- Harus: 5 baris

-- (3) Trigger penegakan pendaftaran terpasang?
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
ORDER BY tgname;
-- Harus memuat before_user_created

-- (4) Nilai registration_open sudah boolean, bukan ''?
SELECT key, value FROM public.site_settings WHERE key = 'registration_open';
-- Harus: {"value": true} atau {"value": false}

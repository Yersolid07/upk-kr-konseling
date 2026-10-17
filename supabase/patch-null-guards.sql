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

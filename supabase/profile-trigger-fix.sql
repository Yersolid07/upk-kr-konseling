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

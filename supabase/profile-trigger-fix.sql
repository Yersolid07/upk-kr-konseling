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
--   Hapus trigger lama. Satu trigger saja, dan fungsinya tidak menyentuh
--   kolom yang tidak ada. Perlindungan token anonim tetap dipegang RLS
--   `profile_secrets` dan RPC `rotate_anon_token()`.
-- =====================================================

DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;

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

  RAISE NOTICE 'Profil: trigger ganda dihapus, tersisa satu penjaga kolom.';
END $$;

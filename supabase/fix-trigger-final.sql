-- =====================================================
-- FIX: Robust handle_new_user trigger
-- Silakan jalankan seluruh kode ini di Supabase Dashboard -> SQL Editor
-- =====================================================

-- 1. Pastikan ekstensi pgcrypto aktif (untuk gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;

-- 2. Ganti fungsi trigger dengan versi yang kebal terhadap error (Robust)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Parsing role dengan aman (jika gagal/kosong, otomatis jadi 'member')
  BEGIN
    v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'member')::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'member'::public.user_role;
  END;

  -- Percobaan Insert Utama
  BEGIN
    INSERT INTO public.profiles (
      id, 
      full_name, 
      display_name, 
      angkatan, 
      jurusan, 
      role
    )
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Pengguna Baru'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Pengguna Baru'),
      NEW.raw_user_meta_data->>'angkatan',
      NEW.raw_user_meta_data->>'jurusan',
      v_role
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fallback Darurat: Jika Insert di atas gagal (misal masalah kolom), 
    -- sistem tetap akan mendaftarkan user dengan data minimal agar pendaftaran tidak error.
    INSERT INTO public.profiles (id, full_name, display_name, role)
    VALUES (NEW.id, 'Pengguna Baru', 'Pengguna Baru', 'member'::public.user_role);
  END;

  RETURN NEW;
END;
$$;

-- 3. Pastikan trigger terpasang dengan benar di auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

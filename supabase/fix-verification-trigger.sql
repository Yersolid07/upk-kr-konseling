-- =====================================================
-- FIX: Sinkronisasi Status Verifikasi Email ke Tabel Profiles
-- Silakan jalankan seluruh kode ini di Supabase Dashboard -> SQL Editor
-- =====================================================

-- 1. Buat fungsi untuk menyinkronkan status verifikasi
CREATE OR REPLACE FUNCTION public.sync_user_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Jika email_confirmed_at berubah dari NULL menjadi ada isinya (timestamp)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET is_verified = TRUE
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Pasang trigger tersebut ke auth.users agar memantau setiap perubahan verifikasi
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_verification();

-- 3. Sinkronisasi manual untuk pengguna yang sudah telanjur terverifikasi tapi profilnya masih false
UPDATE public.profiles p
SET is_verified = TRUE
FROM auth.users au
WHERE p.id = au.id AND au.email_confirmed_at IS NOT NULL AND p.is_verified = FALSE;

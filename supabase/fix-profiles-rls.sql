-- =====================================================
-- FIX: RLS Profiles (Memungkinkan Konselor Mengedit Profil Sendiri)
-- =====================================================

-- 1. Hapus kebijakan lama yang memblokir konselor
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- 2. Buat kebijakan baru yang lebih fleksibel (mengizinkan semua user mengedit baris mereka sendiri)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Untuk mencegah eksploitasi (member biasa mengubah 'role' mereka menjadi admin/konselor),
-- kita gunakan TRIGGER alih-alih RLS (menghindari infinite recursion di RLS).
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Jika user mencoba mengubah kolom role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Hanya super_admin atau admin yang boleh mengubah role orang lain
    IF NOT public.is_admin_or_above() THEN
      -- Jika bukan admin, paksa role kembali ke role lama (mengabaikan percobaan eksploitasi)
      NEW.role = OLD.role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_update ON profiles;
CREATE TRIGGER on_profile_role_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_role();

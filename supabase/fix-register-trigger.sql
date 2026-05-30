-- =====================================================
-- FIX: Update handle_new_user trigger to include
-- angkatan, jurusan, and role from user metadata
-- 
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, display_name, angkatan, jurusan, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    NEW.raw_user_meta_data->>'angkatan',
    NEW.raw_user_meta_data->>'jurusan',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member')
  );
  RETURN NEW;
END;
$$;

-- Verify the trigger exists
-- If not, run:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();

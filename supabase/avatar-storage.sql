-- =====================================================
-- AVATAR: foto profil per akun
--
-- Bucket `media` sudah ada (publik baca, tulis hanya di folder uid) tetapi
-- tanpa batas ukuran dan tanpa batas jenis berkas. Tanpa keduanya, siapa pun
-- yang punya akun bisa mengunggah berkas 500 MB atau HTML yang disajikan
-- publik dari domain Supabase.
--
-- Avatar disimpan di `media/<uid>/avatar-<stempel>.webp` supaya policy folder
-- yang sudah ada otomatis berlaku: pengguna hanya bisa menulis ke foldernya
-- sendiri.
-- =====================================================

-- ---------- 1. Batas bucket ----------
-- 2 MB cukup untuk avatar 512x512 dan tidak membebani kuota gratis.
UPDATE storage.buckets
SET file_size_limit = 2097152,                       -- 2 MB
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',                                  -- lampiran konselor
      'video/mp4', 'audio/mpeg', 'audio/mp4'
    ]
WHERE id = 'media';

-- ---------- 2. Policy baca publik untuk avatar ----------
-- Bucket sudah publik, jadi berkas dapat dibaca lewat URL publik tanpa policy.
-- Policy SELECT untuk `authenticated` tetap dipertahankan untuk daftar berkas.
DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'media');

-- ---------- 3. Pastikan pengguna hanya menimpa berkasnya sendiri ----------
-- Tanpa policy UPDATE, unggah ulang ke nama yang sama gagal dengan pesan
-- "new row violates row-level security" yang membingungkan.
DROP POLICY IF EXISTS "media_update" ON storage.objects;
CREATE POLICY "media_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 4. Verifikasi ----------
DO $$
DECLARE
  v_limit  BIGINT;
  v_mimes  TEXT[];
  v_policy INT;
BEGIN
  SELECT file_size_limit, allowed_mime_types INTO v_limit, v_mimes
  FROM storage.buckets WHERE id = 'media';

  IF v_limit IS DISTINCT FROM 2097152 THEN
    RAISE EXCEPTION 'Batas ukuran bucket media tidak terpasang (ditemukan %)', v_limit;
  END IF;
  IF v_mimes IS NULL OR NOT ('image/webp' = ANY (v_mimes)) THEN
    RAISE EXCEPTION 'Daftar jenis berkas bucket media tidak terpasang';
  END IF;

  SELECT count(*) INTO v_policy FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname IN ('media_read_public', 'media_update');
  IF v_policy <> 2 THEN
    RAISE EXCEPTION 'Policy avatar tidak lengkap (ditemukan %)', v_policy;
  END IF;

  RAISE NOTICE 'Avatar: batas 2 MB, jenis berkas dibatasi, policy baca & timpa terpasang.';
END $$;

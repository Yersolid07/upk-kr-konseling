-- =====================================================
-- HOTFIX KEAMANAN — Fase 0
-- IKA UPK-Kr FT UNSRAT
--
-- Jalankan SELURUH berkas ini di Supabase Dashboard -> SQL Editor.
-- Aman dijalankan berulang kali (idempotent).
--
-- Menutup temuan audit:
--   K1  Eskalasi role lewat metadata signup + lewat update langsung
--   T3  Kolom profil sensitif bisa diubah sendiri
--   Bagian dari K2  hotline harus terbaca tanpa login
--
-- Urutan: A1 -> A2 -> A3 -> A4 -> A5 -> A6
-- =====================================================


-- =====================================================
-- A1. SIGNUP: JANGAN PERCAYA role DARI METADATA
--
-- Sebelumnya: COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member')
-- Anon key itu publik. Siapa pun bisa memanggil supabase.auth.signUp()
-- dengan data: { role: 'super_admin' } dan langsung jadi super admin.
--
-- Sesudahnya: role SELALU 'member'. Kenaikan peran hanya lewat CMS
-- (server action ber-guard) atau SQL manual oleh pemilik project.
--
-- Blok EXCEPTION fallback dipertahankan dari fix-trigger-final.sql supaya
-- pendaftaran tidak pernah gagal total karena satu kolom bermasalah.
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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
      'member'::public.user_role          -- <-- TIDAK PERNAH dari metadata
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fallback Darurat: sistem tetap mendaftarkan user dengan data minimal
    -- agar pendaftaran tidak error.
    INSERT INTO public.profiles (id, full_name, display_name, role)
    VALUES (NEW.id, 'Pengguna Baru', 'Pengguna Baru', 'member'::public.user_role);
  END;

  RETURN NEW;
END;
$$;

-- Pastikan trigger terpasang di auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================
-- A2. AUDIT: AKUN BERPERAN TINGGI
--
-- Ini BUKAN perbaikan, ini PEMERIKSAAN. Jalankan SELECT-nya, lalu cocokkan
-- hasilnya dengan orang yang kamu kenal. Kalau ada akun yang tidak kamu
-- kenal berperan admin/super_admin/moderator, itu bukti eksploitasi K1:
-- turunkan perannya dengan perintah di komentar bawah.
-- =====================================================
SELECT
  p.id,
  p.full_name,
  p.role,
  p.created_at,
  u.email,
  u.last_sign_in_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role IN ('super_admin', 'admin', 'moderator', 'konselor')
ORDER BY p.created_at;

-- Turunkan peran akun tak dikenal (ganti <UUID> dan sesuaikan):
-- UPDATE public.profiles SET role = 'member' WHERE id = '<UUID>';
--
-- Cek juga user auth yang tidak punya baris profil (artefak trigger lama):
-- SELECT u.id, u.email, u.created_at
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- WHERE p.id IS NULL;


-- =====================================================
-- A3. PERLINDUNGAN KOLOM PROFIL BERBASIS PERINGKAT
--
-- Menggantikan protect_profile_role() yang hanya memeriksa
-- "is_admin_or_above()" — sehingga admin bisa menaikkan dirinya sendiri
-- menjadi super_admin lewat API langsung (K1 bukti 2), dan pemilik profil
-- bisa mengubah is_active (membatalkan suspend), is_verified, dan
-- anon_token (T3).
--
-- Aturan baru:
--   - service role / trigger internal (auth.uid() NULL) -> dilewatkan
--   - super_admin -> bebas
--   - admin        -> hanya boleh mengubah role ke/dari bawah admin
--                     (tidak bisa menyentuh admin & super_admin)
--   - selain itu   -> role, is_active, is_verified, anon_token dikunci
--
-- Catatan: trigger memulihkan nilai lama alih-alih melempar error, supaya
-- update kolom lain di baris yang sama (mis. ganti nama) tetap berhasil.
-- =====================================================
CREATE OR REPLACE FUNCTION public.role_rank(p_role public.user_role)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_role
    WHEN 'super_admin' THEN 5
    WHEN 'admin'       THEN 4
    WHEN 'moderator'   THEN 3
    WHEN 'konselor'    THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller public.user_role;
BEGIN
  -- service_role / trigger internal / migrasi: tidak ada JWT -> lewatkan.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_caller := public.current_user_role();

  IF v_caller IS DISTINCT FROM 'super_admin' THEN
    -- (a) Perubahan role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF v_caller IS DISTINCT FROM 'admin'
         OR public.role_rank(OLD.role) >= 4      -- target admin/super_admin
         OR public.role_rank(NEW.role) >= 4      -- hasil admin/super_admin
         OR OLD.id = auth.uid() THEN             -- tidak boleh ubah role sendiri
        NEW.role := OLD.role;
      END IF;
    END IF;

    -- (b) Kolom sensitif: hanya admin ke atas
    IF v_caller IS DISTINCT FROM 'admin' THEN
      NEW.is_active   := OLD.is_active;
      NEW.is_verified := OLD.is_verified;
      NEW.anon_token  := OLD.anon_token;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();


-- =====================================================
-- A4. POLICY profiles_update_admin: TAMBAH WITH CHECK
--
-- USING (is_admin_or_above()) tanpa WITH CHECK berarti hasil UPDATE tidak
-- diverifikasi ulang. WITH CHECK eksplisit membuat maksud policy terbaca
-- dan tidak bergantung pada perilaku bawaan PostgreSQL.
--
-- WITH CHECK (id = auth.uid() OR public.is_admin_or_above())  ->  semua baris
-- tetap boleh disentuh admin; penjaga sebenarnya adalah trigger A3.
-- =====================================================
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());


-- =====================================================
-- A5. HOTLINE TERBACA TANPA LOGIN
--
-- Orang yang sedang krisis dan belum punya akun harus bisa melihat nomor
-- darurat. Halaman /hotline kini publik; policy-nya harus mengizinkan anon
-- membaca baris yang aktif. Tulis tetap hanya admin ke atas.
-- =====================================================
DROP POLICY IF EXISTS "hotline_select" ON public.hotline_contacts;
CREATE POLICY "hotline_select" ON public.hotline_contacts FOR SELECT
  TO anon, authenticated USING (is_active IS TRUE);

DROP POLICY IF EXISTS "hotline_write" ON public.hotline_contacts;
CREATE POLICY "hotline_write" ON public.hotline_contacts FOR ALL
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());


-- =====================================================
-- A6. RPC notify_user — NOTIFIKASI LINTAS PENGGUNA
--
-- Policy notif_insert mensyaratkan user_id = auth.uid(), sehingga admin
-- TIDAK BISA mengirim notifikasi kepada orang lain dari klien biasa —
-- approveArticle/rejectArticle/assignRole diam-diam gagal (temuan T2).
--
-- Fungsi ini SECURITY DEFINER: ia memeriksa peran pemanggil sendiri, jadi
-- tidak ada cara mengirim notifikasi ke orang lain tanpa hak admin.
-- NULL dianggap "pemanggil tidak berhak" -> exception, bukan gagal senyap.
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_type    public.notification_type,
  p_title   TEXT,
  p_body    TEXT DEFAULT NULL,
  p_link    TEXT DEFAULT NULL,
  p_meta    JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  -- Boleh: admin ke atas (mengirim ke siapa pun) atau pengguna mengirim
  -- notifikasi ke dirinya sendiri (dipakai untuk pengingat pribadi).
  IF NOT (
    public.is_admin_or_above()
    OR auth.uid() = p_user_id
  ) THEN
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


-- notify_admins — anggota biasa MEMBERI TAHU admin (bukan mengirim notifikasi
-- ke sembarang orang). Dipakai saat anggota mengirim artikel atau mengajukan
-- diri sebagai konselor: keduanya butuh memberitahu admin, tetapi policy
-- notif_insert menolak insert lintas pengguna dari klien biasa sehingga
-- pemberitahuannya selama ini gagal SENYAP.
--
-- Batasannya ketat: tujuan HANYA akun berperan admin/super_admin, dan judul
-- serta isi dibatasi panjangnya supaya tidak bisa dipakai spam massal.
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_type  public.notification_type,
  p_title TEXT,
  p_body  TEXT DEFAULT NULL,
  p_link  TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF length(coalesce(p_title, '')) > 120 OR length(coalesce(p_body, '')) > 500 THEN
    RAISE EXCEPTION 'Judul/isi notifikasi terlalu panjang.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, meta)
  SELECT p.id, p_type, p_title, p_body, p_link,
         jsonb_build_object('from_user', auth.uid())
  FROM public.profiles p
  WHERE p.role IN ('admin', 'super_admin') AND p.id <> auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins(public.notification_type, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_admins(public.notification_type, TEXT, TEXT, TEXT) TO authenticated;


-- =====================================================
-- A7. VERIFIKASI
-- Jalankan SELECT di bawah untuk memastikan hotfix benar-benar aktif.
-- =====================================================

-- (1) Definisi trigger profil sudah versi baru?
SELECT
  p.proname                                          AS fungsi,
  pg_get_triggerdef(t.oid)                           AS definisi_trigger
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'public.profiles'::regclass
  AND NOT t.tgisinternal;

-- (2) Fungsi signup sudah tidak membaca metadata role?
SELECT
  p.proname                                          AS fungsi,
  (pg_get_functiondef(p.oid) LIKE '%raw_user_meta_data->>''role''%') AS masih_baca_role_metadata
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
-- Harus: masih_baca_role_metadata = false

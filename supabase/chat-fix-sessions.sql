-- =====================================================
-- CHAT: perbaikan sesi yang tidak pernah bisa dipakai
--
-- MASALAH YANG DIPERBAIKI
--
-- 1. Sesi dari tombol "Hubungi" dibuat dengan status 'pending' dan
--    konselor_id NULL. Policy `messages_insert` mensyaratkan
--    `status = 'active'` DAN pengirim adalah peserta sesi. Akibatnya pesan
--    pertama ditolak RLS tanpa pesan yang terlihat, dan antrean tidak pernah
--    punya konselor. Terbukti di basis data: 2 sesi 'pending', konselor NULL,
--    0 pesan.
--
-- 2. Tidak ada cara memindahkan sesi 'pending' ke konselor. Ditambahkan
--    fungsi `claim_chat_session()` yang dipanggil konselor untuk mengambil
--    sesi dari antrean — atomik, supaya dua konselor tidak mengambil sesi
--    yang sama.
--
-- 3. Sesi 'pending' tidak pernah menjadi 'active' meski konselor sudah
--    membalas. Ditambahkan trigger: pesan pertama dari konselor mengaktifkan
--    sesi.
-- =====================================================

-- ---------- 1. Peserta boleh menulis ke sesi yang belum punya konselor ----------
-- Aturan lama menuntut status 'active'. Untuk sesi 'pending' tanpa konselor,
-- anggota TETAP harus bisa menulis: justru pesan pertamanya yang menjadi
-- konteks bagi konselor yang mengambil antrean. Yang dijaga tetap sama:
-- hanya peserta sesi, dan status tidak boleh 'completed'/'cancelled'.
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = messages.session_id
        AND s.status IN ('pending', 'active')
        AND (s.member_id = auth.uid() OR s.konselor_id = auth.uid())
    )
  );

-- ---------- 2. Ambil sesi dari antrean (konselor) ----------
-- SECURITY DEFINER karena policy UPDATE chat_sessions tidak mengizinkan
-- konselor mengubah baris yang belum menjadi miliknya — memang begitu
-- seharusnya. Fungsi ini adalah satu-satunya pintu, dan syaratnya ketat:
-- pemanggil harus konselor aktif, sesi harus masih 'pending' dan belum
-- punya konselor. `FOR UPDATE` mencegah dua konselor mengambil sesi sama.
CREATE OR REPLACE FUNCTION public.claim_chat_session(p_session_id UUID)
RETURNS public.chat_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   TEXT;
  v_active BOOLEAN;
  v_row    public.chat_sessions;
BEGIN
  SELECT role, is_active INTO v_role, v_active
  FROM public.profiles WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'konselor' OR COALESCE(v_active, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Hanya konselor aktif yang dapat mengambil sesi.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.chat_sessions
  WHERE id = p_session_id
    AND status = 'pending'
    AND konselor_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi sudah diambil konselor lain atau tidak lagi tersedia.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_row.member_id = auth.uid() THEN
    RAISE EXCEPTION 'Tidak dapat mengambil sesi milik sendiri.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.chat_sessions
  SET konselor_id = auth.uid(),
      status = 'active',
      updated_at = now()
  WHERE id = p_session_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_chat_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_chat_session(UUID) TO authenticated;

-- ---------- 3. Balasan pertama konselor mengaktifkan sesi ----------
-- Tanpa ini, sesi yang diambil lewat claim sudah 'active' (baik), tetapi sesi
-- lama yang ditugaskan langsung (konselor_id terisi, status 'pending') akan
-- tetap 'pending' selamanya dan badge status di UI menyesatkan.
CREATE OR REPLACE FUNCTION public.activate_session_on_konselor_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions s
  SET status = 'active', updated_at = now()
  WHERE s.id = NEW.session_id
    AND s.status = 'pending'
    AND s.konselor_id = NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_session_on_reply ON public.messages;
CREATE TRIGGER trg_activate_session_on_reply
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.activate_session_on_konselor_reply();

-- ---------- 4. Sesi tanpa konselor boleh dibaca konselor (antrean) ----------
-- Antrean perlu memperlihatkan topik dan pesan pertama kepada konselor yang
-- mempertimbangkan mengambilnya. Akses dibatasi: hanya sesi 'pending' yang
-- belum punya konselor. Isi sesi yang sudah diambil tetap tertutup.
DROP POLICY IF EXISTS "sessions_select_queue" ON public.chat_sessions;
CREATE POLICY "sessions_select_queue" ON public.chat_sessions FOR SELECT
  TO authenticated USING (
    status = 'pending'
    AND konselor_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'konselor' AND p.is_active
    )
  );

-- ---------- 5. Verifikasi ----------
DO $$
DECLARE
  v_policy INT;
  v_fn     INT;
BEGIN
  SELECT count(*) INTO v_policy FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert';
  IF v_policy <> 1 THEN
    RAISE EXCEPTION 'Policy messages_insert tidak terpasang (ditemukan %)', v_policy;
  END IF;

  SELECT count(*) INTO v_fn FROM pg_proc
  WHERE proname IN ('claim_chat_session', 'activate_session_on_konselor_reply');
  IF v_fn <> 2 THEN
    RAISE EXCEPTION 'Fungsi chat tidak lengkap (ditemukan %)', v_fn;
  END IF;

  RAISE NOTICE 'Chat: policy insert, claim_chat_session, dan trigger aktivasi terpasang.';
END $$;

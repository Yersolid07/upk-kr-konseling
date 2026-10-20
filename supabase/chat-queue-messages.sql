-- =====================================================
-- CHAT: konselor tidak bisa membuka antrean
--
-- GEJALA
--   Anggota menulis "halo" -> sesi 'pending' muncul di dashboard konselor
--   sebagai kartu "Permintaan Chat Baru". Klik RESPON SEKARANG -> kembali
--   ke /chat, ruang chat tidak pernah terbuka. "Konseling Berjalan" kosong.
--
-- TERBUKTI DI DATABASE (login sebagai konselor sungguhan)
--   chat_sessions (sesi pending) -> 1 baris   (policy antrean bekerja)
--   messages     (sesi itu)      -> 0 baris   (policy pesan menolak)
--
-- PENYEBAB
--   `messages_select` di phase1-data-security.sql hanya mengizinkan peserta
--   sesi: `s.member_id = auth.uid() OR s.konselor_id = auth.uid()`.
--   Untuk sesi pending, konselor_id masih NULL — konselor BUKAN peserta
--   sampai ia mengklaim. Jadi:
--     1. Konselor tidak bisa membaca pesan pertama, padahal justru itu
--        konteks yang ia butuhkan untuk memutuskan mengambil sesi.
--     2. /chat/[id] menerima sessionData yang sah, tetapi query pesannya
--        kosong; halaman menampilkan percakapan hampa.
--
-- PERBAIKAN
--   Tambah satu cabang pada policy: konselor aktif boleh membaca pesan sesi
--   'pending' yang belum punya konselor. Ini sejalan dengan
--   `sessions_select_queue` yang sudah memperlihatkan sesi tersebut.
--   Batasnya ketat: hanya status 'pending', hanya konselor_id IS NULL, dan
--   hanya bila pemanggil benar-benar konselor aktif. Begitu sesi diklaim,
--   cabang ini tidak berlaku lagi dan akses kembali ke peserta saja.
-- =====================================================

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = messages.session_id
        AND (
          -- peserta sesi (anggota atau konselor pemegang)
          s.member_id = auth.uid()
          OR s.konselor_id = auth.uid()
          -- konselor aktif membaca antrean yang belum diambil
          OR (
            s.status = 'pending'
            AND s.konselor_id IS NULL
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.role = 'konselor'
                AND p.is_active
            )
          )
        )
    )
  );

-- ---------- Verifikasi ----------
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_expr(polqual, polrelid) INTO v_def
  FROM pg_policy
  WHERE polname = 'messages_select'
    AND polrelid = 'public.messages'::regclass;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'policy messages_select tidak ditemukan';
  END IF;

  -- Peserta dan antrean harus sama-sama disebut; kalau salah satu hilang,
  -- konselor atau anggota akan kehilangan akses tanpa gejala yang jelas.
  IF v_def NOT ILIKE '%konselor_id%' OR v_def NOT ILIKE '%pending%' THEN
    RAISE EXCEPTION 'policy messages_select tidak memuat cabang antrean: %', v_def;
  END IF;

  RAISE NOTICE 'Chat: konselor kini bisa membaca pesan sesi antrean.';
END $$;

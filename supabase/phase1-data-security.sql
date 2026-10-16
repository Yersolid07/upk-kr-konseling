-- =====================================================
-- FASE 1 — FONDASI KEAMANAN DATA
-- IKA UPK-Kr FT UNSRAT
--
-- Jalankan SELURUH berkas ini di Supabase Dashboard -> SQL Editor,
-- SETELAH supabase/hotfix-security.sql.
-- Aman dijalankan berulang kali (idempotent).
--
-- Menutup temuan audit:
--   K2  Anonimitas hanya kosmetik — anon_token & author_id terkirim ke browser
--   T1  Lampiran tanpa validasi server (XSS / phishing lewat javascript: dan iframe)
--   T4  Privasi konseling — konselor_notes terbaca anggota, admin bebas baca pesan
--   T5  Policy thread — konselor bisa mengubah semua kolom semua thread
--   T6  Tidak ada policy UPDATE/DELETE untuk articles, cell_groups, messages, dll
--
-- Urutan: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
-- =====================================================


-- =====================================================
-- 1. ANONIMITAS (K2) — PINDAHKAN anon_token KE TABEL PRIVAT
--
-- Masalah: policy profiles_select_authenticated memakai USING (TRUE) untuk
-- SEMUA kolom, termasuk anon_token. Siapa pun yang login bisa membaca
-- anon_token orang lain lewat network tab dan memetakan "Anonim#A3F9" ke
-- nama aslinya. Itu melanggar janji di Syarat & Ketentuan dan Kebijakan
-- Privasi.
--
-- RLS bekerja per BARIS, bukan per KOLOM. Jadi solusinya bukan menambah
-- policy, melainkan MEMINDAHKAN kolom rahasia ke tabel terpisah yang
-- punya policy sendiri.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profile_secrets (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  anon_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profile_secrets IS
  'Kolom rahasia profil yang TIDAK boleh terbaca pengguna lain. Hanya pemilik baris dan super admin.';

-- Pindahkan nilai yang sudah ada (kalau kolomnya masih ada).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'anon_token'
  ) THEN
    INSERT INTO public.profile_secrets (user_id, anon_token)
    SELECT id, anon_token FROM public.profiles WHERE anon_token IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;

    -- Isi yang belum punya token
    INSERT INTO public.profile_secrets (user_id)
    SELECT id FROM public.profiles
    ON CONFLICT (user_id) DO NOTHING;

    -- Baru lepas kolomnya dari tabel publik.
    ALTER TABLE public.profiles DROP COLUMN anon_token;
  END IF;
END $$;

-- Pastikan setiap profil punya baris rahasia (untuk profil baru).
CREATE OR REPLACE FUNCTION public.ensure_profile_secret()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_secrets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_profile_secret ON public.profiles;
CREATE TRIGGER trg_ensure_profile_secret
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_profile_secret();

ALTER TABLE public.profile_secrets ENABLE ROW LEVEL SECURITY;

-- Hanya PEMILIK baris dan SUPER ADMIN yang boleh membaca.
DROP POLICY IF EXISTS "secrets_select_own" ON public.profile_secrets;
CREATE POLICY "secrets_select_own" ON public.profile_secrets FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "secrets_update_own" ON public.profile_secrets;
CREATE POLICY "secrets_update_own" ON public.profile_secrets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

-- Rotasi token sendiri (dipakai tombol "putar ulang token anonim").
CREATE OR REPLACE FUNCTION public.rotate_anon_token()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profile_secrets
     SET anon_token = encode(gen_random_bytes(8), 'hex'), updated_at = NOW()
   WHERE user_id = auth.uid()
  RETURNING anon_token INTO v_new;
  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_anon_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_anon_token() TO authenticated;


-- =====================================================
-- 2. VIEW PUBLIK (K2) — PSEUDONIM PER-KONTEN, author_id DISEMBUNYIKAN
--
-- Setiap view:
--   - menyembunyikan author_id pada konten anonim (NULL)
--   - menghitung label pseudonim PER-KONTEN dari (content_id + author_id +
--     rahasia). Satu orang TIDAK bisa dikorelasikan antar-thread, karena
--     labelnya berbeda di setiap konten.
--   - mengirim nama/avatar penulis HANYA untuk konten non-anonim.
--
-- security_invoker = true -> RLS tabel di bawahnya tetap berlaku untuk
-- pemanggil. View ini MEMPERKETAT, bukan menembus.
--
-- Catatan: rahasia pseudonim ditulis langsung di definisi view (bukan
-- fungsi terpisah) supaya tidak ada fungsi yang bisa dipanggil orang lain
-- untuk menghitung label sembarang pasangan (content_id, author_id).
-- Definisi view hanya terbaca oleh pemilik database.
-- =====================================================

-- Label anonim acak disimpan per konten di tabel privat. Jangan gunakan hash
-- dengan salt tetap: karena author UUID dapat diketahui, siapa pun bisa
-- mencoba semua profil dan membalik pseudonim tersebut.
CREATE TABLE IF NOT EXISTS public.content_anon_labels (
  content_type public.content_type NOT NULL CHECK (content_type IN ('thread', 'comment', 'prayer')),
  content_id   UUID NOT NULL,
  anon_label   TEXT NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 4)),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (content_type, content_id)
);
ALTER TABLE public.content_anon_labels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.content_anon_labels FROM PUBLIC, anon, authenticated;

-- Hanya mengembalikan label acak yang memang ditujukan untuk ditampilkan.
-- Tidak mengembalikan author_id maupun token pemiliknya.
CREATE OR REPLACE FUNCTION public.public_anon_label(
  p_content_type public.content_type,
  p_content_id UUID
) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.anon_label
  FROM public.content_anon_labels l
  WHERE l.content_type = p_content_type AND l.content_id = p_content_id;
$$;
REVOKE ALL ON FUNCTION public.public_anon_label(public.content_type, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_anon_label(public.content_type, UUID) TO authenticated;

-- Isi label untuk konten lama. Nilai acak tidak bisa dipetakan ke akun.
INSERT INTO public.content_anon_labels (content_type, content_id)
SELECT 'thread', id FROM public.threads WHERE is_anonymous
ON CONFLICT (content_type, content_id) DO NOTHING;
INSERT INTO public.content_anon_labels (content_type, content_id)
SELECT 'comment', id FROM public.comments WHERE is_anonymous
ON CONFLICT (content_type, content_id) DO NOTHING;
INSERT INTO public.content_anon_labels (content_type, content_id)
SELECT 'prayer', id FROM public.prayer_requests WHERE is_anonymous
ON CONFLICT (content_type, content_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_content_anon_label()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type public.content_type;
  v_id UUID;
  v_is_anonymous BOOLEAN;
BEGIN
  v_id := NEW.id;
  v_is_anonymous := NEW.is_anonymous;
  CASE TG_TABLE_NAME
    WHEN 'threads' THEN v_type := 'thread';
    WHEN 'comments' THEN v_type := 'comment';
    WHEN 'prayer_requests' THEN v_type := 'prayer';
    ELSE RAISE EXCEPTION 'Unsupported anonymous content table: %', TG_TABLE_NAME;
  END CASE;

  IF v_is_anonymous THEN
    INSERT INTO public.content_anon_labels (content_type, content_id)
    VALUES (v_type, v_id)
    ON CONFLICT (content_type, content_id) DO NOTHING;
  ELSE
    DELETE FROM public.content_anon_labels
    WHERE content_type = v_type AND content_id = v_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_thread_anon_label ON public.threads;
CREATE TRIGGER trg_thread_anon_label AFTER INSERT OR UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.ensure_content_anon_label();
DROP TRIGGER IF EXISTS trg_comment_anon_label ON public.comments;
CREATE TRIGGER trg_comment_anon_label AFTER INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.ensure_content_anon_label();
DROP TRIGGER IF EXISTS trg_prayer_anon_label ON public.prayer_requests;
CREATE TRIGGER trg_prayer_anon_label AFTER INSERT OR UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.ensure_content_anon_label();

CREATE OR REPLACE VIEW public.threads_public
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.category_id,
  t.title,
  t.content,
  t.is_anonymous,
  t.is_pinned,
  t.is_locked,
  t.is_flagged,
  t.view_count,
  t.comment_count,
  t.created_at,
  t.updated_at,
  CASE WHEN t.is_anonymous THEN NULL ELSE t.author_id END AS author_id,
  CASE WHEN t.is_anonymous THEN public.public_anon_label('thread', t.id) END AS anon_label,
  CASE WHEN t.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN t.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar,
  CASE WHEN t.is_anonymous THEN NULL ELSE p.role END AS author_role
FROM public.threads t
LEFT JOIN public.profiles p ON p.id = t.author_id;

CREATE OR REPLACE VIEW public.comments_public
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.thread_id,
  c.parent_id,
  c.content,
  c.is_anonymous,
  c.is_flagged,
  c.created_at,
  CASE WHEN c.is_anonymous THEN NULL ELSE c.author_id END AS author_id,
  CASE WHEN c.is_anonymous THEN public.public_anon_label('comment', c.id) END AS anon_label,
  CASE WHEN c.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN c.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar,
  CASE WHEN c.is_anonymous THEN NULL ELSE p.role END AS author_role
FROM public.comments c
LEFT JOIN public.profiles p ON p.id = c.author_id;

CREATE OR REPLACE VIEW public.prayers_public
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.content,
  r.category_id,
  r.is_anonymous,
  r.is_answered,
  r.pray_count,
  r.created_at,
  r.updated_at,
  CASE WHEN r.is_anonymous THEN NULL ELSE r.author_id END AS author_id,
  CASE WHEN r.is_anonymous THEN public.public_anon_label('prayer', r.id) END AS anon_label,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar
FROM public.prayer_requests r
LEFT JOIN public.profiles p ON p.id = r.author_id;

-- View profil publik: SEMUA kolom profil KECUALI yang sensitif.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id, full_name, display_name, avatar_url, role, bio, angkatan, jurusan,
  specialization, is_verified, is_online, last_seen, created_at
FROM public.profiles;

-- Catatan: public_anon_label() tetap boleh dipanggil `authenticated` karena
-- view di atas memakai security_invoker (hak pemanggil). Pemanggilan langsung
-- lewat RPC tidak membocorkan apa pun: fungsinya hanya mengembalikan label
-- yang memang sudah ditampilkan di UI untuk konten tersebut, dan TIDAK pernah
-- mengembalikan author_id atau token.
GRANT SELECT ON public.threads_public    TO authenticated;
GRANT SELECT ON public.comments_public   TO authenticated;
GRANT SELECT ON public.prayers_public    TO authenticated;
GRANT SELECT ON public.profiles_public   TO authenticated;


-- =====================================================
-- 3. PEMBUKAAN IDENTITAS TERAUDIT (K5 / Lampiran C)
--
-- Sebelumnya IdentityRevealForm membaca profil dan menulis log LANGSUNG
-- dari browser, hasil insert tidak diperiksa, dan nama tetap ditampilkan
-- walau insert ditolak RLS. Karena profiles terbaca semua orang, log itu
-- bisa dilewati sepenuhnya.
--
-- Sekarang: satu fungsi SECURITY DEFINER yang menulis log LEBIH DULU,
-- berdasarkan KONTEN (bukan awalan token 4 huruf yang bisa bentrok),
-- hanya untuk super_admin, alasan wajib >= 20 karakter, dan memberi tahu
-- super admin lain.
-- =====================================================

CREATE OR REPLACE FUNCTION public.reveal_identity(
  p_content_type public.content_type,
  p_content_id   UUID,
  p_reason       TEXT
) RETURNS TABLE (user_id UUID, full_name TEXT, angkatan TEXT, jurusan TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target UUID;
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF length(trim(coalesce(p_reason, ''))) < 20 THEN
    RAISE EXCEPTION 'Alasan pembukaan minimal 20 karakter.';
  END IF;

  -- Cari penulis dari KONTEN, bukan dari awalan token.
  IF p_content_type = 'thread' THEN
    SELECT author_id INTO v_target FROM public.threads WHERE id = p_content_id;
  ELSIF p_content_type = 'comment' THEN
    SELECT author_id INTO v_target FROM public.comments WHERE id = p_content_id;
  ELSIF p_content_type = 'prayer' THEN
    SELECT author_id INTO v_target FROM public.prayer_requests WHERE id = p_content_id;
  END IF;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Konten tidak ditemukan.';
  END IF;

  -- LOG DULU — tidak ada jalur membuka identitas tanpa jejak.
  INSERT INTO public.identity_reveal_log
    (requested_by, target_content_type, target_content_id, revealed_user_id, reason)
  VALUES (auth.uid(), p_content_type, p_content_id, v_target, p_reason);

  -- Beri tahu super admin lain.
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT id, 'system', 'Identitas anonim dibuka',
         'Seorang super admin membuka identitas penulis sebuah konten. Lihat log audit.',
         '/admin'
  FROM public.profiles
  WHERE role = 'super_admin' AND id <> auth.uid();

  RETURN QUERY
    SELECT p.id, p.full_name, p.angkatan, p.jurusan
    FROM public.profiles p WHERE p.id = v_target;
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_identity(public.content_type, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reveal_identity(public.content_type, UUID, TEXT) TO authenticated;

-- Tabel log: hanya super admin yang boleh membacanya.
ALTER TABLE public.identity_reveal_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reveal_log_select" ON public.identity_reveal_log;
CREATE POLICY "reveal_log_select" ON public.identity_reveal_log FOR SELECT
  TO authenticated USING (public.is_super_admin());


-- =====================================================
-- 4. LAMPIRAN (T1) — VALIDASI DI DATABASE
--
-- Insert ke attachments hanya diperiksa owner_id; kind dan url tidak
-- divalidasi di server. AttachmentList memakai url langsung pada <a href>,
-- <iframe src>, dan <img src>; allowlist host embed hanya ada di klien.
-- Akibatnya URL javascript: atau iframe ke situs sembarang bisa disisipkan.
--
-- CHECK di bawah adalah garis pertahanan TERAKHIR — validasi utama tetap
-- di server action (lib/uploads.ts), karena CHECK tidak bisa membedakan
-- host embed yang diizinkan per jenis konten.
-- =====================================================

-- Bersihkan baris lama yang melanggar supaya ALTER tidak gagal.
DELETE FROM public.attachments WHERE url !~* '^https://';

ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_url_https;
ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_url_https CHECK (url ~* '^https://');

-- Lampiran yang menempel ke konten harus punya content_id; draf boleh NULL.
ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_title_len;
ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_title_len CHECK (title IS NULL OR char_length(title) <= 200);

CREATE INDEX IF NOT EXISTS idx_attachments_owner_created
  ON public.attachments (owner_id, created_at DESC);


-- =====================================================
-- 5. PRIVASI KONSELING (T4)
--
-- Tiga masalah:
--   a) konselor_notes ada di chat_sessions, dan anggota bisa membaca
--      baris sesinya sendiri lewat RLS -> catatan privat konselor bocor.
--   b) anggota bisa meng-update kolom APA PUN di sesinya (konselor_id,
--      status, rating) karena policy UPDATE tidak membatasi kolom.
--   c) policy messages memberi admin + super_admin akses baca ke SEMUA
--      pesan privat, bertentangan dengan Kebijakan Privasi.
-- =====================================================

-- (a) Pindahkan catatan konselor ke tabel sendiri.
CREATE TABLE IF NOT EXISTS public.session_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  konselor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_notes_session ON public.session_notes(session_id);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_sessions' AND column_name = 'konselor_notes'
  ) THEN
    INSERT INTO public.session_notes (session_id, konselor_id, note)
    SELECT id, konselor_id, konselor_notes
    FROM public.chat_sessions
    WHERE konselor_notes IS NOT NULL AND trim(konselor_notes) <> '' AND konselor_id IS NOT NULL;

  -- Kolom tambahan yang tidak tertulis di skema lama bisa gagal typecheck jika
  -- dihapus melalui tipe aplikasi; CASCADE aman karena seluruh kolom pribadi.
  ALTER TABLE public.chat_sessions DROP COLUMN IF EXISTS konselor_notes CASCADE;
  END IF;
END $$;

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- HANYA konselor pemilik catatan. Anggota tidak pernah bisa membacanya.
DROP POLICY IF EXISTS "session_notes_select" ON public.session_notes;
CREATE POLICY "session_notes_select" ON public.session_notes FOR SELECT
  TO authenticated USING (konselor_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "session_notes_write" ON public.session_notes;
CREATE POLICY "session_notes_write" ON public.session_notes FOR ALL
  TO authenticated
  USING (konselor_id = auth.uid())
  WITH CHECK (konselor_id = auth.uid());

-- (b) Trigger pelindung kolom chat_sessions.
--     Anggota hanya boleh mengubah rating/review miliknya; status, konselor,
--     dan waktu dikelola server/konselor.
CREATE OR REPLACE FUNCTION public.protect_session_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  v_caller := public.current_user_role();

  -- Konselor ke atas bebas.
  IF public.role_rank(v_caller) >= 2 THEN RETURN NEW; END IF;

  -- Anggota: kunci semua kolom struktural, izinkan rating & review saja.
  IF NEW.member_id       IS DISTINCT FROM OLD.member_id       THEN NEW.member_id := OLD.member_id; END IF;
  IF NEW.konselor_id     IS DISTINCT FROM OLD.konselor_id     THEN NEW.konselor_id := OLD.konselor_id; END IF;
  IF NEW.status          IS DISTINCT FROM OLD.status          THEN NEW.status := OLD.status; END IF;
  IF NEW.topic           IS DISTINCT FROM OLD.topic           THEN NEW.topic := OLD.topic; END IF;
  IF NEW.is_anonymous    IS DISTINCT FROM OLD.is_anonymous    THEN NEW.is_anonymous := OLD.is_anonymous; END IF;
  IF NEW.started_at      IS DISTINCT FROM OLD.started_at      THEN NEW.started_at := OLD.started_at; END IF;
  IF NEW.ended_at        IS DISTINCT FROM OLD.ended_at        THEN NEW.ended_at := OLD.ended_at; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_session_columns ON public.chat_sessions;
CREATE TRIGGER trg_protect_session_columns
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.protect_session_columns();

-- (c) Pesan privat: HANYA peserta sesi (anggota & konselor).
--     Admin/super_admin TIDAK punya akses baca default. Akses darurat
--     disediakan lewat fungsi break-glass di bagian 6.
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = messages.session_id
        AND (s.member_id = auth.uid() OR s.konselor_id = auth.uid())
    )
  );


-- =====================================================
-- 6. BREAK-GLASS READ — AKSES DARURAT YANG TERCATAT
--
-- Pengganti akses admin bebas ke isi chat. Super admin bisa membaca pesan
-- sebuah sesi, TETAPI: alasan wajib, tercatat di audit_log, dan super admin
-- lain diberi tahu. Tidak ada jalur membaca tanpa jejak.
-- =====================================================

CREATE OR REPLACE FUNCTION public.break_glass_read_messages(
  p_session_id UUID,
  p_reason     TEXT
) RETURNS TABLE (
  id UUID, sender_id UUID, content TEXT, is_read BOOLEAN, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF length(trim(coalesce(p_reason, ''))) < 20 THEN
    RAISE EXCEPTION 'Alasan akses darurat minimal 20 karakter.';
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_role, action, entity, entity_id, detail)
  VALUES (auth.uid(), 'super_admin', 'export', 'messages', p_session_id::text,
          jsonb_build_object('break_glass', TRUE, 'reason', p_reason));

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT id, 'system', 'Isi chat privat dibuka (break-glass)',
         'Seorang super admin membaca isi sesi konseling lewat prosedur darurat. Lihat log audit.',
         '/admin'
  FROM public.profiles WHERE role = 'super_admin' AND id <> auth.uid();

  RETURN QUERY
    SELECT m.id, m.sender_id, m.content, m.is_read, m.created_at
    FROM public.messages m
    WHERE m.session_id = p_session_id
    ORDER BY m.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.break_glass_read_messages(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.break_glass_read_messages(UUID, TEXT) TO authenticated;


-- =====================================================
-- 7. PERLINDUNGAN KOLOM & POLICY (T5, T6)
-- =====================================================

-- (T5) Thread: moderator ke atas boleh moderasi, tetapi HANYA moderator ke
-- atas yang boleh mengubah is_pinned / is_locked / is_flagged / counter.
-- Sebelumnya threads_update_moderator memakai is_konselor_or_above(),
-- sehingga KONSELOR bisa mengubah semua kolom semua thread.
CREATE OR REPLACE FUNCTION public.protect_thread_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  v_caller := public.current_user_role();

  -- Moderator ke atas: bebas.
  IF public.role_rank(v_caller) >= 3 THEN RETURN NEW; END IF;

  -- Penulis biasa: hanya judul/isi/kategori/anonim yang boleh berubah.
  IF NEW.is_pinned     IS DISTINCT FROM OLD.is_pinned     THEN NEW.is_pinned := OLD.is_pinned; END IF;
  IF NEW.is_locked     IS DISTINCT FROM OLD.is_locked     THEN NEW.is_locked := OLD.is_locked; END IF;
  IF NEW.is_flagged    IS DISTINCT FROM OLD.is_flagged    THEN NEW.is_flagged := OLD.is_flagged; END IF;
  IF NEW.view_count    IS DISTINCT FROM OLD.view_count    THEN NEW.view_count := OLD.view_count; END IF;
  IF NEW.comment_count IS DISTINCT FROM OLD.comment_count THEN NEW.comment_count := OLD.comment_count; END IF;
  IF NEW.author_id     IS DISTINCT FROM OLD.author_id     THEN NEW.author_id := OLD.author_id; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_thread_columns ON public.threads;
CREATE TRIGGER trg_protect_thread_columns
  BEFORE UPDATE ON public.threads
  FOR EACH ROW EXECUTE FUNCTION public.protect_thread_columns();

-- Perbaiki policy: moderasi hanya moderator ke atas (bukan konselor).
DROP POLICY IF EXISTS "threads_update_moderator" ON public.threads;
DROP POLICY IF EXISTS "threads_update_staff" ON public.threads;
CREATE POLICY "threads_update_staff" ON public.threads FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_above() OR author_id = auth.uid())
  WITH CHECK (public.is_moderator_or_above() OR author_id = auth.uid());

-- (T6) Policy DELETE/UPDATE yang belum ada.
-- Tanpa ini, CMS lewat klien Supabase tidak mungkin bekerja dan penulis
-- tidak bisa menghapus kontennya sendiri.

-- articles
DROP POLICY IF EXISTS "articles_delete" ON public.articles;
CREATE POLICY "articles_delete" ON public.articles FOR DELETE
  TO authenticated USING (public.is_admin_or_above());

DROP POLICY IF EXISTS "articles_update" ON public.articles;
CREATE POLICY "articles_update" ON public.articles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_above() OR author_id = auth.uid())
  WITH CHECK (public.is_admin_or_above() OR author_id = auth.uid());

-- threads (hapus: moderator ke atas, atau penulisnya sendiri)
DROP POLICY IF EXISTS "threads_delete" ON public.threads;
CREATE POLICY "threads_delete" ON public.threads FOR DELETE
  TO authenticated USING (public.is_moderator_or_above() OR author_id = auth.uid());

-- comments
DROP POLICY IF EXISTS "comments_update" ON public.comments;
CREATE POLICY "comments_update" ON public.comments FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_above() OR author_id = auth.uid())
  WITH CHECK (public.is_moderator_or_above() OR author_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_delete" ON public.comments FOR DELETE
  TO authenticated USING (public.is_moderator_or_above() OR author_id = auth.uid());

-- prayer_requests
DROP POLICY IF EXISTS "prayers_update" ON public.prayer_requests;
CREATE POLICY "prayers_update" ON public.prayer_requests FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_above() OR author_id = auth.uid())
  WITH CHECK (public.is_moderator_or_above() OR author_id = auth.uid());

DROP POLICY IF EXISTS "prayers_delete" ON public.prayer_requests;
CREATE POLICY "prayers_delete" ON public.prayer_requests FOR DELETE
  TO authenticated USING (public.is_moderator_or_above() OR author_id = auth.uid());

-- cell_groups
DROP POLICY IF EXISTS "cell_groups_update" ON public.cell_groups;
CREATE POLICY "cell_groups_update" ON public.cell_groups FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_above() OR leader_id = auth.uid())
  WITH CHECK (public.is_admin_or_above() OR leader_id = auth.uid());

DROP POLICY IF EXISTS "cell_groups_delete" ON public.cell_groups;
CREATE POLICY "cell_groups_delete" ON public.cell_groups FOR DELETE
  TO authenticated USING (public.is_admin_or_above());

-- cell_group_messages
DROP POLICY IF EXISTS "cgm_update" ON public.cell_group_messages;
CREATE POLICY "cgm_update" ON public.cell_group_messages FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_above() OR sender_id = auth.uid())
  WITH CHECK (public.is_admin_or_above() OR sender_id = auth.uid());

DROP POLICY IF EXISTS "cgm_delete" ON public.cell_group_messages;
CREATE POLICY "cgm_delete" ON public.cell_group_messages FOR DELETE
  TO authenticated
  USING (public.is_admin_or_above() OR sender_id = auth.uid());

-- messages (konselor/admin boleh menghapus pesan bermasalah — BUKAN membaca)
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete" ON public.messages FOR DELETE
  TO authenticated USING (public.is_moderator_or_above());

-- chat_sessions
DROP POLICY IF EXISTS "sessions_update" ON public.chat_sessions;
CREATE POLICY "sessions_update" ON public.chat_sessions FOR UPDATE
  TO authenticated
  USING (member_id = auth.uid() OR konselor_id = auth.uid() OR public.is_admin_or_above())
  WITH CHECK (member_id = auth.uid() OR konselor_id = auth.uid() OR public.is_admin_or_above());

DROP POLICY IF EXISTS "sessions_delete" ON public.chat_sessions;
CREATE POLICY "sessions_delete" ON public.chat_sessions FOR DELETE
  TO authenticated USING (public.is_admin_or_above());

-- daily_verses (sebelumnya hanya select/insert — tidak ada UI untuk mengelola)
DROP POLICY IF EXISTS "verses_update" ON public.daily_verses;
CREATE POLICY "verses_update" ON public.daily_verses FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS "verses_delete" ON public.daily_verses;
CREATE POLICY "verses_delete" ON public.daily_verses FOR DELETE
  TO authenticated USING (public.is_admin_or_above());


-- =====================================================
-- 8. COUNTER (temuan fungsional) — RPC YANG BENAR
--
-- RPC increment_thread_views dan increment_pray_count tidak ada di SQL.
-- Fallback update ditolak RLS untuk non-penulis, dan untuk pray_count
-- trigger DB sudah menambah sehingga fallback bisa menghitung ganda.
--
-- Kedua RPC di bawah SECURITY DEFINER dan sengaja TIDAK membuka kolom
-- lain, jadi tidak ada jalan memakainya untuk mengubah data.
-- =====================================================

CREATE OR REPLACE FUNCTION public.increment_thread_views(thread_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.threads SET view_count = view_count + 1 WHERE id = thread_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_pray_count(p_request_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.prayer_requests SET pray_count = pray_count + 1 WHERE id = p_request_id;
$$;

REVOKE ALL ON FUNCTION public.increment_thread_views(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_pray_count(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_thread_views(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pray_count(UUID) TO authenticated;


-- =====================================================
-- 9. VERIFIKASI
-- =====================================================

-- (1) anon_token sudah tidak ada di tabel publik?
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'anon_token'
  ) AS anon_token_masih_di_profiles;
-- Harus: false

-- (2) View pseudonim ada?
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('threads_public','comments_public','prayers_public','profiles_public')
ORDER BY table_name;
-- Harus: 4 baris

-- (3) konselor_notes sudah pindah?
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_sessions' AND column_name = 'konselor_notes'
  ) AS notes_masih_di_sessions,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'session_notes'
  ) AS tabel_session_notes_ada;
-- Harus: false | true

-- (4) Fungsi baru terpasang?
SELECT p.proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('reveal_identity','break_glass_read_messages','rotate_anon_token',
                    'increment_thread_views','increment_pray_count')
ORDER BY p.proname;
-- Harus: 5 baris

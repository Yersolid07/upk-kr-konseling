-- =====================================================
-- CHAT: last_message column + auto-maintenance
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- Idempotent: aman dijalankan berulang.
--
-- Konteks: kode membaca & menulis chat_sessions.last_message
-- (daftar percakapan, preview chat), tetapi kolom ini tidak ada
-- di schema.sql sehingga query daftar chat error / kosong.
-- =====================================================

-- 1. Tambah kolom last_message
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS last_message TEXT;

-- 2. Backfill dari pesan terakhir yang ada
UPDATE public.chat_sessions s
SET last_message = m.content
FROM (
  SELECT DISTINCT ON (session_id) session_id, content
  FROM public.messages
  ORDER BY session_id, created_at DESC
) m
WHERE m.session_id = s.id
  AND (s.last_message IS NULL OR s.last_message = '');

-- 3. Trigger: setiap pesan baru memperbarui preview + updated_at sesi.
CREATE OR REPLACE FUNCTION public.touch_session_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET last_message = NEW.content,
      updated_at   = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_session_last_message();

-- 4. Trigger: notifikasi ke penerima saat ada pesan baru.
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member   UUID;
  v_konselor UUID;
  v_recipient UUID;
BEGIN
  SELECT member_id, konselor_id INTO v_member, v_konselor
  FROM public.chat_sessions WHERE id = NEW.session_id;

  -- Recipient is the other party in the session.
  v_recipient := CASE WHEN NEW.sender_id = v_member THEN v_konselor ELSE v_member END;

  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_recipient,
      'new_message',
      '💬 Pesan Baru',
      LEFT(NEW.content, 80),
      '/chat/' || NEW.session_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify ON public.messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- =====================================================
-- PRAYER COMMENTS — komentar di Prayer Wall
-- =====================================================
-- Setiap doa bisa dikomentari anggota lain. Identitas anonim
-- tidak pernah bocor: server menyamarkan label via helper
-- get_display_name() sebelum data dikirim ke browser.

CREATE TABLE IF NOT EXISTS prayer_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id    UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  is_anonymous  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_comments_request
  ON prayer_comments(request_id, created_at);

-- Semua pengguna login boleh membaca komentar (label anonim disamarkan di
-- server, bukan di sini). Insert hanya untuk pengguna yang sah.
CREATE POLICY prayer_comments_select ON prayer_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY prayer_comments_insert ON prayer_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- =====================================================
-- Hitung komentar per doa (denormalisasi biar list murah)
-- =====================================================
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION update_prayer_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prayer_requests SET comment_count = comment_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prayer_requests SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.request_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_prayer_comment_change ON prayer_comments;
CREATE TRIGGER on_prayer_comment_change AFTER INSERT OR DELETE ON prayer_comments
  FOR EACH ROW EXECUTE FUNCTION update_prayer_comment_count();

-- =====================================================
-- UPK-Kr. FT. UNSRAT Konseling Platform
-- Supabase Schema — Complete
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'moderator', 'konselor', 'member');
CREATE TYPE session_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE notification_type AS ENUM (
  'new_message', 'new_comment', 'new_reaction', 'booking_confirmed',
  'booking_cancelled', 'prayer_support', 'sos_alert', 'system',
  'konselor_verified', 'new_thread', 'session_request'
);
CREATE TYPE content_type AS ENUM ('thread', 'comment', 'message', 'prayer');

-- =====================================================
-- PROFILES (extends auth.users)
-- =====================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  display_name  TEXT,                    -- nama yang ditampilkan (bisa berbeda)
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'member',
  bio           TEXT,
  angkatan      TEXT,                    -- contoh: "2018", "2020"
  jurusan       TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,   -- for konselor
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen     TIMESTAMPTZ,
  specialization TEXT[],               -- ['Iman & Rohani', 'Keluarga', 'Kecemasan']
  -- Privacy: anon token per user, rotate-able
  anon_token    TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  -- Metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create profile on new user
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- =====================================================
-- THREAD CATEGORIES
-- =====================================================

CREATE TABLE thread_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  name_en     TEXT,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT DEFAULT '💬',
  color       TEXT DEFAULT '#C4895A',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default categories
INSERT INTO thread_categories (name, name_en, slug, icon, color, sort_order) VALUES
  ('Iman & Rohani',   'Faith & Spirituality', 'iman',      '🙏', '#C9993A', 1),
  ('Kecemasan',       'Anxiety',              'kecemasan', '😰', '#C4895A', 2),
  ('Keluarga',        'Family',               'keluarga',  '👨‍👩‍👧', '#6B8C72', 3),
  ('Akademik',        'Academic',             'akademik',  '📚', '#7C5C3E', 4),
  ('Karir',           'Career',               'karir',     '💼', '#8A6090', 5),
  ('Hubungan',        'Relationships',        'hubungan',  '💔', '#A07850', 6),
  ('Motivasi',        'Motivation',           'motivasi',  '🌟', '#4A8C7C', 7),
  ('Umum',            'General',              'umum',      '💬', '#888888', 8);

-- =====================================================
-- THREADS (Forum Posts)
-- =====================================================

CREATE TABLE threads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES thread_categories(id) ON DELETE SET NULL,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  content       TEXT NOT NULL CHECK (char_length(content) >= 10),
  is_anonymous  BOOLEAN NOT NULL DEFAULT TRUE,
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked     BOOLEAN NOT NULL DEFAULT FALSE,   -- konselor/admin lock
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  view_count    INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_author    ON threads(author_id);
CREATE INDEX idx_threads_category  ON threads(category_id);
CREATE INDEX idx_threads_created   ON threads(created_at DESC);
CREATE INDEX idx_threads_pinned    ON threads(is_pinned DESC, created_at DESC);

CREATE TRIGGER threads_updated_at BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

CREATE TABLE comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id     UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES comments(id) ON DELETE CASCADE,  -- nested reply
  content       TEXT NOT NULL CHECK (char_length(content) >= 1),
  is_anonymous  BOOLEAN NOT NULL DEFAULT TRUE,
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_thread ON comments(thread_id, created_at);

-- Auto-increment thread comment_count
CREATE OR REPLACE FUNCTION update_thread_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE threads SET comment_count = comment_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE threads SET comment_count = comment_count - 1 WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_comment_change AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_thread_comment_count();

-- =====================================================
-- REACTIONS (Thread + Comment)
-- =====================================================

CREATE TABLE reactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id   UUID NOT NULL,              -- thread_id or comment_id
  reaction     TEXT NOT NULL DEFAULT '🙏', -- '🙏', '❤️', '👍'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id, reaction)
);

CREATE INDEX idx_reactions_content ON reactions(content_type, content_id);

-- =====================================================
-- CHAT SESSIONS (1-on-1 Konseling)
-- =====================================================

CREATE TABLE chat_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  konselor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status          session_status NOT NULL DEFAULT 'pending',
  topic           TEXT,                         -- brief topic from member
  is_anonymous    BOOLEAN NOT NULL DEFAULT TRUE,
  -- After session closes
  member_rating   SMALLINT CHECK (member_rating BETWEEN 1 AND 5),
  member_review   TEXT,
  konselor_notes  TEXT,                        -- private notes, not shown to member
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_member   ON chat_sessions(member_id, status);
CREATE INDEX idx_sessions_konselor ON chat_sessions(konselor_id, status);

CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- MESSAGES
-- =====================================================

CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  -- Flagging for SOS detection
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session  ON messages(session_id, created_at);
CREATE INDEX idx_messages_sender   ON messages(sender_id);

-- =====================================================
-- BOOKINGS (Scheduled Sessions)
-- =====================================================

CREATE TABLE konselor_availability (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  konselor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(konselor_id, date, start_time)
);

CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  konselor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_id         UUID REFERENCES konselor_availability(id) ON DELETE SET NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INT NOT NULL DEFAULT 60,
  topic           TEXT,
  status          booking_status NOT NULL DEFAULT 'pending',
  is_anonymous    BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,                    -- konselor's prep notes
  meeting_link    TEXT,                    -- zoom/meet link if needed
  session_id      UUID REFERENCES chat_sessions(id),  -- linked chat session
  cancelled_by    UUID REFERENCES profiles(id),
  cancel_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_member   ON bookings(member_id, status);
CREATE INDEX idx_bookings_konselor ON bookings(konselor_id, scheduled_at);

-- =====================================================
-- PRAYER WALL
-- =====================================================

CREATE TABLE prayer_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 500),
  category_id   UUID REFERENCES thread_categories(id) ON DELETE SET NULL,
  is_anonymous  BOOLEAN NOT NULL DEFAULT TRUE,
  is_answered   BOOLEAN NOT NULL DEFAULT FALSE,  -- author can mark as answered
  pray_count    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prayer_supports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(request_id, user_id)
);

-- Auto-update pray_count
CREATE OR REPLACE FUNCTION update_pray_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prayer_requests SET pray_count = pray_count + 1 WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prayer_requests SET pray_count = pray_count - 1 WHERE id = OLD.request_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_prayer_support_change AFTER INSERT OR DELETE ON prayer_supports
  FOR EACH ROW EXECUTE FUNCTION update_pray_count();

-- =====================================================
-- ARTICLES / RENUNGAN
-- =====================================================

CREATE TABLE articles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES thread_categories(id),
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  excerpt       TEXT,
  content       TEXT NOT NULL,             -- markdown content
  cover_url     TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  read_count    INT NOT NULL DEFAULT 0,
  tags          TEXT[],
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CELL GROUPS
-- =====================================================

CREATE TABLE cell_groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT DEFAULT '✝️',
  leader_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invite_code   TEXT UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cell_group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_leader   BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE cell_group_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES cell_groups(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,  -- less anonymous in small groups
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cg_messages_group ON cell_group_messages(group_id, created_at);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,                        -- deep link inside app
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  meta        JSONB,                       -- extra payload
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- =====================================================
-- CONTENT REPORTS (Flagging)
-- =====================================================

CREATE TABLE content_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id   UUID NOT NULL,
  reason       TEXT NOT NULL,
  detail       TEXT,
  status       report_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID REFERENCES profiles(id),
  reviewed_at  TIMESTAMPTZ,
  resolution   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DAILY VERSES (manual or API-synced)
-- =====================================================

CREATE TABLE daily_verses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verse_text  TEXT NOT NULL,
  verse_ref   TEXT NOT NULL,              -- "Yeremia 29:11"
  verse_text_en TEXT,
  verse_ref_en  TEXT,
  display_date DATE UNIQUE,              -- specific date assignment
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- IDENTITY REVEAL LOG (Audit Trail)
-- Only super_admin can call this, fully logged
-- =====================================================

CREATE TABLE identity_reveal_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by  UUID NOT NULL REFERENCES profiles(id),
  target_content_type content_type,
  target_content_id   UUID,
  revealed_user_id    UUID REFERENCES profiles(id),
  reason        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- HELPER FUNCTION: get_display_name
-- Returns anonymous display or real name based on is_anonymous flag
-- =====================================================

CREATE OR REPLACE FUNCTION get_display_name(
  p_user_id UUID,
  p_is_anonymous BOOLEAN
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_name TEXT;
  v_token TEXT;
BEGIN
  IF p_is_anonymous THEN
    SELECT anon_token INTO v_token FROM profiles WHERE id = p_user_id;
    RETURN 'Anonim#' || UPPER(LEFT(v_token, 4));
  ELSE
    SELECT COALESCE(display_name, full_name) INTO v_name FROM profiles WHERE id = p_user_id;
    RETURN v_name;
  END IF;
END;
$$;

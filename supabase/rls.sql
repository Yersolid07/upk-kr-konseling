-- =====================================================
-- Row Level Security (RLS) Policies
-- UPK-Kr. FT. UNSRAT Konseling Platform
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE konselor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_supports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_group_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_group_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_reveal_log   ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('super_admin', 'admin') FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_konselor_or_above()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('super_admin', 'admin', 'moderator', 'konselor')
  FROM profiles WHERE id = auth.uid();
$$;

-- =====================================================
-- PROFILES
-- =====================================================

-- Anyone logged in can read public profile info
-- BUT author_id is hidden if is_anonymous — handled at app layer
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (TRUE);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- cannot self-promote to admin roles
    AND role NOT IN ('super_admin', 'admin', 'moderator', 'konselor')
  );

-- Admins can update any profile (for role assignment, verification)
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin_or_above());

-- =====================================================
-- THREADS
-- =====================================================

-- Anyone logged in can read threads
CREATE POLICY "threads_select"
  ON threads FOR SELECT
  TO authenticated
  USING (TRUE);

-- Any member can create a thread
CREATE POLICY "threads_insert"
  ON threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Author can edit their own thread
CREATE POLICY "threads_update_own"
  ON threads FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    -- cannot self-pin
    AND is_pinned = (SELECT is_pinned FROM threads WHERE id = threads.id)
  );

-- Moderator/admin can pin, lock, flag threads
CREATE POLICY "threads_update_moderator"
  ON threads FOR UPDATE
  TO authenticated
  USING (is_konselor_or_above());

-- Author or admin can delete
CREATE POLICY "threads_delete"
  ON threads FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR is_admin_or_above());

-- =====================================================
-- COMMENTS
-- =====================================================

CREATE POLICY "comments_select"
  ON comments FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "comments_insert"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_update_own"
  ON comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "comments_delete"
  ON comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR is_admin_or_above());

-- =====================================================
-- REACTIONS
-- =====================================================

CREATE POLICY "reactions_select"
  ON reactions FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "reactions_insert"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete_own"
  ON reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- CHAT SESSIONS
-- =====================================================

-- Member sees their own sessions; konselor sees assigned sessions; admin sees all
CREATE POLICY "sessions_select"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR konselor_id = auth.uid()
    OR is_admin_or_above()
  );

-- Any member can start a session
CREATE POLICY "sessions_insert"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

-- Konselor can update their assigned sessions; admin can update all
CREATE POLICY "sessions_update"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (
    konselor_id = auth.uid()
    OR member_id = auth.uid()
    OR is_admin_or_above()
  );

-- =====================================================
-- MESSAGES
-- =====================================================

-- Only session participants can read messages
CREATE POLICY "messages_select"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions s
      WHERE s.id = messages.session_id
        AND (s.member_id = auth.uid() OR s.konselor_id = auth.uid())
    )
    OR is_admin_or_above()
  );

-- Session participants can send messages
CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_sessions s
      WHERE s.id = session_id
        AND s.status = 'active'
        AND (s.member_id = auth.uid() OR s.konselor_id = auth.uid())
    )
  );

-- =====================================================
-- BOOKINGS
-- =====================================================

CREATE POLICY "bookings_select"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR konselor_id = auth.uid()
    OR is_admin_or_above()
  );

CREATE POLICY "bookings_insert"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "bookings_update"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    member_id = auth.uid()
    OR konselor_id = auth.uid()
    OR is_admin_or_above()
  );

-- =====================================================
-- KONSELOR AVAILABILITY
-- =====================================================

-- Anyone can view availability (for booking)
CREATE POLICY "availability_select"
  ON konselor_availability FOR SELECT
  TO authenticated USING (TRUE);

-- Only konselor (or admin) can manage their slots
CREATE POLICY "availability_insert"
  ON konselor_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    konselor_id = auth.uid()
    AND current_user_role() IN ('konselor', 'admin', 'super_admin')
  );

CREATE POLICY "availability_update"
  ON konselor_availability FOR UPDATE
  TO authenticated
  USING (konselor_id = auth.uid() OR is_admin_or_above());

CREATE POLICY "availability_delete"
  ON konselor_availability FOR DELETE
  TO authenticated
  USING (konselor_id = auth.uid() OR is_admin_or_above());

-- =====================================================
-- PRAYER REQUESTS
-- =====================================================

CREATE POLICY "prayer_select" ON prayer_requests FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "prayer_insert" ON prayer_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE POLICY "prayer_update_own" ON prayer_requests FOR UPDATE
  TO authenticated USING (author_id = auth.uid() OR is_admin_or_above());

CREATE POLICY "prayer_delete" ON prayer_requests FOR DELETE
  TO authenticated USING (author_id = auth.uid() OR is_admin_or_above());

-- =====================================================
-- PRAYER SUPPORTS
-- =====================================================

CREATE POLICY "prayer_support_select" ON prayer_supports FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "prayer_support_insert" ON prayer_supports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prayer_support_delete" ON prayer_supports FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- ARTICLES
-- =====================================================

-- Public can read published articles
CREATE POLICY "articles_select" ON articles FOR SELECT
  TO authenticated
  USING (is_published = TRUE OR author_id = auth.uid() OR is_admin_or_above());

CREATE POLICY "articles_insert" ON articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id AND is_konselor_or_above());

CREATE POLICY "articles_update" ON articles FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() OR is_admin_or_above());

-- =====================================================
-- CELL GROUPS
-- =====================================================

CREATE POLICY "cell_groups_select" ON cell_groups FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "cell_groups_insert" ON cell_groups FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_above());

CREATE POLICY "cell_groups_update" ON cell_groups FOR UPDATE
  TO authenticated
  USING (leader_id = auth.uid() OR is_admin_or_above());

-- Cell group members
CREATE POLICY "cgm_select" ON cell_group_members FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "cgm_insert" ON cell_group_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cgm_delete" ON cell_group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR is_admin_or_above());

-- Cell group messages: only members of that group
CREATE POLICY "cgmsg_select" ON cell_group_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cell_group_members
      WHERE group_id = cell_group_messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "cgmsg_insert" ON cell_group_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM cell_group_members
      WHERE group_id = cell_group_messages.group_id AND user_id = auth.uid()
    )
  );

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE POLICY "notif_select" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notif_update" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (TRUE); -- service role inserts

-- =====================================================
-- CONTENT REPORTS
-- =====================================================

CREATE POLICY "reports_select" ON content_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR is_konselor_or_above());

CREATE POLICY "reports_insert" ON content_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_update" ON content_reports FOR UPDATE
  TO authenticated USING (is_admin_or_above());

-- =====================================================
-- IDENTITY REVEAL LOG
-- Super admin ONLY
-- =====================================================

CREATE POLICY "reveal_log_select" ON identity_reveal_log FOR SELECT
  TO authenticated
  USING (current_user_role() = 'super_admin');

CREATE POLICY "reveal_log_insert" ON identity_reveal_log FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND current_user_role() = 'super_admin'
  );

-- =====================================================
-- DAILY VERSES (public read)
-- =====================================================
ALTER TABLE daily_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verses_select" ON daily_verses FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "verses_insert" ON daily_verses FOR INSERT
  TO authenticated WITH CHECK (is_admin_or_above());

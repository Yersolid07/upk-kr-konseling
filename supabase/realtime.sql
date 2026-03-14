-- =====================================================
-- Realtime Setup — UPK-Kr. Konseling
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable realtime on tables that need live updates
-- (Supabase dashboard: Database > Replication > enable for these tables)

-- Via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE cell_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE prayer_supports;
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;  -- for online status

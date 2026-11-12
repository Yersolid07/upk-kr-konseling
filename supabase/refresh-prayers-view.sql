-- =====================================================
-- REFRESH prayers_public VIEW — ADD comment_count
-- Jalankan di Supabase SQL Editor (sekali saja)
-- =====================================================

CREATE OR REPLACE VIEW public.prayers_public
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.content,
  r.category_id,
  r.is_anonymous,
  r.is_answered,
  r.pray_count,
  r.comment_count,
  r.created_at,
  r.updated_at,
  CASE WHEN r.is_anonymous THEN NULL ELSE r.author_id END AS author_id,
  CASE WHEN r.is_anonymous THEN public.public_anon_label('prayer', r.id) END AS anon_label,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.full_name END AS author_name,
  CASE WHEN r.is_anonymous THEN NULL ELSE p.avatar_url END AS author_avatar
FROM public.prayer_requests r
LEFT JOIN public.profiles p ON p.id = r.author_id;
